// Komponen presentasional: menerima daftar alert lewat props.
export default function AlertAnggaran({ daftar, adaBatas = true }) {
  if (!adaBatas) {
    return (
      <p className="status-aman">
        Belum ada batas total untuk bulan ini. Atur batas di Beranda.
      </p>
    );
  }

  if (!daftar || daftar.length === 0) {
    return <p className="status-aman">Pengeluaran masih di bawah batas total.</p>;
  }

  return (
    <div className="alert">
      <strong>Peringatan batas total terlampaui:</strong>
      {daftar.map((teks, index) => (
        <p key={index}>{teks}</p>
      ))}
    </div>
  );
}
