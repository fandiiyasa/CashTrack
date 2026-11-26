import { useEffect, useState } from 'react';

const API_URL = '';
const FORM_KOSONG = { kategori_id: '', tipe: 'keluar', nominal: '', tanggal: '', catatan: '' };

// Pembantu fetch: cookie session ikut dikirim dan error API dilempar sebagai Error.
async function ambilApi(path, opsi = {}) {
  const respons = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...opsi,
  });
  const data = await respons.json().catch(() => ({}));
  if (!respons.ok) {
    throw new Error(data.pesan || 'Permintaan gagal');
  }
  return data;
}

// Halaman CRUD transaksi: useEffect mengambil data, map merender daftar.
export default function Transaksi() {
  const [daftar, setDaftar] = useState([]);
  const [kategori, setKategori] = useState([]);
  const [form, setForm] = useState(FORM_KOSONG);
  const [idEdit, setIdEdit] = useState(null);
  const [pesan, setPesan] = useState('');
  const [memuat, setMemuat] = useState(true);

  // Ambil daftar transaksi dan kategori sekali saat halaman dibuka.
  useEffect(() => {
    async function muatAwal() {
      try {
        const [transaksi, daftarKategori] = await Promise.all([
          ambilApi('/api/transaksi'),
          ambilApi('/api/kategori'),
        ]);
        setDaftar(transaksi);
        setKategori(daftarKategori);
      } catch (error) {
        setPesan(error.message);
      } finally {
        setMemuat(false);
      }
    }
    muatAwal();
  }, []);

  async function muatUlang() {
    setDaftar(await ambilApi('/api/transaksi'));
  }

  function ubahForm(event) {
    const { name, value } = event.target;
    setForm((lama) => ({ ...lama, [name]: value }));
  }

  function pilihKategori(event) {
    const id = event.target.value;
    const dipilih = kategori.find((item) => String(item.id) === id);
    setForm((lama) => ({ ...lama, kategori_id: id, tipe: dipilih ? dipilih.tipe : lama.tipe }));
  }

  async function simpan(event) {
    event.preventDefault();
    setPesan('');
    const opsi = {
      method: idEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    };

    try {
      await ambilApi(idEdit ? `/api/transaksi/${idEdit}` : '/api/transaksi', opsi);
      setForm(FORM_KOSONG);
      setIdEdit(null);
      await muatUlang();
    } catch (error) {
      setPesan(error.message);
    }
  }

  function mulaiEdit(item) {
    setIdEdit(item.id);
    setForm({
      kategori_id: String(item.kategori_id),
      tipe: item.tipe,
      nominal: String(item.nominal),
      tanggal: item.tanggal,
      catatan: item.catatan || '',
    });
  }

  async function hapus(id) {
    try {
      await ambilApi(`/api/transaksi/${id}`, { method: 'DELETE' });
      await muatUlang();
    } catch (error) {
      setPesan(error.message);
    }
  }

  // Semua kategori pengeluaran tersedia; grup hanya untuk tampilan Dashboard.
  const pilihanKategori = kategori;

  return (
    <section className="halaman">
      <h2>Transaksi</h2>

      <form className="form" onSubmit={simpan}>
        <label>
          Kategori
          <select name="kategori_id" value={form.kategori_id} onChange={pilihKategori} required>
            <option value="">Pilih kategori</option>
            {pilihanKategori.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nama} ({item.tipe})
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipe
          <select name="tipe" value={form.tipe} onChange={ubahForm} required>
            <option value="masuk">masuk</option>
            <option value="keluar">keluar</option>
          </select>
        </label>
        <label>
          Nominal
          <input
            name="nominal"
            type="number"
            min="1"
            step="0.01"
            value={form.nominal}
            onChange={ubahForm}
            required
          />
        </label>
        <label>
          Tanggal
          <input name="tanggal" type="date" value={form.tanggal} onChange={ubahForm} required />
        </label>
        <label>
          Catatan
          <input name="catatan" type="text" value={form.catatan} onChange={ubahForm} />
        </label>
        <div className="tombol-form">
          <button type="submit">{idEdit ? 'Simpan Perubahan' : 'Tambah Transaksi'}</button>
          {idEdit && (
            <button type="button" onClick={() => { setIdEdit(null); setForm(FORM_KOSONG); }}>
              Batal
            </button>
          )}
        </div>
      </form>

      {pesan && <p className="pesan">{pesan}</p>}
      {memuat ? (
        <p>Memuat transaksi...</p>
      ) : (
        <table className="tabel">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Kategori</th>
              <th>Tipe</th>
              <th>Nominal</th>
              <th>Catatan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {daftar.map((item) => (
              <tr key={item.id}>
                <td>{item.tanggal}</td>
                <td>{item.kategori_nama}</td>
                <td>{item.tipe}</td>
                <td>{Number(item.nominal).toLocaleString('id-ID')}</td>
                <td>{item.catatan || '-'}</td>
                <td>
                  <button type="button" onClick={() => mulaiEdit(item)}>Edit</button>
                  <button type="button" onClick={() => hapus(item.id)}>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!memuat && daftar.length === 0 && <p>Belum ada transaksi.</p>}
    </section>
  );
}
