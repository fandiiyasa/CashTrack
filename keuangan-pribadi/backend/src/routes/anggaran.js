import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/anggaran — semua batas anggaran milik pengguna yang login.
router.get('/', async (req, res) => {
  try {
    const hasil = await pool.query(
      `SELECT a.id, a.kategori_id, k.nama AS kategori_nama, a.bulan, a.batas
       FROM anggaran a
       JOIN kategori k ON k.id = a.kategori_id
       WHERE a.user_id = $1
       ORDER BY a.bulan DESC, k.id`,
      [req.user_id]
    );
    res.json(hasil.rows.map((baris) => ({ ...baris, batas: Number(baris.batas) })));
  } catch (error) {
    console.error('Gagal mengambil anggaran:', error.message);
    res.status(500).json({ pesan: 'Gagal mengambil anggaran' });
  }
});

// POST /api/anggaran — buat atau perbarui batas (UPSERT) untuk satu bulan.
router.post('/', async (req, res) => {
  const { kategori_id, bulan, batas } = req.body || {};

  if (!kategori_id || !/^\d{4}-\d{2}$/.test(bulan || '')) {
    return res.status(400).json({ pesan: 'kategori_id dan bulan wajib diisi (YYYY-MM)' });
  }
  if (Number(batas) <= 0) {
    return res.status(400).json({ pesan: 'batas harus lebih dari 0' });
  }

  try {
    const hasil = await pool.query(
      `INSERT INTO anggaran (user_id, kategori_id, bulan, batas)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, kategori_id, bulan)
       DO UPDATE SET batas = EXCLUDED.batas
       RETURNING id, kategori_id, bulan, batas`,
      [req.user_id, kategori_id, bulan, Number(batas)]
    );
    res.status(201).json({ ...hasil.rows[0], batas: Number(hasil.rows[0].batas) });
  } catch (error) {
    console.error('Gagal menyimpan anggaran:', error.message);
    res.status(500).json({ pesan: 'Gagal menyimpan anggaran' });
  }
});

export default router;
