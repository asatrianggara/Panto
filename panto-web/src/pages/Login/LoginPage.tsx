import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import * as api from '../../api/endpoints';

export default function LoginPage() {
  const navigate = useNavigate();
  const loginStore = useAuthStore((s) => s.login);
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let data;
      if (isRegister) {
        data = await api.register(phone, name, pin);
      } else {
        data = await api.login(phone, pin);
      }
      const result = data.data || data;
      loginStore(result.accessToken || result.token, result.user);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(
        axiosErr.response?.data?.message ||
          (isRegister ? 'Gagal mendaftar. Coba lagi.' : 'Nomor HP atau PIN salah.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        background: 'linear-gradient(180deg, #0047bf 0%, #0047bf 35%, #f0f2f5 35%)',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1
          style={{
            fontSize: 42,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: -1,
          }}
        >
          Panto
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
          Smart Payment Aggregator
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 380,
          backgroundColor: '#ffffff',
          borderRadius: 16,
          padding: '32px 24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, color: '#1a1a2e' }}>
          {isRegister ? 'Daftar Akun' : 'Masuk'}
        </h2>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              borderRadius: 10,
              color: '#ef4444',
              fontSize: 14,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {isRegister && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>
              Nama Lengkap
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                backgroundColor: '#f0f2f5',
                borderRadius: 12,
                fontSize: 16,
                color: '#1a1a2e',
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>
            Nomor Telepon
          </label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f0f2f5',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                padding: '14px 0 14px 16px',
                fontSize: 16,
                color: '#6b7280',
                fontWeight: 600,
              }}
            >
              +62
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="08123456789"
              required
              style={{
                flex: 1,
                padding: '14px 16px 14px 8px',
                backgroundColor: 'transparent',
                fontSize: 16,
                color: '#1a1a2e',
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>
            PIN (6 digit)
          </label>
          <input
            type="password"
            value={pin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              if (val.length <= 6) setPin(val);
            }}
            placeholder="------"
            required
            maxLength={6}
            inputMode="numeric"
            style={{
              width: '100%',
              padding: '14px 16px',
              backgroundColor: '#f0f2f5',
              borderRadius: 12,
              fontSize: 24,
              letterSpacing: 12,
              textAlign: 'center',
              color: '#1a1a2e',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: loading ? '#93b4e8' : '#0047bf',
            color: '#ffffff',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 700,
            transition: 'background-color 0.2s',
          }}
        >
          {loading ? 'Memproses...' : isRegister ? 'Daftar' : 'Masuk'}
        </button>

        <p
          style={{
            textAlign: 'center',
            marginTop: 20,
            fontSize: 14,
            color: '#6b7280',
          }}
        >
          {isRegister ? 'Sudah punya akun? ' : 'Belum punya akun? '}
          <span
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            style={{ color: '#0047bf', fontWeight: 600, cursor: 'pointer' }}
          >
            {isRegister ? 'Masuk' : 'Daftar'}
          </span>
        </p>
      </form>
    </div>
  );
}
