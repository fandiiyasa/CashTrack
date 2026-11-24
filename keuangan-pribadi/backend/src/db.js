import pg from 'pg';
import { config } from './config.js';

// Satu pool koneksi dipakai bersama seluruh rute API.
const pool = new pg.Pool(config.db);

// Pemeriksaan koneksi untuk health check (tanpa input pengguna).
export async function cekKoneksi() {
  const hasil = await pool.query('SELECT 1 AS ok');
  return hasil.rows[0].ok === 1;
}

export default pool;
