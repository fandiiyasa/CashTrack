import { Router } from 'express';
import pool from '../db.js';
import { NAMA_KATEGORI_TOTAL } from '../utils/batasTotal.js';

const router = Router();

// GET /api/kategori — daftar kategori untuk pilihan form transaksi.
// Kategori khusus batas total disembunyikan dari daftar.
router.get('/', async (_req, res) => {
  try {
    const hasil = await pool.query(
      `SELECT id, nama, tipe, grup FROM kategori
       WHERE nama <> $1
       ORDER BY id`,
      [NAMA_KATEGORI_TOTAL]
    );
    res.json(hasil.rows);
  } catch (error) {
    console.error('Gagal mengambil kategori:', error.message);
    res.status(500).json({ pesan: 'Gagal mengambil kategori' });
  }
});

export default router;
