import { Router } from 'express';
import PDFDocument from 'pdfkit';
import XLSX from 'xlsx';
import pool from '../db.js';
import { bulanBerjalan, rentangBulan } from '../utils/bulan.js';

const router = Router();
const rupiah = (nilai) => `Rp ${Number(nilai).toLocaleString('id-ID')}`;

// Ambil transaksi dan ringkasan milik user untuk bulan yang diminta.
async function ambilDataLaporan(user_id, bulan) {
  const { awal, akhir } = rentangBulan(bulan);

  const [transaksi, ringkasan] = await Promise.all([
    pool.query(
      `SELECT t.tanggal::text AS tanggal, k.nama AS kategori_nama,
        t.tipe, t.nominal, t.catatan
       FROM transaksi t
       LEFT JOIN kategori k ON k.id = t.kategori_id
       WHERE t.user_id = $1 AND t.tanggal >= $2::date AND t.tanggal < $3::date
       ORDER BY t.tanggal DESC, t.id DESC`,
      [user_id, awal, akhir]
    ),
    pool.query(
      `SELECT COALESCE(SUM(nominal) FILTER (WHERE tipe = 'masuk'), 0) AS total_masuk,
              COALESCE(SUM(nominal) FILTER (WHERE tipe = 'keluar'), 0) AS total_keluar
       FROM transaksi
       WHERE user_id = $1 AND tanggal >= $2::date AND tanggal < $3::date`,
      [user_id, awal, akhir]
    ),
  ]);

  return {
    transaksi: transaksi.rows,
    total_masuk: Number(ringkasan.rows[0].total_masuk),
    total_keluar: Number(ringkasan.rows[0].total_keluar),
  };
}

function bulanDariPermintaan(req, res) {
  const bulan = req.query.bulan || bulanBerjalan();
  if (!/^\d{4}-\d{2}$/.test(bulan)) {
    res.status(400).json({ pesan: 'bulan harus berformat YYYY-MM' });
    return null;
  }
  return bulan;
}

// GET /api/laporan/pdf — buat PDF dan alirkan langsung ke response.
router.get('/pdf', async (req, res) => {
  const bulan = bulanDariPermintaan(req, res);
  if (!bulan) return;

  try {
    const data = await ambilDataLaporan(req.user_id, bulan);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="laporan-transaksi-${bulan}.pdf"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc.fontSize(18).text('Laporan Transaksi Keuangan Pribadi');
    doc.fontSize(11).text(`Bulan: ${bulan}`);
    doc.text(`Total Pemasukan: ${rupiah(data.total_masuk)}`);
    doc.text(`Total Pengeluaran: ${rupiah(data.total_keluar)}`);
    doc.text(`Saldo: ${rupiah(data.total_masuk - data.total_keluar)}`);
    doc.moveDown();

    if (data.transaksi.length === 0) {
      doc.text('Tidak ada transaksi pada bulan ini.');
    } else {
      data.transaksi.forEach((item, index) => {
        doc.fontSize(11).text(
          `${index + 1}. ${item.tanggal} | ${item.kategori_nama} | ${item.tipe} | ${rupiah(item.nominal)}`
        );
        if (item.catatan) doc.fontSize(9).text(`   Catatan: ${item.catatan}`);
        doc.moveDown(0.3);
      });
    }
    doc.end();
  } catch (error) {
    console.error('Gagal membuat PDF:', error.message);
    if (!res.headersSent) res.status(500).json({ pesan: 'Gagal membuat laporan PDF' });
  }
});

// GET /api/laporan/excel — buat workbook XLSX sebagai buffer.
router.get('/excel', async (req, res) => {
  const bulan = bulanDariPermintaan(req, res);
  if (!bulan) return;

  try {
    const data = await ambilDataLaporan(req.user_id, bulan);

    const buku = XLSX.utils.book_new();
    const ringkasan = XLSX.utils.aoa_to_sheet([
      ['Laporan Keuangan Pribadi'],
      ['Bulan', bulan],
      ['Total Pemasukan', data.total_masuk],
      ['Total Pengeluaran', data.total_keluar],
      ['Saldo', data.total_masuk - data.total_keluar],
    ]);
    XLSX.utils.book_append_sheet(buku, ringkasan, 'Ringkasan');

    const baris = data.transaksi.map((item) => ({
      Tanggal: item.tanggal,
      Kategori: item.kategori_nama,
      Tipe: item.tipe,
      Nominal: Number(item.nominal),
      Catatan: item.catatan || '',
    }));
    const lembar = XLSX.utils.json_to_sheet(
      baris.length > 0
        ? baris
        : [{ Tanggal: '-', Kategori: '-', Tipe: '-', Nominal: 0, Catatan: 'Tidak ada transaksi' }]
    );
    XLSX.utils.book_append_sheet(buku, lembar, 'Transaksi');

    const buffer = XLSX.write(buku, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="laporan-transaksi-${bulan}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    console.error('Gagal membuat Excel:', error.message);
    if (!res.headersSent) res.status(500).json({ pesan: 'Gagal membuat laporan Excel' });
  }
});

export default router;
