import { useEffect, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { generateQrDataUrl, type ReceiveQrPayload } from '../../utils/qr';

const REFRESH_SECONDS = 15;

const formatRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

export default function TransferMode() {
  const user = useAuthStore((s) => s.user);
  const [amount, setAmount] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_SECONDS);
  const [activated, setActivated] = useState(false);

  const numericAmount = parseInt(amount.replace(/\D/g, ''), 10) || 0;

  const generate = useCallback(async () => {
    if (!user || numericAmount < 1000) return;
    const payload: ReceiveQrPayload = {
      type: 'panto-receive',
      userId: user.id,
      phone: user.phoneNumber,
      amount: numericAmount,
      txRef: crypto.randomUUID(),
      issuedAt: new Date().toISOString(),
    };
    const url = await generateQrDataUrl(payload, 280);
    setQrUrl(url);
    setSecondsLeft(REFRESH_SECONDS);
  }, [user, numericAmount]);

  useEffect(() => {
    if (!activated) return;
    generate();
    const refreshInterval = setInterval(generate, REFRESH_SECONDS * 1000);
    const tickInterval = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : REFRESH_SECONDS));
    }, 1000);
    return () => {
      clearInterval(refreshInterval);
      clearInterval(tickInterval);
    };
  }, [activated, generate]);

  const handleActivate = () => {
    if (numericAmount >= 1000) setActivated(true);
  };

  const handleReset = () => {
    setActivated(false);
    setQrUrl('');
    setAmount('');
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, #047857 0%, #065f46 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '70px 20px 20px',
        overflowY: 'auto',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
          Terima Transfer
        </p>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#ffffff' }}>
          QR untuk 1 Transaksi
        </h2>
      </div>

      {!activated ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 20,
            padding: 24,
            width: '100%',
            maxWidth: 320,
          }}
        >
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
            Jumlah yang ingin diterima
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              borderBottom: '2px solid #f0f2f5',
              paddingBottom: 12,
              marginBottom: 24,
            }}
          >
            <span style={{ fontSize: 22, fontWeight: 700, color: '#6b7280' }}>Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={amount ? parseInt(amount).toLocaleString('id-ID') : ''}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              autoFocus
              style={{
                flex: 1,
                fontSize: 28,
                fontWeight: 700,
                color: '#1a1a2e',
                background: 'none',
              }}
            />
          </div>
          <button
            onClick={handleActivate}
            disabled={numericAmount < 1000}
            style={{
              width: '100%',
              padding: 14,
              backgroundColor: numericAmount < 1000 ? '#a7d8c4' : '#047857',
              color: '#ffffff',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              border: 'none',
              cursor: numericAmount < 1000 ? 'default' : 'pointer',
            }}
          >
            Buat QR Transfer
          </button>
        </div>
      ) : (
        <>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 20,
              boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
              marginBottom: 16,
            }}
          >
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="Receive QR"
                style={{
                  width: 240,
                  height: 240,
                  display: 'block',
                  borderRadius: 12,
                }}
              />
            ) : (
              <div
                style={{
                  width: 240,
                  height: 240,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9ca3af',
                  fontSize: 13,
                }}
              >
                Membuat QR...
              </div>
            )}
            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: '1px solid #f0f2f5',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: 11, color: '#6b7280' }}>Jumlah</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#047857' }}>
                {formatRp(numericAmount)}
              </p>
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              padding: '8px 16px',
              borderRadius: 20,
              backdropFilter: 'blur(8px)',
              marginBottom: 12,
            }}
          >
            <p style={{ fontSize: 12, color: '#ffffff', fontWeight: 600 }}>
              Refresh dalam {secondsLeft}s
            </p>
          </div>

          <button
            onClick={handleReset}
            style={{
              padding: '10px 18px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: '#ffffff',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RefreshCw size={14} /> Ubah Jumlah
          </button>
        </>
      )}
    </div>
  );
}
