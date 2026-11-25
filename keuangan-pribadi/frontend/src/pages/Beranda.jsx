import { useEffect, useState } from 'react';

const API_URL = '';
const PREFIX_GRUP = /^(Harian|Urgent) - /;
const rupiah = (nilai) => `Rp ${Number(nilai).toLocaleString('id-ID')}`;

// Bulan berjalan mengikuti UTC agar sama dengan backend (YYYY-MM).
function bulanSekarang() {
  const sekarang = new Date();
  const tahun = sekarang.getUTCFullYear();
  const bulan = String(sekarang.getUTCMonth() + 1).padStart(2, '0');
  return `${tahun}-${bulan}`;
}

async function bacaJson(respons) {
  const isi = await respons.json().catch(() => ({}));
  if (!respons.ok) {
    throw new Error(isi.pesan || 'Permintaan gagal');
  }
  return isi;
}

// Halaman setelah login: atur batas total pengeluaran dan kelompokkan kategori.
export default function Beranda({ pengguna, onKeDashboard }) {
  const [bulan] = useState(bulanSekarang);
  const [batasTersimpan, setBatasTersimpan] = useState(null);
  const [batas, setBatas] = useState('');
  const [mengeditBatas, setMengeditBatas] = useState(false);
  const [grup, setGrup] = useState('Harian');
  const [subkategori, setSubkategori] = useState('');
  const [kategoriBaru, setKategoriBaru] = useState('');
  const [kategori, setKategori] = useState([]);
  const [pesan, setPesan] = useState('');
  const [sukses, setSukses] = useState('');
  const [memuat, setMemuat] = useState(true);
  const [menyimpanBatas, setMenyimpanBatas] = useState(false);
  const [menyimpanKategori, setMenyimpanKategori] = useState(false);

  async function muatBatas() {
    const data = await fetch(`${API_URL}/api/anggaran/total?bulan=${bulan}`, {
      credentials: 'include',
    }).then(bacaJson);
    setBatasTersimpan(data.batas);
    setBatas(data.batas === null ? '' : String(data.batas));
  }

  async function muatKategori() {
    const data = await fetch(`${API_URL}/api/kategori`, {
      credentials: 'include',
    }).then(bacaJson);
    setKategori(data);
  }

  async function muatData() {
    await Promise.all([muatBatas(), muatKategori()]);
  }

  useEffect(() => {
    muatData()
      .catch((error) => setPesan(error.message))
      .finally(() => setMemuat(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grupDari = (nama) => {
    const cocok = String(nama).match(PREFIX_GRUP);
    return cocok ? cocok[1] : 'Lainnya';
  };
  const subDari = (nama) => String(nama).replace(PREFIX_GRUP, '');

  const terkelompok = kategori.filter(
    (item) => item.tipe === 'keluar' && PREFIX_GRUP.test(item.nama)
  );
  const kategoriDasar = kategori.filter(
    (item) => item.tipe === 'keluar' && !PREFIX_GRUP.test(item.nama)
  );
  const subSudahDipakai = new Set(terkelompok.map((item) => subDari(item.nama)));
  const pilihan = kategoriDasar
    .filter((item) => !subSudahDipakai.has(item.nama))
    .map((item) => item.nama)
    .sort((a, b) => a.localeCompare(b));

  async function simpanBatas(event) {
    event.preventDefault();
    setPesan('');
    setSukses('');

    if (!(Number(batas) > 0)) {
      setPesan('Batas harus lebih dari 0');
      return;
    }

    const sudahAda = batasTersimpan !== null;
    setMenyimpanBatas(true);
    try {
      const hasil = await fetch(`${API_URL}/api/anggaran/total`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulan, batas }),
      }).then(bacaJson);

      setBatasTersimpan(Number(hasil.batas));
      setBatas(String(hasil.batas));
      setMengeditBatas(false);
      setSukses(sudahAda ? 'Batas total berhasil diperbarui.' : 'Batas total berhasil disimpan.');
    } catch (error) {
      setPesan(error.message);
    } finally {
      setMenyimpanBatas(false);
    }
  }

  function batalEditBatas() {
    setMengeditBatas(false);
    setBatas(batasTersimpan === null ? '' : String(batasTersimpan));
    setPesan('');
    setSukses('');
  }

  async function simpanKategori(event) {
    event.preventDefault();
    setPesan('');
    setSukses('');

    const namaSub = subkategori === '__baru__' ? kategoriBaru.trim() : subkategori;
    if (!namaSub) {
      setPesan('Pilih kategori atau ketik nama kategori baru');
      return;
    }

    const bentrok = terkelompok.find(
      (item) => subDari(item.nama).toLowerCase() === namaSub.toLowerCase()
    );
    if (bentrok) {
      setPesan(`Kategori "${namaSub}" sudah ada di grup ${grupDari(bentrok.nama)}.`);
      return;
    }

    setMenyimpanKategori(true);
    try {
      await fetch(`${API_URL}/api/kategori`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grup, subkategori: namaSub }),
      }).then(bacaJson);

      setSubkategori('');
      setKategoriBaru('');
      await muatKategori();
      setSukses(`Kategori "${namaSub}" ditambahkan ke grup ${grup}.`);
    } catch (error) {
      setPesan(error.message);
    } finally {
      setMenyimpanKategori(false);
    }
  }

  return (
    <section className="halaman">
      <h2>Selamat datang, {pengguna.nama}</h2>
      <p>
        Tentukan batas total pengeluaran bulan ini, lalu kelompokkan kategori
        pengeluaran ke Harian atau Urgent.
      </p>

      <h3>Batas Total Pengeluaran Bulan {bulan}</h3>

      {memuat ? (
        <p>Memuat batas...</p>
      ) : batasTersimpan !== null && !mengeditBatas ? (
        <div className="kartu-batas">
          <div>
            <span>Batas total bulan ini</span>
            <strong>{rupiah(batasTersimpan)}</strong>
          </div>
          <button
            type="button"
            onClick={() => {
              setMengeditBatas(true);
              setBatas(String(batasTersimpan));
              setPesan('');
              setSukses('');
            }}
          >
            Edit Batas
          </button>
        </div>
      ) : (
        <form className="form" onSubmit={simpanBatas}>
          <label>
            Batas total (Rp)
            <input
              type="number"
              min="1"
              step="0.01"
              value={batas}
              onChange={(event) => setBatas(event.target.value)}
              placeholder="Mis. 1000000"
              required
            />
          </label>
          <div className="tombol-form">
            <button type="submit" disabled={menyimpanBatas}>
              {menyimpanBatas
                ? 'Menyimpan...'
                : batasTersimpan === null
                  ? 'Simpan Batas'
                  : 'Perbarui Batas'}
            </button>
            {batasTersimpan !== null && (
              <button type="button" onClick={batalEditBatas}>
                Batal
              </button>
            )}
          </div>
        </form>
      )}

      {pesan && <p className="pesan">{pesan}</p>}
      {sukses && <p className="status-aman">{sukses}</p>}

      <h3>Kelompok Kategori Pengeluaran</h3>
      <p>
        Kategori Harian untuk kebutuhan sehari-hari, Urgent untuk pengeluaran
        mendesak.
      </p>

      <div className="pilih-grup">
        {['Harian', 'Urgent'].map((item) => (
          <button
            type="button"
            key={item}
            className={grup === item ? 'grup-aktif' : ''}
            onClick={() => {
              setGrup(item);
              setSubkategori('');
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
          Kategori {grup}
          <select
            value={subkategori}
            onChange={(event) => setSubkategori(event.target.value)}
            required
          >
            <option value="">Pilih kategori</option>
            {pilihan.map((nama) => (
              <option key={nama} value={nama}>{nama}</option>
            ))}
            <option value="__baru__">Lainnya (ketik sendiri)</option>
          </select>
        </label>

        {subkategori === '__baru__' && (
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

        <button type="submit" disabled={menyimpanKategori}>
          {menyimpanKategori ? 'Menyimpan...' : `Simpan ke ${grup}`}
        </button>
      </form>

      <h3>Kategori Tersimpan</h3>
      {memuat ? (
        <p>Memuat kategori...</p>
      ) : terkelompok.length === 0 ? (
        <p>Belum ada kategori yang dikelompokkan.</p>
      ) : (
        <div className="daftar-grup">
          {['Harian', 'Urgent'].map((namaGrup) => {
            const isi = terkelompok.filter((item) => grupDari(item.nama) === namaGrup);
            return (
              <div className="grup-kartu" key={namaGrup}>
                <h4>{namaGrup}</h4>
                {isi.length === 0 ? (
                  <p className="kosong">Belum ada kategori.</p>
                ) : (
                  <ul>
                    {isi.map((item) => (
                      <li key={item.id}>{subDari(item.nama)}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {batasTersimpan !== null && (
        <div className="tombol-dashboard">
          <button type="button" onClick={onKeDashboard}>Lihat Dashboard</button>
        </div>
      )}
    </section>
  );
}
