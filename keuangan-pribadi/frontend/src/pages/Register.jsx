import { useState } from 'react';

// Alamat backend diambil dari proxy Vite; fallback untuk menjalankan lokal.
const API_URL = '';

// Form registrasi: membuat akun baru lalu otomatis login.
export default function Register({ onLogin, onSwitchToLogin }) {
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [konfirmasi, setKonfirmasi] = useState('');
  const [pesan, setPesan] = useState('');
  const [memuat, setMemuat] = useState(false);

  async function tanganiSubmit(event) {
    event.preventDefault(); // cegah halaman reload saat form dikirim
    setPesan('');

    if (password !== konfirmasi) {
      setPesan('Konfirmasi password tidak cocok');
      return;
    }
    if (password.length < 6) {
      setPesan('Password minimal 6 karakter');
      return;
    }

    setMemuat(true);

    try {
      const respons = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        credentials: 'include', // kirim cookie session agar tersimpan di browser
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama, email, password }),
      });
      const data = await respons.json();

      if (!respons.ok) {
        setPesan(data.pesan || 'Registrasi gagal');
        return;
      }
      onLogin(data); // akun dibuat dan langsung login
    } catch (error) {
      setPesan('Tidak dapat terhubung ke server');
    } finally {
      setMemuat(false);
    }
  }

  return (
    <section className="halaman">
      <h2>Daftar Akun</h2>
      <form className="form" onSubmit={tanganiSubmit}>
        <label>
          Nama
          <input
            type="text"
            value={nama}
            onChange={(event) => setNama(event.target.value)}
            placeholder="Nama lengkap"
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nama@example.com"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimal 6 karakter"
            required
          />
        </label>
        <label>
          Konfirmasi Password
          <input
            type="password"
            value={konfirmasi}
            onChange={(event) => setKonfirmasi(event.target.value)}
            placeholder="Ulangi password"
            required
          />
        </label>
        <button type="submit" disabled={memuat}>
          {memuat ? 'Memproses...' : 'Daftar'}
        </button>
      </form>
      {pesan && <p className="pesan">{pesan}</p>}
      <p className="tautan-auth">
        Sudah punya akun?{' '}
        <button type="button" className="tautan" onClick={onSwitchToLogin}>
          Login
        </button>
      </p>
    </section>
  );
}
