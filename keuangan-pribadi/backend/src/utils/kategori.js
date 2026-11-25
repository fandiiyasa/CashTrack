// Kategori khusus untuk menyimpan satu batas total pengeluaran per bulan.
// Baris ini tidak ditampilkan di daftar kategori transaksi.
export const KATEGORI_TOTAL = '__BATAS_TOTAL__';

// Kategori pengeluaran yang dikelompokkan memakai prefix nama:
// "Harian - Makan" -> grup "Harian".
export const PREFIX_GRUP = /^(Harian|Urgent) - /;

// Ambil nama grup dari nama kategori berprefix.
export function grupDariNama(nama) {
  const cocok = String(nama).match(PREFIX_GRUP);
  return cocok ? cocok[1] : 'Lainnya';
}

// Ambil nama kategori tanpa prefix grup.
export function namaTanpaGrup(nama) {
  return String(nama).replace(PREFIX_GRUP, '');
}
