import { useState } from 'react';

const API_URL = '';

// Komponen unduh laporan: file diambil dari API memakai cookie session.
export default function UnduhLaporan({ bulan }) {
  const [pesan, setPesan] = useState('');

  async function unduh(jenis) {
    setPesan('');
    try {
      const respons = await fetch(`${API_URL}/api/laporan/${jenis}?bulan=${bulan}`, {
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
      tautan.download = `laporan-transaksi-${bulan}.${jenis === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(tautan);
      tautan.click();
      tautan.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setPesan(error.message);
    }
  }

  return (
    <section className="unduh">
      <h3>Unduh Laporan</h3>
      <p>Laporan transaksi bulan {bulan} beserta ringkasannya.</p>
      <div className="tombol-unduh">
        <button type="button" onClick={() => unduh('pdf')}>Unduh PDF</button>
        <button type="button" onClick={() => unduh('excel')}>Unduh Excel</button>
      </div>
      {pesan && <p className="pesan">{pesan}</p>}
    </section>
  );
}
