import { useEffect, useState } from 'react';
import AlertAnggaran from '../components/AlertAnggaran.jsx';
import UnduhLaporan from '../components/UnduhLaporan.jsx';

const API_URL = '';
const rupiah = (nilai) => `Rp ${Number(nilai).toLocaleString('id-ID')}`;

// Baca isi response JSON dan lempar error jika status bukan 2xx.
async function bacaJson(respons) {
  const isi = await respons.json().catch(() => ({}));
  if (!respons.ok) {
    throw new Error(isi.pesan || 'Permintaan gagal');
  }
  return isi;
}

// Dashboard: state menyimpan ringkasan, alert, dan form batas anggaran.
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [kategori, setKategori] = useState([]);
  const [form, setForm] = useState({ kategori_id: '', batas: '' });
  const [pesan, setPesan] = useState('');
  const [memuat, setMemuat] = useState(true);

  async function muatData() {
    const opsi = { credentials: 'include' };
    const [dashboard, daftarKategori] = await Promise.all([
      fetch(`${API_URL}/api/dashboard`, opsi).then(bacaJson),
      fetch(`${API_URL}/api/kategori`, opsi).then(bacaJson),
    ]);
    setData(dashboard);
    setKategori(daftarKategori.filter((item) => item.tipe === 'keluar'));
  }

  // useEffect mengambil data sekali saat halaman dashboard dibuka.
  useEffect(() => {
    muatData()
      .catch((error) => setPesan(error.message))
      .finally(() => setMemuat(false));
  }, []);

  async function simpanAnggaran(event) {
    event.preventDefault();
    setPesan('');
    try {
      await fetch(`${API_URL}/api/anggaran`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kategori_id: form.kategori_id,
          batas: form.batas,
          bulan: data.bulan,
        }),
      }).then(bacaJson);
      setForm({ kategori_id: '', batas: '' });
      await muatData();
    } catch (error) {
      setPesan(error.message);
    }
  }

  if (memuat) {
    return <section className="halaman"><p>Memuat dashboard...</p></section>;
  }

  return (
    <section className="halaman">
      <h2>Dashboard Bulan {data?.bulan}</h2>

      <AlertAnggaran daftar={data?.alert} />

      <div className="ringkasan">
        <div className="kartu">
          <span>Total Pemasukan</span>
          <strong>{rupiah(data?.total_masuk || 0)}</strong>
        </div>
        <div className="kartu">
          <span>Total Pengeluaran</span>
          <strong>{rupiah(data?.total_keluar || 0)}</strong>
        </div>
        <div className="kartu">
          <span>Saldo</span>
          <strong>{rupiah(data?.saldo || 0)}</strong>
        </div>
      </div>

      <h3>Pengeluaran per Kategori</h3>
      <table className="tabel">
        <thead>
          <tr>
            <th>Kategori</th>
            <th>Total</th>
            <th>Batas</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data?.per_kategori.map((item) => (
            <tr key={item.kategori_id}>
              <td>{item.nama}</td>
              <td>{rupiah(item.total)}</td>
              <td>{item.batas === null ? '-' : rupiah(item.batas)}</td>
              <td>
                {item.terlampaui ? (
                  <span className="badge-bahaya">Melebihi</span>
                ) : (
                  <span className="badge-aman">Aman</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Atur Batas Anggaran</h3>
      <form className="form" onSubmit={simpanAnggaran}>
        <label>
          Kategori
          <select
            value={form.kategori_id}
            onChange={(event) => setForm({ ...form, kategori_id: event.target.value })}
            required
          >
            <option value="">Pilih kategori</option>
            {kategori.map((item) => (
              <option key={item.id} value={item.id}>{item.nama}</option>
            ))}
          </select>
        </label>
        <label>
          Batas (Rp)
          <input
            type="number"
            min="1"
            step="0.01"
            value={form.batas}
            onChange={(event) => setForm({ ...form, batas: event.target.value })}
            required
          />
        </label>
        <button type="submit">Simpan Batas</button>
      </form>
      {pesan && <p className="pesan">{pesan}</p>}

      <UnduhLaporan bulan={data?.bulan} />
    </section>
  );
}
