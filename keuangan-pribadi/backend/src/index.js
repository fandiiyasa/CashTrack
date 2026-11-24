import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { config } from './config.js';
import { auth } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import healthRouter from './routes/health.js';
import transaksiRouter from './routes/transaksi.js';
import kategoriRouter from './routes/kategori.js';
import dashboardRouter from './routes/dashboard.js';
import anggaranRouter from './routes/anggaran.js';
import laporanRouter from './routes/laporan.js';

if (!config.sessionSecret) {
  console.error('SESSION_SECRET wajib diisi di file .env');
  process.exit(1);
}

const app = express();

// Cookie session (langkah berikutnya) butuh CORS dengan credentials.
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Session berbasis cookie: httpOnly agar tidak bisa dibaca JavaScript.
// Catatan: MemoryStore cukup untuk pengembangan; produksi sebaiknya pakai store database.
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 2,
    },
  })
);

// Register dan login adalah endpoint publik; endpoint lain memakai middleware auth.
app.use('/api/auth', authRouter);
app.use('/api/health', auth, healthRouter);
app.use('/api/transaksi', auth, transaksiRouter);
app.use('/api/kategori', auth, kategoriRouter);
app.use('/api/dashboard', auth, dashboardRouter);
app.use('/api/anggaran', auth, anggaranRouter);
app.use('/api/laporan', auth, laporanRouter);
app.use((_req, res) => {
  res.status(404).json({ pesan: 'Endpoint tidak ditemukan' });
});

app.listen(config.port, () => {
  console.log(`Backend siap di http://localhost:${config.port}`);
});
