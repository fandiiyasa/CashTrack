import { useEffect, useState } from 'react';
import BatasTotal from '../components/BatasTotal.jsx';

const API_URL = '';
const GRUP = ['Harian', 'Urgent'];

async function bacaJson(respons) {
  const isi = await respons.json().catch(() => ({}));
  if (!respons.ok) {
    throw new Error(isi.pesan || 'Permintaan gagal');
  }
  return isi;
}

// Halaman setelah login: tentukan batas total, lalu kelompokkan kategori.
export default function Beranda({ pengguna, onKeDashboard }) {
  const [grup, setGrup] = useState('Harian');
  const [kategoriId, setKategoriId] = useState('');
  const [kategoriBaru, setKategoriBaru] = useState('');
  const [daftarKategori, setDaftarKategori] = useState([]);
  const [batas, setBatas] = useState(null);
  const [pesan, setPesan] = useState('');
  const [sukses, setSukses] = useState('');
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);

  async function muatKategori() {
    const data = await fetch(`${API_URL}/api/kategori`, {
      credentials: 'include',
    }).then(bacaJson);
    setDaftarKategori(data);
  }

  useEffect(() => {
    muatKategori()
      .catch((error) => setPesan(error.message))
      .finally(() => setMemuat(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kategoriKeluar = daftarKategori.filter((item) => item.tipe === 'keluar');

  async function simpanKategori(event) {
    event.preventDefault();
    setPesan('');
    setSukses('');

    const baru = kategoriId === '__baru__';
    const namaBaru = kategoriBaru.trim();
    if (baru ? !namaBaru : !kategoriId) {
      setPesan('Pilih kategori atau ketik nama kategori baru');
      return;
    }

    setMenyimpan(true);
    try {
      const body = baru
        ? { nama: namaBaru, grup }
        : { kategori_id: Number(kategoriId), grup };

      const hasil = await fetch(`${API_URL}/api/kategori`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(bacaJson);

      setKategoriId('');
      setKategoriBaru('');
      await muatKategori();
      setSukses(`Kategori "${hasil.nama}" dimasukkan ke grup ${grup}.`);
    } catch (error) {
      setPesan(error.message);
    } finally {
      setMenyimpan(false);
    }
  }

  const batasAda = batas?.batas !== null && batas?.batas !== undefined;

  return (
    <section className="halaman">
      <h2>Selamat datang, {pengguna.nama}</h2>
      <p>
        Tentukan batas total pengeluaran bulan ini, lalu kelompokkan kategori
        pengeluaran ke Harian atau Urgent.
      </p>

      <BatasTotal onBatas={setBatas} />

      <h3>Kelompok Kategori Pengeluaran</h3>

      <div className="pilih-grup">
        {GRUP.map((item) => (
          <button
            type="button"
            key={item}
            className={grup === item ? 'grup-aktif' : ''}
            onClick={() => {
              setGrup(item);
              setPesan('');
              setSukses('');
            }}
          >
            {item}
          </button>
        ))}
      </div>

      <form className="form" onSubmit={simpanKategori}>
        <label>
          Kategori untuk grup {grup}
          <select
            value={kategoriId}
            onChange={(event) => setKategoriId(event.target.value)}
            required
          >
            <option value="">Pilih kategori</option>
            {kategoriKeluar.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nama}{item.grup ? ` (${item.grup})` : ''}
              </option>
            ))}
            <option value="__baru__">Lainnya (ketik sendiri)</option>
          </select>
        </label>

        {kategoriId === '__baru__' && (
          <label>
            Nama kategori baru
            <input
              type="text"
              value={kategoriBaru}
              onChange={(event) => setKategoriBaru(event.target.value)}
              placeholder="Mis. Kesehatan"
              required
            />
          </label>
        )}

        <button type="submit" disabled={menyimpan}>
          {menyimpan ? 'Menyimpan...' : 'Simpan Kategori'}
        </button>
      </form>

      {pesan && <p className="pesan">{pesan}</p>}
      {sukses && <p className="status-aman">{sukses}</p>}

      {memuat ? (
        <p>Memuat kategori...</p>
      ) : (
        <div className="grup-kategori">
          {GRUP.map((namaGrup) => {
            const isi = kategoriKeluar.filter((item) => item.grup === namaGrup);
            return (
              <div className="kartu-grup" key={namaGrup}>
                <h4>{namaGrup}</h4>
                {isi.length === 0 ? (
                  <p>Belum ada kategori.</p>
                ) : (
                  <ul>
                    {isi.map((item) => (
                      <li key={item.id}>{item.nama}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {batasAda && (
        <div className="tombol-dashboard">
          <button type="button" onClick={onKeDashboard}>Lihat Dashboard</button>
        </div>
      )}
    </section>
  );
}
