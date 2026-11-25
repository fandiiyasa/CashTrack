# Sistem Pengelolaan Keuangan Pribadi Berbasis Web

Aplikasi web untuk mencatat pemasukan dan pengeluaran, memantau anggaran bulanan, serta mengunduh laporan dalam format PDF dan Excel. Proyek ini dibangun sebagai tugas akhir dengan pendekatan **satu langkah pengerjaan per sesi**; rincian pelaksanaannya ada di [`LAPORAN.md`](LAPORAN.md).

## Fitur

- Registrasi, login, dan logout dengan session cookie (`express-session` + `bcrypt`).
- CRUD transaksi: Tambah, Lihat, Ubah, Hapus.
- Dashboard bulan berjalan: total pemasukan, total pengeluaran, saldo, dan pengeluaran per kategori (grup Harian/Urgent).
- **Batas Total** pengeluaran per bulan (default Rp 1.000.000, bisa diedit): satu baris per user per bulan, disimpan dengan update baris yang sama. Alert muncul jika terlampaui dan hilang otomatis saat batas dinaikkan kembali.
- Unduh laporan PDF (`pdfkit`) dan Excel (`xlsx`/SheetJS) untuk bulan tertentu.
- Setiap pengguna hanya bisa mengakses datanya sendiri (`user_id` diambil dari session, bukan dari request).

## Teknologi

| Lapisan | Teknologi |
|---|---|
| Frontend | React 19, Vite 8, JavaScript (JSX), CSS |
| Backend | Node.js, Express 4, `express-session`, `bcrypt`, `pg` |
| Database | PostgreSQL 16 (skema di `db/init.sql`) |
| Laporan | `pdfkit`, SheetJS `xlsx` 0.20.3 |
| Infrastruktur | Docker Compose (3 service: db, backend, frontend) |

> Paket `xlsx` dipasang dari rilis resmi SheetJS (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`) karena versi lama di registry npm memiliki temuan keamanan. Hasil `npm audit`: **0 vulnerabilities**.

## Struktur direktori

```text
keuangan-pribadi/
├── docker-compose.yml            # orchestrasi db + backend + frontend
├── .env.example                  # contoh environment variable (tanpa nilai asli)
├── .gitignore                    # tidak menyimpan .env ke repositori
├── db/
│   └── init.sql                  # 4 tabel + 6 kategori + kategori khusus batas total
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js              # mount router, CORS, session, middleware auth
│       ├── config.js             # semua konfigurasi dari environment variable
│       ├── db.js                 # pg.Pool bersama
│       ├── middleware/auth.js    # proteksi endpoint + req.user_id
│       ├── routes/               # auth, health, transaksi, kategori, dashboard, anggaran, laporan
│       └── utils/                # bulan.js, batasTotal.js (logika batas total)
├── frontend/
│   ├── Dockerfile
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx               # state login + navigasi halaman
│       ├── index.css
│       ├── components/           # Header, AlertAnggaran, BatasTotal, UnduhLaporan
│       └── pages/                # Login, Beranda, Transaksi, Dashboard
├── LAPORAN.md                    # laporan pelaksanaan 8 langkah
└── docs/API.md                   # referensi endpoint lengkap
```

## Menjalankan dengan Docker Compose

```powershell
cd C:\CASH TRACK\keuangan-pribadi
copy .env.example .env
# Edit .env: ganti SESSION_SECRET dengan string acak panjang.
# Untuk pengembangan lokal biarkan COOKIE_SECURE=false.
docker compose up --build
```

Akses:

- Frontend: <http://localhost:5173>
- Backend: <http://localhost:5000> (semua endpoint `/api/*` kecuali register/login butuh session)
- Database: `localhost:5432`

`db/init.sql` dijalankan otomatis hanya sekali, saat volume `db-data` masih kosong. Jika skema sudah ada, perubahan `init.sql` tidak akan diterapkan ulang; hapus volume hanya jika data uji boleh dihapus.

## Menjalankan tanpa Docker

1. Siapkan PostgreSQL, buat database `keuangan_pribadi`, lalu jalankan isi `db/init.sql`.
2. Salin `.env.example` menjadi `.env`, isi kredensial DB dan `SESSION_SECRET`. Set `DB_HOST=localhost`.
3. Backend:

   ```powershell
   cd backend
   npm install
   npm start
   ```

4. Frontend (terminal terpisah):

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

`VITE_API_URL` di `.env` harus menunjuk ke alamat backend (`http://localhost:5000`), bukan ke alamat database. `vite.config.js` sudah memakai `host: 0.0.0.0` agar bisa dipakai dari dalam container.

## Environment variable

| Variabel | Contoh | Keterangan |
|---|---|---|
| `POSTGRES_USER` | `keuangan` | User database |
| `POSTGRES_PASSWORD` | `keuangan123` | Password database (rahasia) |
| `POSTGRES_DB` | `keuangan_pribadi` | Nama database |
| `DB_HOST` | `localhost` / `db` | `localhost` saat lokal, `db` saat di Compose |
| `DB_PORT` | `5432` | Port PostgreSQL |
| `PORT` | `5000` | Port backend Express |
| `SESSION_SECRET` | string acak panjang | Kunci tanda tangan cookie session (wajib) |
| `COOKIE_SECURE` | `false` | `true` hanya saat HTTPS |
| `CORS_ORIGIN` | `http://localhost:5173` | Asal yang diizinkan, dengan `credentials: true` |
| `FRONTEND_PORT` | `5173` | Port dev server Vite |
| `VITE_API_URL` | `http://localhost:5000` | Alamat API yang dipanggil frontend |

Semua nilai sensitif hanya dibaca dari environment variable; tidak ada password atau secret yang di-hardcode.

## Alur penggunaan

1. Siapkan akun lewat `POST /api/auth/register` (lihat [`docs/API.md`](docs/API.md)); antarmuka frontend saat ini menyediakan form **Login** saja.
2. Menu **Transaksi**: isi kategori, tipe (`masuk`/`keluar`), nominal, tanggal, catatan; tabel akan langsung diperbarui setelah Tambah/Edit/Hapus.
3. Menu **Dashboard/Beranda**: lihat ringkasan bulan ini dan **Batas Total Pengeluaran**. Klik **Edit Batas** untuk menyesuaikan (opsional); menyimpan meng-update baris bulan itu. Jika pengeluaran melebihi batas muncul alert `Melebihi batas Rp ...`; saat batas dinaikkan/dikembalikan sehingga aman, alert hilang.
4. Klik **Unduh PDF** atau **Unduh Excel** untuk menyimpan laporan bulan tersebut.
5. **Logout** mengakhiri session.

## Ringkasan endpoint

| Method | Path | Keterangan |
|---|---|---|
| POST | `/api/auth/register` | Daftar akun baru |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Data pengguna aktif |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/health` | Status koneksi database (butuh login) |
| GET, POST | `/api/transaksi` | Daftar / buat transaksi |
| GET, PUT, DELETE | `/api/transaksi/:id` | Detail / ubah / hapus transaksi |
| GET | `/api/kategori` | Daftar kategori |
| GET | `/api/dashboard` | Ringkasan + batas total + alert bulan berjalan |
| GET, POST | `/api/anggaran/total` | Ambil / simpan batas total bulan (update baris yang sama) |
| GET, POST | `/api/anggaran` | Endpoint lama batas per kategori (dipertahankan; kategori `__BATAS_TOTAL__` ditolak) |
| GET | `/api/laporan/pdf` | Unduh laporan PDF |
| GET | `/api/laporan/excel` | Unduh laporan Excel |

Detail request/response ada di [`docs/API.md`](docs/API.md).

## Verifikasi singkat

```powershell
# Sintaks backend
cd backend
Get-ChildItem -Recurse -Filter *.js src | ForEach-Object { node --check $_.FullName }

# Dependencies
npm audit

# Build frontend
cd ..\frontend
npm run build
```

Pada pengembangan ini Docker tidak tersedia di mesin uji, sehingga verifikasi database memakai PostgreSQL embedded sementara. Seluruh pengujian API dan browser berhasil; rincinya ada di [`LAPORAN.md`](LAPORAN.md).

## Catatan dan asumsi

- `express-session` memakai `MemoryStore`; cukup untuk pengembangan. Untuk produksi, gunakan store berbasis database/Redis.
- Batas total default **Rp 1.000.000** per user per bulan, disimpan sebagai satu baris di `anggaran` dengan kategori khusus `__BATAS_TOTAL__`. Simpan ulang = update baris bulan itu.
- Kategori `Harian`/`Urgent` hanya pengelompokan tampilan; tidak ada batas per kategori. Alert total: `Melebihi batas Rp ...`.
- Frontend belum memiliki halaman registrasi; akun dibuat melalui endpoint `/api/auth/register` (misalnya dengan `curl`).
- `db/init.sql` berlaku untuk database baru/volume kosong. Database lama perlu migrasi manual (kolom `grup`, kategori `__BATAS_TOTAL__`).
- Format tanggal transaksi `YYYY-MM-DD`, format bulan anggaran/laporan `YYYY-MM`.
- Folder scaffold Vite lama di root `C:\CASH TRACK` sengaja tidak diubah; proyek aktif ada di folder `keuangan-pribadi`.
- Semua query SQL memakai parameter (`$1`, `$2`, ...) dan semua data difilter oleh `user_id` dari session.
