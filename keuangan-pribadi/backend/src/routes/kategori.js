import { Router } from 'express';
import pool from '../db.js';
import { NAMA_KATEGORI_TOTAL } from '../utils/batasTotal.js';

const router = Router();
const GRUP_VALID = ['Harian', 'Urgent'];

// GET /api/kategori — daftar kategori untuk form transaksi dan pengelompokan.
// Kategori khusus batas total disembunyikan.
router.get('/', async (_req, res) => {
  try {
    const hasil = await pool.query(
      `SELECT id, nama, tipe, grup
       FROM kategori
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

// POST /api/kategori — masukkan kategori ke grup Harian/Urgent.
// Menerima { kategori_id, grup } untuk kategori lama, atau { nama, grup } untuk baru.
router.post('/', async (req, res) => {
  const { kategori_id, nama, grup } = req.body || {};

  if (!GRUP_VALID.includes(grup)) {
    return res.status(400).json({ pesan: "grup harus 'Harian' atau 'Urgent'" });
  }

  try {
    if (kategori_id) {
      const hasil = await pool.query(
        `UPDATE kategori
         SET grup = $1
         WHERE id = $2 AND tipe = 'keluar' AND nama <> $3
         RETURNING id, nama, tipe, grup`,
        [grup, Number(kategori_id), NAMA_KATEGORI_TOTAL]
      );
      if (hasil.rowCount === 0) {
        return res.status(404).json({ pesan: 'Kategori tidak ditemukan' });
      }
      return res.json(hasil.rows[0]);
    }

    const bersih = String(nama || '').trim();
    if (!bersih || bersih === NAMA_KATEGORI_TOTAL) {
      return res.status(400).json({ pesan: 'nama kategori tidak valid' });
    }

    // Nama kategori bersifat global; jika sudah ada, cukup ubah grupnya.
    const cari = await pool.query(
      `SELECT id FROM kategori
       WHERE LOWER(nama) = LOWER($1) AND tipe = 'keluar' AND nama <> $2`,
      [bersih, NAMA_KATEGORI_TOTAL]
    );

    if (cari.rowCount > 0) {
      const hasil = await pool.query(
        'UPDATE kategori SET grup = $1 WHERE id = $2 RETURNING id, nama, tipe, grup',
        [grup, cari.rows[0].id]
      );
      return res.json(hasil.rows[0]);
    }

    const buat = await pool.query(
      `INSERT INTO kategori (nama, tipe, grup)
       VALUES ($1, 'keluar', $2)
       RETURNING id, nama, tipe, grup`,
      [bersih, grup]
    );
    res.status(201).json(buat.rows[0]);
  } catch (error) {
    console.error('Gagal menyimpan kategori:', error.message);
    res.status(500).json({ pesan: 'Gagal menyimpan kategori' });
  }
});

export default router;
