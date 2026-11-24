import { Router } from 'express';
import { cekKoneksi } from '../db.js';

const router = Router();

// Endpoint infrastruktur: hanya mengecek koneksi, tidak mengakses data pengguna.
router.get('/', async (_req, res) => {
  try {
    await cekKoneksi();
    res.json({ status: 'ok', database: 'terhubung' });
  } catch (error) {
    console.error('Koneksi database gagal:', error.message);
    res.status(503).json({ status: 'error', database: 'tidak terhubung' });
  }
});

export default router;
