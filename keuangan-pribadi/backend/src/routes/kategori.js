import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/kategori — daftar kategori untuk pilihan form transaksi.
router.get('/', async (_req, res) => {
  try {
    const hasil = await pool.query('SELECT id, nama, tipe FROM kategori ORDER BY id');
    res.json(hasil.rows);
  } catch (error) {
    console.error('Gagal mengambil kategori:', error.message);
    res.status(500).json({ pesan: 'Gagal mengambil kategori' });
  }
});

export default router;
