import { useState } from 'react';

// Alamat backend diambil dari .env frontend; fallback untuk menjalankan lokal.
const API_URL = '';

// Form login: useState menyimpan input, pesan, dan status loading.
export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pesan, setPesan] = useState('');
  const [memuat, setMemuat] = useState(false);

  async function tanganiSubmit(event) {
    event.preventDefault(); // cegah halaman reload saat form dikirim
    setPesan('');
    setMemuat(true);

    try {
      const respons = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        credentials: 'include', // kirim cookie session agar tersimpan di browser
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await respons.json();

      if (!respons.ok) {
        setPesan(data.pesan || 'Login gagal');
        return;
      }
      onLogin(data); // teruskan data pengguna ke App
    } catch (error) {
      setPesan('Tidak dapat terhubung ke server');
    } finally {
      setMemuat(false);
    }
  }

  return (
    <section className="halaman">
      <h2>Login</h2>
      <form className="form" onSubmit={tanganiSubmit}>
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
        <button type="submit" disabled={memuat}>
          {memuat ? 'Memproses...' : 'Login'}
        </button>
      </form>
      {pesan && <p className="pesan">{pesan}</p>}
    </section>
  );
}
