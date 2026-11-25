import { useState } from 'react';

const API_URL = '';

// Komponen unduh laporan: file PDF diambil dari API memakai cookie session.
export default function UnduhLaporan({ bulan }) {
  const [pesan, setPesan] = useState('');
  const [memuat, setMemuat] = useState(false);

  async function unduh() {
    setPesan('');
    setMemuat(true);
    try {
      const respons = await fetch(`${API_URL}/api/laporan/pdf?bulan=${bulan}`, {
        credentials: 'include',
      });
      if (!respons.ok) {
        const isi = await respons.json().catch(() => ({}));
        throw new Error(isi.pesan || 'Gagal mengunduh laporan');
      }

      // Blob diubah jadi tautan sementara agar browser menyimpan file.
      const blob = await respons.blob();
      const url = URL.createObjectURL(blob);
      const tautan = document.createElement('a');
      tautan.href = url;
      tautan.download = `laporan-transaksi-${bulan}.pdf`;
      document.body.appendChild(tautan);
      tautan.click();
      tautan.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setPesan(error.message);
    } finally {
      setMemuat(false);
    }
  }

  return (
    <section className="unduh">
      <h3>Unduh Laporan</h3>
      <p>Laporan transaksi bulan {bulan} beserta ringkasannya dalam bentuk PDF bertabel.</p>
      <div className="tombol-unduh">
        <button type="button" onClick={unduh} disabled={memuat}>
          {memuat ? 'Menyiapkan...' : 'Unduh PDF'}
        </button>
      </div>
      {pesan && <p className="pesan">{pesan}</p>}
    </section>
  );
}
