import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Muat .env dari root proyek saat dijalankan lokal (di container env sudah tersedia).
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

// Semua nilai sensitif berasal dari environment variable, bukan hardcode.
export const config = {
  port: Number(process.env.PORT || 5000),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  sessionSecret: process.env.SESSION_SECRET,
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  },
};
