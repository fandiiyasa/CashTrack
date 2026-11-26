import { useEffect, useState } from 'react';
import AlertAnggaran from './AlertAnggaran.jsx';

// Memakai proxy Vite agar tidak bergantung pada alamat backend dari browser.
const API_URL = '';
const rupiah = (nilai) => `Rp ${Number(nilai).toLocaleString('id-ID')}`;

// Baca JSON dan lempar error bila status bukan 2xx.
async function bacaJson(respons) {
  const isi = await respons.json().catch(() => ({}));
  if (!respons.ok) throw new Error(isi.pesan || 'Permintaan gagal');
  return isi;
}

// Batas total dipakai bersama di Beranda dan Dashboard; edit bersifat opsional.
export default function BatasTotal({ onBatas }) {
  const [data, setData] = useState(null);
  const [sedangEdit, setSedangEdit] = useState(false);
  const [nilai, setNilai] = useState('');
  const [pesan, setPesan] = useState('');
  const [memuat, setMemuat] = useState(true);

  async function muat() {
    const hasil = await fetch(`${API_URL}/api/anggaran/total`, {
      credentials: 'include',
    }).then(bacaJson);
    setData(hasil);
    if (onBatas) onBatas(hasil);
    return hasil;
  }

  // Ambil batas sekali saat komponen dipasang.
  useEffect(() => {
    muat()
      .catch((error) => setPesan(error.message))
      .finally(() => setMemuat(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } catch (error) {
      setPesan(error.message);
    }
  }

  if (memuat) {
    return <section className="batas-total"><p>Memuat batas total...</p></section>;
  }

  if (!data) {
    return (
      <section className="batas-total">
        <p className="pesan">{pesan || 'Batas total belum tersedia.'}</p>
      </section>
    );
  }

  const belumAda = data.batas === null;
  const daftarAlert = data.terlampaui
    ? [`Total pengeluaran ${rupiah(data.pengeluaran)} melebihi batas ${rupiah(data.batas)}`]
    : [];

  return (
    <section className="batas-total">
      <h3>Batas Total Pengeluaran Bulan {data.bulan}</h3>

      {!belumAda && !sedangEdit && (
        <div className="batas-ringkas">
          <div>
            <span>Batas</span>
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
              setNilai(String(data.batas));
              setSedangEdit(true);
            }}
          >
            Edit Batas
          </button>
        </div>
      )}

      {!belumAda && <AlertAnggaran daftar={daftarAlert} />}

      {(belumAda || sedangEdit) && (
        <form className="form" onSubmit={simpan}>
          <label>
            {belumAda ? 'Tentukan batas total (Rp)' : 'Batas total baru (Rp)'}
            <input
              type="number"
              min="1"
              step="0.01"
              value={nilai}
              onChange={(event) => setNilai(event.target.value)}
              placeholder="Mis. 1000000"
              required
            />
          </label>
          <div className="tombol-form">
            <button type="submit">{belumAda ? 'Simpan Batas' : 'Perbarui Batas'}</button>
            {sedangEdit && (
              <button
                type="button"
                onClick={() => {
                  setSedangEdit(false);
                  setPesan('');
                }}
              >
                Batal
              </button>
            )}
          </div>
        </form>
      )}

      {belumAda && (
        <p>Pengeluaran bulan ini: {rupiah(data.pengeluaran)}. Tentukan batas agar bisa memantau sisa anggaran.</p>
      )}
      {pesan && <p className="pesan">{pesan}</p>}
    </section>
  );
}
