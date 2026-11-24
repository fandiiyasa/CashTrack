import { Router } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db.js';
import { config } from '../config.js';
import { auth } from '../middleware/auth.js';

const router = Router();
const JUMLAH_RONDE_HASH = 10;

// Session lama diganti setelah login/register untuk mencegah session fixation.
function regenerasiSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

// POST /api/auth/register — membuat pengguna baru dengan password ter-hash.
router.post('/register', async (req, res) => {
  const { nama, email, password } = req.body || {};

  if (!nama || !email || !password) {
    return res.status(400).json({ pesan: 'nama, email, dan password wajib diisi' });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ pesan: 'Format email tidak valid' });
  }
  if (password.length < 6) {
    return res.status(400).json({ pesan: 'Password minimal 6 karakter' });
  }

  try {
    const cekEmail = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (cekEmail.rowCount > 0) {
      return res.status(409).json({ pesan: 'Email sudah terdaftar' });
    }

    const hash = await bcrypt.hash(password, JUMLAH_RONDE_HASH);
    const hasil = await pool.query(
      'INSERT INTO users (nama, email, password) VALUES ($1, $2, $3) RETURNING id, nama, email',
      [nama, email, hash]
    );

    await regenerasiSession(req);
    req.session.user_id = hasil.rows[0].id;
    res.status(201).json(hasil.rows[0]);
  } catch (error) {
    console.error('Gagal register:', error.message);
    res.status(500).json({ pesan: 'Gagal mendaftar' });
  }
});

// POST /api/auth/login — membandingkan password dengan hash bcrypt.
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ pesan: 'email dan password wajib diisi' });
  }

  try {
    const hasil = await pool.query(
      'SELECT id, nama, email, password FROM users WHERE email = $1',
      [email]
    );
    const pengguna = hasil.rows[0];

    // Pesan error sama untuk email salah maupun password salah.
    if (!pengguna || !(await bcrypt.compare(password, pengguna.password))) {
      return res.status(401).json({ pesan: 'Email atau password salah' });
    }

    await regenerasiSession(req);
    req.session.user_id = pengguna.id;
    res.json({ id: pengguna.id, nama: pengguna.nama, email: pengguna.email });
  } catch (error) {
    console.error('Gagal login:', error.message);
    res.status(500).json({ pesan: 'Gagal login' });
  }
});

// GET /api/auth/me — data pengguna aktif, difilter dari session user_id.
router.get('/me', auth, async (req, res) => {
  try {
    const hasil = await pool.query(
      'SELECT id, nama, email FROM users WHERE id = $1',
      [req.session.user_id]
    );
    if (hasil.rowCount === 0) {
      return res.status(404).json({ pesan: 'Pengguna tidak ditemukan' });
    }
    res.json(hasil.rows[0]);
  } catch (error) {
    console.error('Gagal mengambil pengguna:', error.message);
    res.status(500).json({ pesan: 'Gagal mengambil data pengguna' });
  }
});

// POST /api/auth/logout — hancurkan session dan hapus cookie di browser.
router.post('/logout', auth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Gagal logout:', err.message);
      return res.status(500).json({ pesan: 'Gagal logout' });
    }
    res.clearCookie('connect.sid', {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: 'lax',
    });
    res.json({ pesan: 'Logout berhasil' });
  });
});

export default router;
