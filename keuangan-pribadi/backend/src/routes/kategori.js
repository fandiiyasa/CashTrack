import { Router } from 'express';
import pool from '../db.js';
import { KATEGORI_TOTAL } from '../utils/kategori.js';

const router = Router();
const GRUP_VALID = ['Harian', 'Urgent'];

// GET /api/kategori — daftar kategori untuk pilihan form transaksi.
// Kategori khusus batas total disembunyikan dari pengguna.
router.get('/', async (_req, res) => {
  try {
    const hasil = await pool.query(
      'SELECT id, nama, tipe FROM kategori WHERE nama <> $1 ORDER BY id',
      [KATEGORI_TOTAL]
    );
    res.json(hasil.rows);
  } catch (error) {
    console.error('Gagal mengambil kategori:', error.message);
    res.status(500).json({ pesan: 'Gagal mengambil kategori' });
  }
});

// POST /api/kategori — kelompokkan kategori pengeluaran ke Harian/Urgent.
// Kategori disimpan sebagai baris "Harian - Makan" tanpa batas per kategori.
router.post('/', async (req, res) => {
  const { grup, subkategori } = req.body || {};
  const namaSub = String(subkategori || '').trim();

  if (!GRUP_VALID.includes(grup)) {
    return res.status(400).json({ pesan: "grup harus 'Harian' atau 'Urgent'" });
  }
  if (!namaSub) {
    return res.status(400).json({ pesan: 'subkategori wajib diisi' });
  }

  const nama = `${grup} - ${namaSub}`;
  if (nama.length > 50) {
    return res.status(400).json({ pesan: 'nama kategori terlalu panjang (maks 50 karakter)' });
  }

  try {
    const cari = await pool.query(
      'SELECT id, nama, tipe FROM kategori WHERE nama = $1 AND tipe = $2 LIMIT 1',
      [nama, 'keluar']
    );
    if (cari.rowCount > 0) {
      return res.json({ ...cari.rows[0], grup });
    }

    const buat = await pool.query(
      'INSERT INTO kategori (nama, tipe) VALUES ($1, $2) RETURNING id, nama, tipe',
      [nama, 'keluar']
    );
    res.status(201).json({ ...buat.rows[0], grup });
  } catch (error) {
    console.error('Gagal menyimpan kategori:', error.message);
    res.status(500).json({ pesan: 'Gagal menyimpan kategori' });
  }
});

export default router;
