import { Router } from 'express';
import pool from '../db.js';
import { bulanBerjalan, rentangBulan } from '../utils/bulan.js';
import {
  KATEGORI_TOTAL,
  grupDariNama,
  namaTanpaGrup,
} from '../utils/kategori.js';

const router = Router();
const rupiah = (nilai) => `Rp ${Number(nilai).toLocaleString('id-ID')}`;

// GET /api/dashboard — ringkasan dan alert batas total bulan ini.
router.get('/', async (req, res) => {
  const bulan = bulanBerjalan();
  const { awal, akhir } = rentangBulan(bulan);

  try {
    const [ringkasan, batasTotal, kategori] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(nominal) FILTER (WHERE tipe = 'masuk'), 0) AS total_masuk,
                COALESCE(SUM(nominal) FILTER (WHERE tipe = 'keluar'), 0) AS total_keluar
         FROM transaksi
         WHERE user_id = $1 AND tanggal >= $2::date AND tanggal < $3::date`,
        [req.user_id, awal, akhir]
      ),
      // Satu batas total untuk semua pengeluaran bulan ini.
      pool.query(
        `SELECT a.batas
         FROM anggaran a
         JOIN kategori k ON k.id = a.kategori_id
         WHERE a.user_id = $1 AND a.bulan = $2 AND k.nama = $3
         LIMIT 1`,
        [req.user_id, bulan, KATEGORI_TOTAL]
      ),
      // Total pengeluaran per kategori (hanya yang punya transaksi bulan ini).
      pool.query(
        `SELECT k.id AS kategori_id, k.nama, COALESCE(SUM(t.nominal), 0) AS total
         FROM kategori k
         JOIN transaksi t ON t.kategori_id = k.id
         WHERE t.user_id = $1 AND t.tipe = 'keluar'
           AND t.tanggal >= $2::date AND t.tanggal < $3::date
           AND k.tipe = 'keluar' AND k.nama <> $4
         GROUP BY k.id, k.nama
         ORDER BY k.id`,
        [req.user_id, awal, akhir, KATEGORI_TOTAL]
      ),
    ]);

    const totalMasuk = Number(ringkasan.rows[0].total_masuk);
    const totalKeluar = Number(ringkasan.rows[0].total_keluar);
    const batas = batasTotal.rowCount > 0 ? Number(batasTotal.rows[0].batas) : null;

    const perKategori = kategori.rows.map((baris) => ({
      kategori_id: baris.kategori_id,
      nama: namaTanpaGrup(baris.nama),
      grup: grupDariNama(baris.nama),
      total: Number(baris.total),
    }));

    // Total pengeluaran per grup Harian/Urgent/Lainnya.
    const totalGrup = new Map();
    perKategori.forEach((item) => {
      totalGrup.set(item.grup, (totalGrup.get(item.grup) || 0) + item.total);
    });
    const perGrup = ['Harian', 'Urgent', 'Lainnya']
      .filter((grup) => totalGrup.has(grup))
      .map((grup) => ({ grup, total: totalGrup.get(grup) }));

    const terlampaui = batas !== null && totalKeluar > batas;
    const sisaBatas = batas === null ? null : batas - totalKeluar;

    // Alert hanya untuk total pengeluaran yang melebihi batas total.
    const alert = terlampaui
      ? [
          `Total pengeluaran ${rupiah(totalKeluar)} melebihi batas ${rupiah(batas)} ` +
            `(lebih ${rupiah(totalKeluar - batas)}).`,
        ]
      : [];

    res.json({
      bulan,
      total_masuk: totalMasuk,
      total_keluar: totalKeluar,
      saldo: totalMasuk - totalKeluar,
      batas_total: batas,
      sisa_batas: sisaBatas,
      terlampaui,
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
