import { Router } from 'express';
import pool from '../db.js';
import { KATEGORI_TOTAL } from '../utils/kategori.js';
import { bulanBerjalan } from '../utils/bulan.js';

const router = Router();

// Cari kategori khusus batas total, buat jika belum ada.
// Kategori ini tidak muncul di form transaksi.
async function idKategoriTotal() {
  const cari = await pool.query(
    'SELECT id FROM kategori WHERE nama = $1 AND tipe = $2 LIMIT 1',
    [KATEGORI_TOTAL, 'keluar']
  );
  if (cari.rowCount > 0) return cari.rows[0].id;

  const buat = await pool.query(
    'INSERT INTO kategori (nama, tipe) VALUES ($1, $2) RETURNING id',
    [KATEGORI_TOTAL, 'keluar']
  );
  return buat.rows[0].id;
}

// GET /api/anggaran/total?bulan=YYYY-MM — batas total pengeluaran satu bulan.
router.get('/total', async (req, res) => {
  const bulan = req.query.bulan || bulanBerjalan();
  if (!/^\d{4}-\d{2}$/.test(bulan)) {
    return res.status(400).json({ pesan: 'bulan harus berformat YYYY-MM' });
  }

  try {
    const hasil = await pool.query(
      `SELECT a.id, a.bulan, a.batas
       FROM anggaran a
       JOIN kategori k ON k.id = a.kategori_id
       WHERE a.user_id = $1 AND a.bulan = $2 AND k.nama = $3
       LIMIT 1`,
      [req.user_id, bulan, KATEGORI_TOTAL]
    );

    const baris = hasil.rows[0];
    res.json({ bulan, batas: baris ? Number(baris.batas) : null });
  } catch (error) {
    console.error('Gagal mengambil batas total:', error.message);
    res.status(500).json({ pesan: 'Gagal mengambil batas total' });
  }
});

// POST /api/anggaran/total — simpan atau perbarui batas total (UPSERT).
// Satu baris per pengguna per bulan; batas bisa diedit kapan saja.
router.post('/total', async (req, res) => {
  const { bulan, batas } = req.body || {};

  if (!/^\d{4}-\d{2}$/.test(bulan || '')) {
    return res.status(400).json({ pesan: 'bulan wajib diisi (YYYY-MM)' });
  }
  if (!(Number(batas) > 0)) {
    return res.status(400).json({ pesan: 'batas harus lebih dari 0' });
  }

  try {
    const kategoriId = await idKategoriTotal();
    const hasil = await pool.query(
      `INSERT INTO anggaran (user_id, kategori_id, bulan, batas)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, kategori_id, bulan)
       DO UPDATE SET batas = EXCLUDED.batas
       RETURNING id, kategori_id, bulan, batas`,
      [req.user_id, kategoriId, bulan, Number(batas)]
    );

    res.status(201).json({
      ...hasil.rows[0],
      batas: Number(hasil.rows[0].batas),
    });
  } catch (error) {
    console.error('Gagal menyimpan batas total:', error.message);
    res.status(500).json({ pesan: 'Gagal menyimpan batas total' });
  }
});

export default router;
