import { useEffect, useState } from 'react';
import BatasTotal from '../components/BatasTotal.jsx';
import UnduhLaporan from '../components/UnduhLaporan.jsx';

const API_URL = '';
const rupiah = (nilai) => `Rp ${Number(nilai).toLocaleString('id-ID')}`;
const GRUP = ['Harian', 'Urgent', 'Lainnya'];

// Baca isi response JSON dan lempar error jika status bukan 2xx.
async function bacaJson(respons) {
  const isi = await respons.json().catch(() => ({}));
  if (!respons.ok) {
    throw new Error(isi.pesan || 'Permintaan gagal');
  }
  return isi;
}

// Dashboard: ringkasan, batas total, dan realisasi per kategori/grup.
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [pesan, setPesan] = useState('');
  const [memuat, setMemuat] = useState(true);

  // useEffect mengambil data sekali saat halaman dashboard dibuka.
  useEffect(() => {
    fetch(`${API_URL}/api/dashboard`, { credentials: 'include' })
      .then(bacaJson)
      .then(setData)
      .catch((error) => setPesan(error.message))
      .finally(() => setMemuat(false));
  }, []);

  if (memuat) {
    return <section className="halaman"><p>Memuat dashboard...</p></section>;
  }

  if (!data) {
    return (
      <section className="halaman">
        <p className="pesan">{pesan || 'Dashboard belum tersedia.'}</p>
      </section>
    );
  }

  return (
    <section className="halaman">
      <h2>Dashboard Bulan {data.bulan}</h2>

      <BatasTotal />

      <div className="ringkasan">
        <div className="kartu">
          <span>Total Pemasukan</span>
          <strong>{rupiah(data.total_masuk || 0)}</strong>
        </div>
        <div className="kartu">
          <span>Total Pengeluaran</span>
          <strong>{rupiah(data.total_keluar || 0)}</strong>
        </div>
        <div className="kartu">
          <span>Saldo</span>
          <strong>{rupiah(data.saldo || 0)}</strong>
        </div>
      </div>

      <h3>Total Pengeluaran per Grup</h3>
      <div className="ringkasan">
        {GRUP.map((grup) => (
          <div className="kartu" key={grup}>
            <span>{grup}</span>
            <strong>{rupiah(data.per_grup?.[grup] || 0)}</strong>
          </div>
        ))}
      </div>

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
          {data.per_kategori.map((item) => (
            <tr key={item.kategori_id}>
              <td>{item.nama}</td>
              <td>{item.grup}</td>
              <td>{rupiah(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.per_kategori.length === 0 && (
        <p>Belum ada pengeluaran pada bulan ini.</p>
      )}

      {pesan && <p className="pesan">{pesan}</p>}

      <UnduhLaporan bulan={data.bulan} />
    </section>
  );
}
