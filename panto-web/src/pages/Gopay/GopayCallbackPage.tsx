import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import * as api from '../../api/endpoints';

export default function GopayCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const error = params.get('error');
    const accountId = params.get('accountId');
    const phone = localStorage.getItem('gopay_binding_phone') ?? '';

    if (error) {
      setStatus('error');
      setMessage(
        error === 'no_account_id'
          ? 'Midtrans tidak mengirimkan account ID'
          : error === 'binding_failed'
            ? 'Binding dibatalkan atau ditolak oleh GoPay'
            : 'Gagal menghubungkan akun GoPay',
      );
      return;
    }

    if (!accountId) {
      setStatus('error');
      setMessage('Parameter tidak lengkap dari Midtrans');
      return;
    }

    api
      .gopayCompleteBind(accountId, phone)
      .then(() => {
        setStatus('success');
        setMessage('Akun GoPay berhasil dihubungkan!');
        localStorage.removeItem('gopay_binding_phone');
      })
      .catch(() => {
        setStatus('error');
        setMessage('Gagal menyimpan koneksi GoPay. Coba hubungkan ulang.');
      });
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
        background: 'linear-gradient(160deg, #f0fff4 0%, #ffffff 60%)',
      }}
    >
      {status === 'loading' && (
        <>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              backgroundColor: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <Loader2
              size={36}
              color="#00AA13"
              style={{ animation: 'spin 1s linear infinite' }}
            />
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>
            Menghubungkan akun GoPay...
          </h2>
          <p style={{ fontSize: 14, color: '#6b7280' }}>
            Sedang memverifikasi dan mengambil saldo
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
              backgroundColor: '#00AA13',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <CheckCircle size={36} color="#ffffff" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{message}</h2>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 28 }}>
            Saldo GoPay kamu sekarang termasuk di SmartPay
          </p>
          <button
            onClick={() => navigate('/wallets', { replace: true })}
            style={{
              padding: '14px 32px',
              backgroundColor: '#00AA13',
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
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 28 }}>{message}</p>
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
