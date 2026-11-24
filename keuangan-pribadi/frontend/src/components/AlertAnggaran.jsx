// Komponen presentasional: menerima daftar alert lewat props.
export default function AlertAnggaran({ daftar }) {
  if (!daftar || daftar.length === 0) {
    return <p className="status-aman">Semua pengeluaran masih di bawah batas anggaran.</p>;
  }

  return (
    <div className="alert">
      <strong>Peringatan anggaran terlampaui:</strong>
      {daftar.map((teks, index) => (
        <p key={index}>{teks}</p>
      ))}
    </div>
  );
}
