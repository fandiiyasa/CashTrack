import { useEffect, useState } from 'react';
import BatasTotal from '../components/BatasTotal.jsx';
import UnduhLaporan from '../components/UnduhLaporan.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const rupiah = (nilai) => `Rp ${Number(nilai).toLocaleString('id-ID')}`;

// Baca isi response JSON dan lempar error jika status bukan 2xx.
async function bacaJson(respons) {
  const isi = await respons.json().catch(() => ({}));
  if (!respons.ok) {
    throw new Error(isi.pesan || 'Permintaan gagal');
  }
  return isi;
}

// Dashboard: state menyimpan ringkasan dan status pemuatan halaman.
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [pesan, setPesan] = useState('');
  const [memuat, setMemuat] = useState(true);

  async function muatData() {
    const hasil = await fetch(`${API_URL}/api/dashboard`, {
      credentials: 'include',
    }).then(bacaJson);
    setData(hasil);
  }

  // useEffect mengambil data sekali saat halaman dashboard dibuka.
  useEffect(() => {
    muatData()
      .catch((error) => setPesan(error.message))
      .finally(() => setMemuat(false));
  }, []);

  if (memuat) {
    return <section className="halaman"><p>Memuat dashboard...</p></section>;
  }

  return (
    <section className="halaman">
      <h2>Dashboard Bulan {data?.bulan}</h2>

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

      <BatasTotal onSelesai={muatData} />

      <h3>Pengeluaran per Kategori</h3>
      <table className="tabel">
        <thead>
          <tr>
            <th>Kategori</th>
            <th>Grup</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {data?.per_kategori.map((item) => (
            <tr key={item.kategori_id}>
              <td>{item.nama}</td>
              <td>{item.grup || '-'}</td>
              <td>{rupiah(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {pesan && <p className="pesan">{pesan}</p>}

      <UnduhLaporan bulan={data?.bulan} />
    </section>
  );
}
