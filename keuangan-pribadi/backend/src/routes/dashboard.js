import { Router } from 'express';
import pool from '../db.js';
import { bulanBerjalan, rentangBulan } from '../utils/bulan.js';

const router = Router();

// GET /api/dashboard — ringkasan dan alert anggaran bulan ini untuk user login.
router.get('/', async (req, res) => {
  const bulan = bulanBerjalan();
  const { awal, akhir } = rentangBulan(bulan);

  try {
    const [ringkasan, kategori] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(nominal) FILTER (WHERE tipe = 'masuk'), 0) AS total_masuk,
                COALESCE(SUM(nominal) FILTER (WHERE tipe = 'keluar'), 0) AS total_keluar
         FROM transaksi
         WHERE user_id = $1 AND tanggal >= $2::date AND tanggal < $3::date`,
        [req.user_id, awal, akhir]
      ),
      // Total pengeluaran per kategori dibandingkan dengan batas anggaran.
      pool.query(
        `WITH pengeluaran AS (
           SELECT kategori_id, SUM(nominal) AS total
           FROM transaksi
           WHERE user_id = $1 AND tipe = 'keluar'
             AND tanggal >= $2::date AND tanggal < $3::date
           GROUP BY kategori_id
         )
         SELECT k.id AS kategori_id, k.nama,
                COALESCE(p.total, 0) AS total,
                a.batas,
                (a.batas IS NOT NULL AND COALESCE(p.total, 0) > a.batas) AS terlampaui
         FROM kategori k
         LEFT JOIN pengeluaran p ON p.kategori_id = k.id
         LEFT JOIN anggaran a
           ON a.kategori_id = k.id AND a.user_id = $1 AND a.bulan = $4
         WHERE k.tipe = 'keluar'
         ORDER BY k.id`,
        [req.user_id, awal, akhir, bulan]
      ),
    ]);

    const totalMasuk = Number(ringkasan.rows[0].total_masuk);
    const totalKeluar = Number(ringkasan.rows[0].total_keluar);
    const perKategori = kategori.rows.map((baris) => ({
      kategori_id: baris.kategori_id,
      nama: baris.nama,
      total: Number(baris.total),
      batas: baris.batas === null ? null : Number(baris.batas),
      terlampaui: baris.terlampaui,
    }));

    // Alert dibuat hanya untuk kategori yang melebihi batas.
    const alert = perKategori
      .filter((baris) => baris.terlampaui)
      .map((baris) => `${baris.nama}: ${baris.total} melebihi batas ${baris.batas}`);

    res.json({
      bulan,
      total_masuk: totalMasuk,
      total_keluar: totalKeluar,
      saldo: totalMasuk - totalKeluar,
      per_kategori: perKategori,
      alert,
    });
  } catch (error) {
    console.error('Gagal mengambil dashboard:', error.message);
    res.status(500).json({ pesan: 'Gagal mengambil dashboard' });
  }
});

export default router;
