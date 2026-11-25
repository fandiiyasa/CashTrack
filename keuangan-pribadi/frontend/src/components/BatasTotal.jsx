import { useEffect, useState } from 'react';
import AlertAnggaran from './AlertAnggaran.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const rupiah = (nilai) => `Rp ${Number(nilai).toLocaleString('id-ID')}`;

// Baca JSON dan lempar error bila status bukan 2xx.
async function bacaJson(respons) {
  const isi = await respons.json().catch(() => ({}));
  if (!respons.ok) throw new Error(isi.pesan || 'Permintaan gagal');
  return isi;
}

// Batas total dipakai bersama di Beranda dan Dashboard; edit bersifat opsional.
export default function BatasTotal({ onSelesai }) {
  const [data, setData] = useState(null);
  const [sedangEdit, setSedangEdit] = useState(false);
  const [nilai, setNilai] = useState('');
  const [pesan, setPesan] = useState('');

  async function muat() {
    const hasil = await fetch(`${API_URL}/api/anggaran/total`, {
      credentials: 'include',
    }).then(bacaJson);
    setData(hasil);
    return hasil;
  }

  // Ambil batas sekali saat komponen dipasang.
  useEffect(() => {
    muat().catch((error) => setPesan(error.message));
  }, []);

  async function simpan(event) {
    event.preventDefault();
    setPesan('');
    try {
      await fetch(`${API_URL}/api/anggaran/total`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batas: nilai }),
      }).then(bacaJson);
      setSedangEdit(false);
      await muat();
      if (onSelesai) onSelesai();
    } catch (error) {
      setPesan(error.message);
    }
  }

  if (!data) {
    return <section className="batas-total"><p>Memuat batas total...</p></section>;
  }

  const daftarAlert = data.terlampaui
    ? [`Melebihi batas Rp ${Math.abs(data.sisa).toLocaleString('id-ID')}`]
    : [];

  return (
    <section className="batas-total">
      <div className="batas-ringkas">
        <div>
          <span>Batas Total Pengeluaran</span>
          <strong>{rupiah(data.batas)}</strong>
        </div>
        <div>
          <span>{data.terlampaui ? 'Kelebihan' : 'Sisa batas'}</span>
          <strong className={data.terlampaui ? 'teks-bahaya' : 'teks-aman'}>
            {rupiah(Math.abs(data.sisa))}
          </strong>
        </div>
        <button
          type="button"
          onClick={() => {
            setNilai(data.batas);
            setSedangEdit(true);
          }}
        >
          Edit Batas
        </button>
      </div>

      <AlertAnggaran daftar={daftarAlert} />

      {sedangEdit && (
        <form className="form" onSubmit={simpan}>
          <label>
            Batas Total (Rp)
            <input
              type="number"
              min="1"
              step="0.01"
              value={nilai}
              onChange={(event) => setNilai(event.target.value)}
              required
            />
          </label>
          <div className="tombol-form">
            <button type="submit">Simpan Batas</button>
            <button type="button" onClick={() => setSedangEdit(false)}>Batal</button>
          </div>
        </form>
      )}
      {pesan && <p className="pesan">{pesan}</p>}
    </section>
  );
}
