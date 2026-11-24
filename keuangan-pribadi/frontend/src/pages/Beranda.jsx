// Halaman setelah login: menyapa pengguna yang diterima lewat props.
export default function Beranda({ pengguna }) {
  return (
    <section className="halaman">
      <h2>Selamat datang, {pengguna.nama}</h2>
      <p>
        Aplikasi ini membantu mencatat transaksi, mengatur anggaran, dan melihat
        ringkasan keuangan bulanan.
      </p>
    </section>
  );
}
