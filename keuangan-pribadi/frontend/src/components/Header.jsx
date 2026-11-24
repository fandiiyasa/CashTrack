// Komponen header menerima judul lewat props.
export default function Header({ judul }) {
  return (
    <header className="header">
      <h1>{judul}</h1>
      <p>Catat pemasukan dan pengeluaran dengan lebih rapi.</p>
    </header>
  );
}
