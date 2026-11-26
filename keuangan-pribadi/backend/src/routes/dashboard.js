import { Router } from 'express';
import pool from '../db.js';
import { bulanBerjalan, rentangBulan } from '../utils/bulan.js';
import { NAMA_KATEGORI_TOTAL, ringkasanBatasTotal } from '../utils/batasTotal.js';

const router = Router();
const rupiah = (nilai) => `Rp ${Number(nilai).toLocaleString('id-ID')}`;

// GET /api/dashboard — ringkasan, total per grup, dan batas total bulan ini.
router.get('/', async (req, res) => {
  const bulan = bulanBerjalan();
  const { awal, akhir } = rentangBulan(bulan);

  try {
    const [ringkasan, kategori, batasTotal] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(nominal) FILTER (WHERE tipe = 'masuk'), 0) AS total_masuk,
                COALESCE(SUM(nominal) FILTER (WHERE tipe = 'keluar'), 0) AS total_keluar
         FROM transaksi
         WHERE user_id = $1 AND tanggal >= $2::date AND tanggal < $3::date`,
        [req.user_id, awal, akhir]
      ),
      // Total pengeluaran per kategori (kategori khusus batas total tidak dihitung).
      pool.query(
        `WITH pengeluaran AS (
           SELECT kategori_id, SUM(nominal) AS total
           FROM transaksi
           WHERE user_id = $1 AND tipe = 'keluar'
             AND tanggal >= $2::date AND tanggal < $3::date
           GROUP BY kategori_id
         )
         SELECT k.id AS kategori_id, k.nama, k.grup, COALESCE(p.total, 0) AS total
         FROM kategori k
         JOIN pengeluaran p ON p.kategori_id = k.id
         WHERE k.tipe = 'keluar' AND k.nama <> $4
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
      grup: baris.grup || 'Lainnya',
      total: Number(baris.total),
    }));

    // Total pengeluaran per grup Harian/Urgent; kategori tanpa grup masuk "Lainnya".
    const perGrup = { Harian: 0, Urgent: 0, Lainnya: 0 };
    perKategori.forEach((baris) => {
      perGrup[baris.grup] = (perGrup[baris.grup] || 0) + baris.total;
    });

    // Alert hanya berdasarkan batas total, bukan batas per kategori.
    const alert = [];
    if (batasTotal.batas !== null && batasTotal.terlampaui) {
      alert.push(
        `Total pengeluaran ${rupiah(totalKeluar)} melebihi batas ${rupiah(batasTotal.batas)}`
      );
    }

    res.json({
      bulan,
      total_masuk: totalMasuk,
      total_keluar: totalKeluar,
      saldo: totalMasuk - totalKeluar,
      batas_total: batasTotal,
      per_kategori: perKategori,
      per_grup: perGrup,
      alert,
    });
  } catch (error) {
    console.error('Gagal mengambil dashboard:', error.message);
    res.status(500).json({ pesan: 'Gagal mengambil dashboard' });
  }
});

export default router;
