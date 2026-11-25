import { Router } from 'express';
import pool from '../db.js';
import { bulanBerjalan, rentangBulan } from '../utils/bulan.js';
import { ringkasanBatasTotal, NAMA_KATEGORI_TOTAL } from '../utils/batasTotal.js';

const router = Router();

// GET /api/dashboard — ringkasan bulan berjalan dan alert batas total untuk user login.
router.get('/', async (req, res) => {
  const bulan = bulanBerjalan();
  const { awal, akhir } = rentangBulan(bulan);

  try {
    const [ringkasan, kategori, batas] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(nominal) FILTER (WHERE tipe = 'masuk'), 0) AS total_masuk,
                COALESCE(SUM(nominal) FILTER (WHERE tipe = 'keluar'), 0) AS total_keluar
         FROM transaksi
         WHERE user_id = $1 AND tanggal >= $2::date AND tanggal < $3::date`,
        [req.user_id, awal, akhir]
      ),
      // Pengeluaran per kategori hanya untuk pengelompokan (Harian/Urgent).
      pool.query(
        `SELECT k.id AS kategori_id, k.nama, k.grup, COALESCE(SUM(t.nominal), 0) AS total
         FROM kategori k
         LEFT JOIN transaksi t
           ON t.kategori_id = k.id
          AND t.user_id = $1
          AND t.tipe = 'keluar'
          AND t.tanggal >= $2::date AND t.tanggal < $3::date
         WHERE k.tipe = 'keluar' AND k.nama <> $4
         GROUP BY k.id, k.nama, k.grup
         ORDER BY k.id`,
        [req.user_id, awal, akhir, NAMA_KATEGORI_TOTAL]
      ),
      ringkasanBatasTotal(req.user_id, bulan),
    ]);

    const totalMasuk = Number(ringkasan.rows[0].total_masuk);
    const totalKeluar = Number(ringkasan.rows[0].total_keluar);
    const perKategori = kategori.rows.map((baris) => ({
      kategori_id: baris.kategori_id,
      nama: baris.nama,
      grup: baris.grup,
      total: Number(baris.total),
    }));

    // Satu alert untuk batas total; teks menampilkan jumlah kelebihannya.
    const alert = batas.terlampaui
      ? [`Melebihi batas Rp ${Math.abs(batas.sisa).toLocaleString('id-ID')}`]
      : [];

    res.json({
      bulan,
      total_masuk: totalMasuk,
      total_keluar: totalKeluar,
      saldo: totalMasuk - totalKeluar,
      batas_total: batas.batas,
      sisa_total: batas.sisa,
      per_kategori: perKategori,
      alert,
    });
  } catch (error) {
    console.error('Gagal mengambil dashboard:', error.message);
    res.status(500).json({ pesan: 'Gagal mengambil dashboard' });
  }
});

export default router;
