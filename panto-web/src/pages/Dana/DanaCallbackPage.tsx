import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import * as api from '../../api/endpoints';

export default function DanaCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const error = params.get('error');
    const accessToken = params.get('accessToken');
    const tokenId = params.get('tokenId');
    const phone = localStorage.getItem('dana_binding_phone') || '';

    if (error) {
      setStatus('error');
      setMessage(
        error === 'no_auth_code'
          ? 'DANA tidak mengirimkan kode otorisasi'
          : 'Gagal menghubungkan akun DANA',
      );
      return;
    }

    if (accessToken) {
      api
        .danaCompleteBind(accessToken, tokenId || '', phone)
        .then(() => {
          setStatus('success');
          setMessage('Akun DANA berhasil dihubungkan!');
          localStorage.removeItem('dana_binding_phone');
        })
        .catch(() => {
          setStatus('error');
          setMessage('Gagal menyimpan koneksi DANA');
        });
    } else {
      setStatus('error');
      setMessage('Parameter tidak lengkap');
    }
  }, [params]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        textAlign: 'center',
      }}
    >
      {status === 'loading' && (
        <>
          <Loader2
            size={48}
            color="#108ee9"
            style={{ animation: 'spin 1s linear infinite', marginBottom: 20 }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#1a1a2e' }}>
            Menghubungkan akun DANA...
          </p>
        </>
      )}

      {status === 'success' && (
        <>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              backgroundColor: '#108ee9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <CheckCircle size={36} color="#ffffff" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{message}</h2>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
            Saldo DANA kamu sekarang termasuk di SmartPay
          </p>
          <button
            onClick={() => navigate('/wallets', { replace: true })}
            style={{
              padding: '14px 32px',
              backgroundColor: '#108ee9',
              color: '#ffffff',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Lihat Dompet
          </button>
        </>
      )}

      {status === 'error' && (
        <>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <XCircle size={36} color="#ef4444" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Gagal Menghubungkan
          </h2>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>{message}</p>
          <button
            onClick={() => navigate('/wallets', { replace: true })}
            style={{
              padding: '14px 32px',
              backgroundColor: '#0047bf',
              color: '#ffffff',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Kembali ke Dompet
          </button>
        </>
      )}
    </div>
  );
}
