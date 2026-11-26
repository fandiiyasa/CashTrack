-- Inisialisasi skema keuangan pribadi.
-- Dijalankan otomatis oleh image postgres saat volume database masih kosong.

-- Daftar pengguna aplikasi; password disimpan sebagai hash bcrypt.
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Daftar kategori transaksi, dibedakan menjadi pemasukan dan pengeluaran.
-- grup hanya pengelompokan tampilan (Harian/Urgent), bukan batas anggaran.
CREATE TABLE kategori (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(50) NOT NULL,
  tipe VARCHAR(10) CHECK (tipe IN ('masuk','keluar')),
  grup VARCHAR(10) CHECK (grup IN ('Harian','Urgent'))
);

-- Catatan pemasukan/pengeluaran milik setiap pengguna.
CREATE TABLE transaksi (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  kategori_id INT REFERENCES kategori(id),
  tipe VARCHAR(10) NOT NULL,
  nominal NUMERIC(15,2) NOT NULL CHECK (nominal > 0),
  tanggal DATE NOT NULL,
  catatan TEXT
);

-- Batas total pengeluaran per bulan (format bulan: YYYY-MM).
CREATE TABLE anggaran (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  kategori_id INT REFERENCES kategori(id),
  bulan CHAR(7) NOT NULL,
  batas NUMERIC(15,2) NOT NULL CHECK (batas > 0),
  UNIQUE (user_id, kategori_id, bulan)
);

-- Kategori awal yang siap dipakai semua pengguna.
INSERT INTO kategori (nama, tipe, grup) VALUES
  ('Gaji', 'masuk', NULL), ('Uang Saku', 'masuk', NULL),
  ('Makan', 'keluar', 'Harian'), ('Transport', 'keluar', 'Harian'),
  ('Belanja', 'keluar', 'Urgent'), ('Hiburan', 'keluar', 'Urgent');

-- Kategori khusus untuk satu baris batas total per user per bulan.
-- Kategori ini tidak ditampilkan di form transaksi dan tidak boleh dipakai transaksi.
INSERT INTO kategori (nama, tipe, grup)
SELECT '__BATAS_TOTAL__', 'keluar', NULL
WHERE NOT EXISTS (SELECT 1 FROM kategori WHERE nama = '__BATAS_TOTAL__');
