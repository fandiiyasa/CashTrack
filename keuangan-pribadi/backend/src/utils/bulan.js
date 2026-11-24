// Bentuk bulan berjalan sebagai YYYY-MM sesuai kolom anggaran.bulan.
export function bulanBerjalan() {
  const sekarang = new Date();
  const tahun = sekarang.getUTCFullYear();
  const bulan = String(sekarang.getUTCMonth() + 1).padStart(2, '0');
  return `${tahun}-${bulan}`;
}

// Awal dan akhir bulan dipakai sebagai filter rentang tanggal transaksi.
export function rentangBulan(bulan) {
  const [tahun, bulanAngka] = bulan.split('-').map(Number);
  const awal = `${bulan}-01`;
  const akhir = new Date(Date.UTC(tahun, bulanAngka, 1)).toISOString().slice(0, 10);
  return { awal, akhir };
}
