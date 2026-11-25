import { Router } from 'express';
import PDFDocument from 'pdfkit';
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

const WARNA_HEADER = '#dbeafe';
const WARNA_HEADER_TEKS = '#1e3a8a';
const WARNA_GARIS = '#cbd5e1';
const WARNA_BARIS_GANJIL = '#f1f5f9';

// Gambar tabel transaksi dengan header berulang di setiap halaman.
function gambarTabelTransaksi(doc, transaksi) {
  const kiri = doc.page.margins.left;
  const lebarHalaman = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const padding = 5;

  const kolom = [
    { judul: 'No', lebar: 28, align: 'center' },
    { judul: 'Tanggal', lebar: 68, align: 'left' },
    { judul: 'Kategori', lebar: 92, align: 'left' },
    { judul: 'Tipe', lebar: 50, align: 'left' },
    { judul: 'Nominal', lebar: 90, align: 'right' },
    { judul: 'Catatan', lebar: 0, align: 'left' },
  ];
  const lebarTetap = kolom.reduce((total, k) => total + k.lebar, 0);
  kolom[kolom.length - 1].lebar = lebarHalaman - lebarTetap;

  const tinggiHeader = 22;
  const batasBawah = doc.page.height - doc.page.margins.bottom;

  function gambarHeader(y) {
    let x = kiri;
    doc.save();
    doc.rect(kiri, y, lebarHalaman, tinggiHeader).fill(WARNA_HEADER);
    doc.restore();

    doc.fillColor(WARNA_HEADER_TEKS).font('Helvetica-Bold').fontSize(9);
    kolom.forEach((k) => {
      doc.text(k.judul, x + padding, y + 6, {
        width: k.lebar - padding * 2,
        align: k.align,
        lineBreak: false,
      });
      x += k.lebar;
    });

    doc.strokeColor('#93c5fd').lineWidth(0.8);
    doc.rect(kiri, y, lebarHalaman, tinggiHeader).stroke();
    x = kiri;
    for (let i = 0; i < kolom.length - 1; i += 1) {
      x += kolom[i].lebar;
      doc.moveTo(x, y).lineTo(x, y + tinggiHeader).stroke();
    }

    return y + tinggiHeader;
  }

  let y = gambarHeader(doc.y);

  transaksi.forEach((item, index) => {
    const nilai = [
      String(index + 1),
      item.tanggal,
      item.kategori_nama || '-',
      item.tipe,
      rupiah(item.nominal),
      item.catatan || '-',
    ];

    doc.font('Helvetica').fontSize(9);
    const tinggiBaris = Math.max(
      18,
      ...nilai.map((teks, i) =>
        doc.heightOfString(teks, {
          width: kolom[i].lebar - padding * 2,
          align: kolom[i].align,
        }) + padding * 2
      )
    );

    // Pindah halaman jika baris tidak muat, lalu gambar ulang header.
    if (y + tinggiBaris > batasBawah) {
      doc.addPage();
      y = gambarHeader(doc.page.margins.top);
    }

    if (index % 2 === 1) {
      doc.save();
      doc.rect(kiri, y, lebarHalaman, tinggiBaris).fill(WARNA_BARIS_GANJIL);
      doc.restore();
    }

    let x = kiri;
    doc.fillColor('#111827').font('Helvetica').fontSize(9);
    nilai.forEach((teks, i) => {
      doc.text(teks, x + padding, y + padding, {
        width: kolom[i].lebar - padding * 2,
        align: kolom[i].align,
      });
      x += kolom[i].lebar;
    });

    doc.strokeColor(WARNA_GARIS).lineWidth(0.6);
    doc.rect(kiri, y, lebarHalaman, tinggiBaris).stroke();
    x = kiri;
    for (let i = 0; i < kolom.length - 1; i += 1) {
      x += kolom[i].lebar;
      doc.moveTo(x, y).lineTo(x, y + tinggiBaris).stroke();
    }

    y += tinggiBaris;
  });

  return y;
}

// GET /api/laporan/pdf — buat PDF bertabel dan alirkan langsung ke response.
router.get('/pdf', async (req, res) => {
  const bulan = bulanDariPermintaan(req, res);
  if (!bulan) return;

  try {
    const data = await ambilDataLaporan(req.user_id, bulan);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="laporan-transaksi-${bulan}.pdf"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // Judul dan ringkasan.
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#111827')
      .text('Laporan Transaksi Keuangan Pribadi', { align: 'center' });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(11).fillColor('#475569')
      .text(`Bulan: ${bulan}`, { align: 'center' });
    doc.moveDown(1);

    const saldo = data.total_masuk - data.total_keluar;
    const kartu = [
      { judul: 'Total Pemasukan', nilai: rupiah(data.total_masuk), warna: '#166534' },
      { judul: 'Total Pengeluaran', nilai: rupiah(data.total_keluar), warna: '#991b1b' },
      { judul: 'Saldo', nilai: rupiah(saldo), warna: '#1e3a8a' },
    ];
    const lebarKartu = (doc.page.width - doc.page.margins.left - doc.page.margins.right - 24) / 3;
    const tinggiKartu = 48;
    const yKartu = doc.y;
    let xKartu = doc.page.margins.left;

    kartu.forEach((k) => {
      doc.save();
      doc.roundedRect(xKartu, yKartu, lebarKartu, tinggiKartu, 6).fill('#f8fafc');
      doc.restore();
      doc.font('Helvetica').fontSize(8).fillColor('#64748b')
        .text(k.judul, xKartu + 10, yKartu + 8, { width: lebarKartu - 20 });
      doc.font('Helvetica-Bold').fontSize(12).fillColor(k.warna)
        .text(k.nilai, xKartu + 10, yKartu + 22, { width: lebarKartu - 20 });
      xKartu += lebarKartu + 12;
    });

    doc.y = yKartu + tinggiKartu + 24;
    doc.x = doc.page.margins.left;

    if (data.transaksi.length === 0) {
      doc.font('Helvetica').fontSize(11).fillColor('#475569')
        .text('Tidak ada transaksi pada bulan ini.');
    } else {
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827')
        .text('Rincian Transaksi');
      doc.moveDown(0.4);
      gambarTabelTransaksi(doc, data.transaksi);
    }

    doc.end();
  } catch (error) {
    console.error('Gagal membuat PDF:', error.message);
    if (!res.headersSent) res.status(500).json({ pesan: 'Gagal membuat laporan PDF' });
  }
});

export default router;
