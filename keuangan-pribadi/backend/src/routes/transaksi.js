import { Router } from 'express';
import pool from '../db.js';
import { idKategoriTotal } from '../utils/batasTotal.js';

const router = Router();

// Query detail dipakai GET satu dan daftar; selalu difilter oleh user_id dari session.
const PILIH_DETAIL = `SELECT t.id, t.kategori_id, k.nama AS kategori_nama,
  t.tipe, t.nominal, t.tanggal::text AS tanggal, t.catatan
  FROM transaksi t
  LEFT JOIN kategori k ON k.id = t.kategori_id
  WHERE t.id = $1 AND t.user_id = $2`;

// Validasi bersama untuk POST dan PUT.
async function validasiTransaksi(req, res) {
  const { kategori_id, tipe, nominal, tanggal } = req.body || {};

  if (!kategori_id || !tipe || !nominal || !tanggal) {
    res.status(400).json({ pesan: 'kategori_id, tipe, nominal, dan tanggal wajib diisi' });
    return false;
  }
  if (Number(kategori_id) === (await idKategoriTotal())) {
    res.status(400).json({ pesan: 'Kategori khusus batas total tidak boleh dipakai transaksi' });
    return false;
  }
  if (!['masuk', 'keluar'].includes(tipe)) {
    res.status(400).json({ pesan: "tipe harus 'masuk' atau 'keluar'" });
    return false;
  }
  if (Number(nominal) <= 0) {
    res.status(400).json({ pesan: 'nominal harus lebih dari 0' });
    return false;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    res.status(400).json({ pesan: 'tanggal harus berformat YYYY-MM-DD' });
    return false;
  }
  return true;
}

// GET /api/transaksi — semua transaksi milik pengguna yang login.
router.get('/', async (req, res) => {
  try {
    const hasil = await pool.query(
      `SELECT t.id, t.kategori_id, k.nama AS kategori_nama,
        t.tipe, t.nominal, t.tanggal::text AS tanggal, t.catatan
       FROM transaksi t
       LEFT JOIN kategori k ON k.id = t.kategori_id
       WHERE t.user_id = $1
       ORDER BY t.tanggal DESC, t.id DESC`,
      [req.user_id]
    );
    res.json(hasil.rows);
  } catch (error) {
    console.error('Gagal mengambil transaksi:', error.message);
    res.status(500).json({ pesan: 'Gagal mengambil transaksi' });
  }
});

// GET /api/transaksi/:id — satu transaksi, tetap dibatasi oleh user_id.
router.get('/:id', async (req, res) => {
  try {
    const hasil = await pool.query(PILIH_DETAIL, [req.params.id, req.user_id]);
    if (hasil.rowCount === 0) {
      return res.status(404).json({ pesan: 'Transaksi tidak ditemukan' });
    }
    res.json(hasil.rows[0]);
  } catch (error) {
    console.error('Gagal mengambil transaksi:', error.message);
    res.status(500).json({ pesan: 'Gagal mengambil transaksi' });
  }
});

// POST /api/transaksi — user_id diambil dari session, bukan dari body.
router.post('/', async (req, res) => {
  if (!(await validasiTransaksi(req, res))) return;
  const { kategori_id, tipe, nominal, tanggal, catatan } = req.body;

  try {
    const hasil = await pool.query(
      `INSERT INTO transaksi (user_id, kategori_id, tipe, nominal, tanggal, catatan)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, kategori_id, tipe, nominal, tanggal::text AS tanggal, catatan`,
      [req.user_id, kategori_id, tipe, Number(nominal), tanggal, catatan || null]
    );
    res.status(201).json(hasil.rows[0]);
  } catch (error) {
    console.error('Gagal membuat transaksi:', error.message);
    res.status(500).json({ pesan: 'Gagal membuat transaksi' });
  }
});

// PUT /api/transaksi/:id — hanya transaksi milik sendiri yang boleh diubah.
router.put('/:id', async (req, res) => {
  if (!(await validasiTransaksi(req, res))) return;
  const { kategori_id, tipe, nominal, tanggal, catatan } = req.body;

  try {
    const hasil = await pool.query(
      `UPDATE transaksi
       SET kategori_id = $1, tipe = $2, nominal = $3, tanggal = $4, catatan = $5
       WHERE id = $6 AND user_id = $7
       RETURNING id, kategori_id, tipe, nominal, tanggal::text AS tanggal, catatan`,
      [kategori_id, tipe, Number(nominal), tanggal, catatan || null, req.params.id, req.user_id]
    );
    if (hasil.rowCount === 0) {
      return res.status(404).json({ pesan: 'Transaksi tidak ditemukan' });
    }
    res.json(hasil.rows[0]);
  } catch (error) {
    console.error('Gagal mengubah transaksi:', error.message);
    res.status(500).json({ pesan: 'Gagal mengubah transaksi' });
  }
});

// DELETE /api/transaksi/:id — hanya transaksi milik sendiri yang boleh dihapus.
router.delete('/:id', async (req, res) => {
  try {
    const hasil = await pool.query(
      'DELETE FROM transaksi WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user_id]
    );
    if (hasil.rowCount === 0) {
      return res.status(404).json({ pesan: 'Transaksi tidak ditemukan' });
    }
    res.json({ pesan: 'Transaksi dihapus', id: hasil.rows[0].id });
  } catch (error) {
    console.error('Gagal menghapus transaksi:', error.message);
    res.status(500).json({ pesan: 'Gagal menghapus transaksi' });
  }
});

export default router;
