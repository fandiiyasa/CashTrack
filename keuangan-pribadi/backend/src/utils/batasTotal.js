import pool from '../db.js';
import { rentangBulan } from './bulan.js';

// Kategori khusus untuk batas total; tidak boleh dipakai sebagai kategori transaksi.
export const NAMA_KATEGORI_TOTAL = '__BATAS_TOTAL__';
export const BATAS_DEFAULT = 1000000;

// Cari id kategori khusus. Bila database lama belum memilikinya, dibuat otomatis.
export async function idKategoriTotal() {
  const hasil = await pool.query('SELECT id FROM kategori WHERE nama = $1', [NAMA_KATEGORI_TOTAL]);
  if (hasil.rowCount > 0) return hasil.rows[0].id;

  const dibuat = await pool.query(
    'INSERT INTO kategori (nama, tipe) VALUES ($1, $2) RETURNING id',
    [NAMA_KATEGORI_TOTAL, 'keluar']
  );
  return dibuat.rows[0].id;
}

// Pastikan satu baris batas untuk kombinasi user–bulan; batas awal memakai default.
export async function pastikanBatasTotal(user_id, bulan) {
  const kategori_id = await idKategoriTotal();
  await pool.query(
    `INSERT INTO anggaran (user_id, kategori_id, bulan, batas)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, kategori_id, bulan) DO NOTHING`,
    [user_id, kategori_id, bulan, BATAS_DEFAULT]
  );
  return kategori_id;
}

// Ringkasan batas total: sisa negatif berarti pengeluaran sudah melebihi batas.
export async function ringkasanBatasTotal(user_id, bulan) {
  const kategori_id = await pastikanBatasTotal(user_id, bulan);
  const { awal, akhir } = rentangBulan(bulan);

  const [batas, pengeluaran] = await Promise.all([
    pool.query(
      'SELECT batas FROM anggaran WHERE user_id = $1 AND kategori_id = $2 AND bulan = $3',
      [user_id, kategori_id, bulan]
    ),
    pool.query(
      `SELECT COALESCE(SUM(nominal), 0) AS total
       FROM transaksi
       WHERE user_id = $1 AND tipe = 'keluar'
         AND tanggal >= $2::date AND tanggal < $3::date`,
      [user_id, awal, akhir]
    ),
  ]);

  const nilaiBatas = Number(batas.rows[0].batas);
  const totalPengeluaran = Number(pengeluaran.rows[0].total);
  const sisa = nilaiBatas - totalPengeluaran;

  return {
    bulan,
    batas: nilaiBatas,
    pengeluaran: totalPengeluaran,
    sisa,
    terlampaui: sisa < 0,
  };
}

// Simpan ulang selalu memperbarui baris bulan yang sama (bukan menambah baris baru).
export async function simpanBatasTotal(user_id, bulan, batas) {
  const kategori_id = await pastikanBatasTotal(user_id, bulan);
  await pool.query(
    `UPDATE anggaran SET batas = $4
     WHERE user_id = $1 AND kategori_id = $2 AND bulan = $3`,
    [user_id, kategori_id, bulan, batas]
  );
  return ringkasanBatasTotal(user_id, bulan);
}
