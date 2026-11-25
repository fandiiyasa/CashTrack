import { Router } from 'express';
import pool from '../db.js';
import { bulanBerjalan } from '../utils/bulan.js';
import {
  ringkasanBatasTotal,
  simpanBatasTotal,
  idKategoriTotal,
  NAMA_KATEGORI_TOTAL,
} from '../utils/batasTotal.js';

const router = Router();

const bulanValid = (bulan) => /^\d{4}-\d{2}$/.test(bulan || '');

// GET /api/anggaran/total — batas total, pengeluaran, dan sisa untuk satu bulan.
router.get('/total', async (req, res) => {
  const bulan = req.query.bulan || bulanBerjalan();
  if (!bulanValid(bulan)) {
    return res.status(400).json({ pesan: 'bulan harus berformat YYYY-MM' });
  }

  try {
    res.json(await ringkasanBatasTotal(req.user_id, bulan));
  } catch (error) {
    console.error('Gagal mengambil batas total:', error.message);
    res.status(500).json({ pesan: 'Gagal mengambil batas total' });
  }
});

// POST /api/anggaran/total — buat/perbarui satu baris batas total bulan itu.
router.post('/total', async (req, res) => {
  const { batas } = req.body || {};
  const bulan = req.body?.bulan || bulanBerjalan();

  if (!bulanValid(bulan)) {
    return res.status(400).json({ pesan: 'bulan harus berformat YYYY-MM' });
  }
  if (Number(batas) <= 0) {
    return res.status(400).json({ pesan: 'batas harus lebih dari 0' });
  }

  try {
    res.json(await simpanBatasTotal(req.user_id, bulan, Number(batas)));
  } catch (error) {
    console.error('Gagal menyimpan batas total:', error.message);
    res.status(500).json({ pesan: 'Gagal menyimpan batas total' });
  }
});

// GET /api/anggaran — daftar batas lama; kategori khusus batas total disembunyikan.
router.get('/', async (req, res) => {
  try {
    const hasil = await pool.query(
      `SELECT a.id, a.kategori_id, k.nama AS kategori_nama, a.bulan, a.batas
       FROM anggaran a
       JOIN kategori k ON k.id = a.kategori_id
       WHERE a.user_id = $1 AND k.nama <> $2
       ORDER BY a.bulan DESC, k.id`,
      [req.user_id, NAMA_KATEGORI_TOTAL]
    );
    res.json(hasil.rows.map((baris) => ({ ...baris, batas: Number(baris.batas) })));
  } catch (error) {
    console.error('Gagal mengambil anggaran:', error.message);
    res.status(500).json({ pesan: 'Gagal mengambil anggaran' });
  }
});

// POST /api/anggaran — endpoint lama dipertahankan, tetapi tidak untuk batas total.
router.post('/', async (req, res) => {
  const { kategori_id, bulan, batas } = req.body || {};

  if (!kategori_id || !bulanValid(bulan)) {
    return res.status(400).json({ pesan: 'kategori_id dan bulan wajib diisi (YYYY-MM)' });
  }
  if (Number(kategori_id) === (await idKategoriTotal())) {
    return res.status(400).json({ pesan: 'Gunakan /api/anggaran/total untuk batas total' });
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
