import BatasTotal from '../components/BatasTotal.jsx';

// Halaman setelah login: menyapa pengguna dan menampilkan batas total.
export default function Beranda({ pengguna }) {
  return (
    <section className="halaman">
      <h2>Selamat datang, {pengguna.nama}</h2>
      <p>
        Aplikasi ini membantu mencatat transaksi, mengatur batas pengeluaran,
        dan melihat ringkasan keuangan bulanan.
      </p>
      <BatasTotal />
    </section>
  );
}
