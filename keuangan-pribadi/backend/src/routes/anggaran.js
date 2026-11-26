import { Router } from 'express';
import { bulanBerjalan } from '../utils/bulan.js';
import { ringkasanBatasTotal, simpanBatasTotal } from '../utils/batasTotal.js';

const router = Router();
const POLA_BULAN = /^\d{4}-\d{2}$/;

// GET /api/anggaran/total — ringkasan batas total pengeluaran bulan ini.
router.get('/total', async (req, res) => {
  const bulan = req.query.bulan || bulanBerjalan();
  if (!POLA_BULAN.test(bulan)) {
    return res.status(400).json({ pesan: 'bulan harus berformat YYYY-MM' });
  }

  try {
    res.json(await ringkasanBatasTotal(req.user_id, bulan));
  } catch (error) {
    console.error('Gagal mengambil batas total:', error.message);
    res.status(500).json({ pesan: 'Gagal mengambil batas total' });
  }
});

// POST /api/anggaran/total — tentukan atau ubah batas total bulan ini.
router.post('/total', async (req, res) => {
  const { batas, bulan = bulanBerjalan() } = req.body || {};

  if (!POLA_BULAN.test(bulan)) {
    return res.status(400).json({ pesan: 'bulan harus berformat YYYY-MM' });
  }
  if (!Number.isFinite(Number(batas)) || Number(batas) <= 0) {
    return res.status(400).json({ pesan: 'batas harus lebih dari 0' });
  }

  try {
    const hasil = await simpanBatasTotal(req.user_id, bulan, Number(batas));
    res.json(hasil);
  } catch (error) {
    console.error('Gagal menyimpan batas total:', error.message);
    res.status(500).json({ pesan: 'Gagal menyimpan batas total' });
  }
});

export default router;
