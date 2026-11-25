# Referensi REST API

## Informasi umum

- **Base URL:** `http://localhost:5000` (atau nilai `VITE_API_URL`).
- **Format body:** `application/json`.
- **Autentikasi:** semua endpoint kecuali `POST /api/auth/register` dan `POST /api/auth/login` memerlukan cookie session `connect.sid`.
- **Frontend:** setiap `fetch` harus menyertakan `credentials: 'include'`; backend mengizinkan origin `CORS_ORIGIN` dengan `credentials: true`.
- **Error:** berupa JSON `{ "pesan": "..." }`.
- **Penulisan data:** `user_id` selalu berasal dari session, bukan dari body/query. Seluruh query memakai parameter `$1`, `$2`, ...
- **Format tanggal:** transaksi `YYYY-MM-DD`; anggaran dan laporan `YYYY-MM`.

### Ringkasan endpoint

| Method | Path | Auth | Keterangan |
|---|---|---|---|
| POST | `/api/auth/register` | Tidak | Buat akun |
| POST | `/api/auth/login` | Tidak | Login |
| GET | `/api/auth/me` | Ya | Data pengguna aktif |
| POST | `/api/auth/logout` | Ya | Hapus session |
| GET | `/api/health` | Ya | Cek koneksi database |
| GET | `/api/kategori` | Ya | Daftar kategori |
| GET | `/api/transaksi` | Ya | Daftar transaksi milik pengguna |
| GET | `/api/transaksi/:id` | Ya | Detail satu transaksi |
| POST | `/api/transaksi` | Ya | Buat transaksi |
| PUT | `/api/transaksi/:id` | Ya | Ubah transaksi |
| DELETE | `/api/transaksi/:id` | Ya | Hapus transaksi |
| GET | `/api/dashboard` | Ya | Ringkasan, batas total, dan alert bulan berjalan |
| GET | `/api/anggaran/total` | Ya | Ambil batas total/pengeluaran/sisa bulan |
| POST | `/api/anggaran/total` | Ya | Simpan batas total (update baris bulan yang sama) |
| GET | `/api/anggaran` | Ya | Daftar batas per kategori (lama, tanpa `__BATAS_TOTAL__`) |
| POST | `/api/anggaran` | Ya | UPSERT batas per kategori (lama; tolak `__BATAS_TOTAL__`) |
| GET | `/api/laporan/pdf` | Ya | Unduh laporan PDF |
| GET | `/api/laporan/excel` | Ya | Unduh laporan Excel |

---

## Autentikasi

### `POST /api/auth/register`

Body:

```json
{ "nama": "Mahasiswa Uji", "email": "uji@example.com", "password": "rahasia123" }
```

Validasi: semua field wajib, email harus valid, password minimal 6 karakter, email belum terdaftar. Password disimpan sebagai hash bcrypt (10 ronde). Session dibuat ulang dan langsung aktif.

**201 Created**

```json
{ "id": 1, "nama": "Mahasiswa Uji", "email": "uji@example.com" }
```

**Error:** `400` validasi gagal, `409` email sudah terdaftar, `500` gagal mendaftar.

Contoh:

```powershell
curl -i -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{"nama":"Mahasiswa Uji","email":"uji@example.com","password":"rahasia123"}' `
  -c cookie.txt
```

### `POST /api/auth/login`

Body: `{ "email": "uji@example.com", "password": "rahasia123" }`

**200 OK**

```json
{ "id": 1, "nama": "Mahasiswa Uji", "email": "uji@example.com" }
```

**Error:** `400` field kosong, `401` "Email atau password salah" (pesan sama untuk email salah maupun password salah), `500` gagal login.

### `GET /api/auth/me`

**200 OK**

```json
{ "id": 1, "nama": "Mahasiswa Uji", "email": "uji@example.com" }
```

**Error:** `401` belum login, `404` pengguna tidak ditemukan.

### `POST /api/auth/logout`

Menghancurkan session dan menghapus cookie `connect.sid`.

**200 OK**

```json
{ "pesan": "Logout berhasil" }
```

### `GET /api/health`

**200 OK**

```json
{ "status": "ok", "database": "terhubung" }
```

**503 Service Unavailable**

```json
{ "status": "error", "database": "tidak terhubung" }
```

Endpoint ini juga memakai `auth`, jadi tanpa cookie akan mengembalikan `401`.

---

## Kategori

### `GET /api/kategori`

Mengembalikan kategori untuk form transaksi. Kategori khusus `__BATAS_TOTAL__` disembunyikan.

**200 OK**

```json
[
  { "id": 1, "nama": "Gaji", "tipe": "masuk", "grup": null },
  { "id": 2, "nama": "Uang Saku", "tipe": "masuk", "grup": null },
  { "id": 3, "nama": "Makan", "tipe": "keluar", "grup": "Harian" },
  { "id": 4, "nama": "Transport", "tipe": "keluar", "grup": "Harian" },
  { "id": 5, "nama": "Belanja", "tipe": "keluar", "grup": "Urgent" },
  { "id": 6, "nama": "Hiburan", "tipe": "keluar", "grup": "Urgent" }
]
```

---

## Transaksi

### `GET /api/transaksi`

Mengembalikan seluruh transaksi milik pengguna, diurutkan dari tanggal terbaru.

**200 OK**

```json
[
  {
    "id": 1,
    "kategori_id": 3,
    "kategori_nama": "Makan",
    "tipe": "keluar",
    "nominal": "50000.00",
    "tanggal": "2026-11-21",
    "catatan": "Transaksi Awal"
  }
]
```

### `GET /api/transaksi/:id`

**200 OK** — objek transaksi seperti contoh di atas.
**404 Not Found** — `{ "pesan": "Transaksi tidak ditemukan" }` (juga dipakai ketika transaksi ada tetapi milik pengguna lain).

### `POST /api/transaksi`

Body:

```json
{
  "kategori_id": 3,
  "tipe": "keluar",
  "nominal": 75000,
  "tanggal": "2026-11-21",
  "catatan": "Uji CRUD"
}
```

Validasi: field wajib tidak kosong, `tipe` harus `masuk`/`keluar`, `nominal > 0`, tanggal `YYYY-MM-DD`. `nominal` diubah ke angka sebelum disimpan.

**201 Created**

```json
{
  "id": 2,
  "kategori_id": 3,
  "tipe": "keluar",
  "nominal": "75000.00",
  "tanggal": "2026-11-21",
  "catatan": "Uji CRUD"
}
```

**Error:** `400` validasi gagal, `500` gagal membuat transaksi.

### `PUT /api/transaksi/:id`

Body sama seperti `POST`. Hanya transaksi milik pengguna sendiri yang diubah.

**200 OK** — objek transaksi yang sudah diperbarui.
**404 Not Found** — transaksi tidak ditemukan atau bukan milik pengguna.
**400 Bad Request** — validasi gagal.

### `DELETE /api/transaksi/:id`

**200 OK**

```json
{ "pesan": "Transaksi dihapus", "id": 2 }
```

**404 Not Found** — transaksi tidak ditemukan atau bukan milik pengguna.

Contoh alur lengkap dengan cookie:

```powershell
curl -b cookie.txt -c cookie.txt -X POST http://localhost:5000/api/transaksi `
  -H "Content-Type: application/json" `
  -d '{"kategori_id":1,"tipe":"masuk","nominal":2000000,"tanggal":"2026-11-15","catatan":"Gaji"}'

curl -b cookie.txt http://localhost:5000/api/transaksi
```

---

## Dashboard

### `GET /api/dashboard`

Menghitung ringkasan bulan berjalan (UTC) dan status **Batas Total** pengeluaran bulan itu.

**200 OK**

```json
{
  "bulan": "2026-11",
  "total_masuk": 2000000,
  "total_keluar": 1200000,
  "saldo": 800000,
  "batas_total": 1000000,
  "sisa_total": -200000,
  "per_kategori": [
    { "kategori_id": 3, "nama": "Makan", "grup": "Harian", "total": 1200000 },
    { "kategori_id": 4, "nama": "Transport", "grup": "Harian", "total": 0 }
  ],
  "alert": ["Melebihi batas Rp 200.000"]
}
```

Keterangan:

- `batas_total` default Rp 1.000.000 bila belum pernah disetel; disimpan 1 baris per user per bulan (kategori khusus `__BATAS_TOTAL__`).
- `sisa_total = batas_total - total_keluar`; nilai negatif berarti terlampaui.
- `alert` berisi satu pesan `Melebihi batas Rp ...` saat terlampaui, kosong saat aman.
- `per_kategori` hanya pengelompokan Harian/Urgent, tanpa batas per kategori.

---

## Anggaran

### `GET /api/anggaran/total`

Query parameter opsional `bulan=YYYY-MM` (default bulan berjalan).

**200 OK**

```json
{
  "bulan": "2026-11",
  "batas": 1000000,
  "pengeluaran": 1200000,
  "sisa": -200000,
  "terlampaui": true
}
```

### `POST /api/anggaran/total`

Body: `{ "batas": 1500000, "bulan": "2026-11" }` (`bulan` opsional, default bulan berjalan).

Menyimpan ulang **memperbarui baris yang sama** untuk user+bulan (bukan menambah baris baru). Batas awal otomatis Rp 1.000.000 jika baris belum ada.

**200 OK** — mengembalikan objek ringkasan yang sama seperti GET.

**Error:** `400` jika format bulan salah atau `batas <= 0`.

### `GET /api/anggaran` (lama, batas per kategori)

Mengembalikan batas per kategori milik user; kategori khusus `__BATAS_TOTAL__` disembunyikan.

### `POST /api/anggaran` (lama, UPSERT per kategori)

Body: `{ "kategori_id": 3, "bulan": "2026-11", "batas": 500000 }`.

UPSERT pada `(user_id, kategori_id, bulan)`. **400** jika mencoba menyimpan kategori `__BATAS_TOTAL__` (`Gunakan /api/anggaran/total untuk batas total`) atau validasi gagal.

---

## Laporan

### `GET /api/laporan/pdf`

Query parameter opsional `bulan=YYYY-MM`; tanpa parameter memakai bulan berjalan.

Respons: `application/pdf`, header `Content-Disposition: attachment; filename="laporan-transaksi-2026-11.pdf"`. Isi: judul, bulan, total pemasukan, total pengeluaran, saldo, dan daftar transaksi (nomor, tanggal, kategori, tipe, nominal, catatan).

```powershell
curl -b cookie.txt -o laporan.pdf "http://localhost:5000/api/laporan/pdf?bulan=2026-11"
```

### `GET /api/laporan/excel`

Query parameter sama seperti PDF. Respons: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, nama file `laporan-transaksi-2026-11.xlsx`. Workbook memiliki dua sheet:

- **Ringkasan:** judul, bulan, total pemasukan, total pengeluaran, saldo.
- **Transaksi:** kolom `Tanggal`, `Kategori`, `Tipe`, `Nominal`, `Catatan`. Jika tidak ada transaksi, sheet berisi satu baris keterangan.

```powershell
curl -b cookie.txt -o laporan.xlsx "http://localhost:5000/api/laporan/excel?bulan=2026-11"
```

**Error bersama:** `400` format bulan salah, `401` belum login, `500` gagal membuat file.

---

## Kode status ringkas

| Kode | Arti |
|---|---|
| 200 | Permintaan berhasil |
| 201 | Data baru dibuat (atau UPSERT berhasil) |
| 400 | Validasi input gagal |
| 401 | Belum login / session tidak valid |
| 404 | Data tidak ditemukan atau bukan milik pengguna |
| 409 | Email sudah terdaftar |
| 503 | Database tidak terhubung (health check) |
| 500 | Kesalahan server |
