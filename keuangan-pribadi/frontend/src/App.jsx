import { useState } from 'react';
import Header from './components/Header.jsx';
import Beranda from './pages/Beranda.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Transaksi from './pages/Transaksi.jsx';

const API_URL = '';

// App menyimpan status login dan halaman yang sedang dibuka.
export default function App() {
  const [pengguna, setPengguna] = useState(null);
  const [halaman, setHalaman] = useState('beranda');
  const [modeAuth, setModeAuth] = useState('login');

  // Setelah login/register berhasil, arahkan ke beranda.
  function tanganiLogin(data) {
    setPengguna(data);
    setHalaman('beranda');
    setModeAuth('login');
  }

  async function keluar() {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setPengguna(null);
      setHalaman('beranda');
      setModeAuth('login');
    }
  }

  return (
    <div className="app">
      <Header judul="CashTrack"/>
      <main>
        {pengguna ? (
          <>
            <nav className="nav">
              <button type="button" onClick={() => setHalaman('dashboard')}>Dashboard</button>
              <button type="button" onClick={() => setHalaman('transaksi')}>Transaksi</button>
              <button type="button" onClick={() => setHalaman('beranda')}>Beranda</button>
              <button type="button" onClick={keluar}>Logout</button>
            </nav>
            {halaman === 'transaksi' ? (
              <Transaksi />
            ) : halaman === 'beranda' ? (
              <Beranda pengguna={pengguna} onKeDashboard={() => setHalaman('dashboard')} />
            ) : (
              <Dashboard />
            )}
          </>
        ) : modeAuth === 'register' ? (
          <Register
            onLogin={tanganiLogin}
            onSwitchToLogin={() => setModeAuth('login')}
          />
        ) : (
          <Login
            onLogin={tanganiLogin}
            onSwitchToRegister={() => setModeAuth('register')}
          />
        )}
      </main>
    </div>
  );
}
