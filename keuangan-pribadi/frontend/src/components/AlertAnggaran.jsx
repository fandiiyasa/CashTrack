// Komponen presentasional: menerima daftar alert lewat props.
export default function AlertAnggaran({ daftar }) {
  if (!daftar || daftar.length === 0) {
    return <p className="status-aman">Pengeluaran masih di bawah batas total.</p>;
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
