import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { generateQrDataUrl, type UserQrPayload } from '../../utils/qr';

const REFRESH_SECONDS = 60;

export default function PayMode() {
  const user = useAuthStore((s) => s.user);
  const [qrUrl, setQrUrl] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_SECONDS);

  useEffect(() => {
    if (!user) return;

    const generate = async () => {
      const payload: UserQrPayload = {
        type: 'panto-user',
        userId: user.id,
        phone: user.phoneNumber,
        issuedAt: new Date().toISOString(),
        ttl: REFRESH_SECONDS,
      };
      const url = await generateQrDataUrl(payload, 280);
      setQrUrl(url);
      setSecondsLeft(REFRESH_SECONDS);
    };

    generate();
    const refreshInterval = setInterval(generate, REFRESH_SECONDS * 1000);
    const tickInterval = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : REFRESH_SECONDS));
    }, 1000);

    return () => {
      clearInterval(refreshInterval);
      clearInterval(tickInterval);
    };
  }, [user]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, #0047bf 0%, #0035a0 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px 20px',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
          Tunjukkan ke kasir
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#ffffff' }}>
          {user?.name || 'Demo User'}
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
          {user?.phoneNumber}
        </p>
      </div>

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 24,
          padding: 24,
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
        }}
      >
        {qrUrl ? (
          <img
            src={qrUrl}
            alt="User QR"
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
              backgroundColor: '#f0f2f5',
              borderRadius: 12,
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
      </div>

      <div
        style={{
          marginTop: 20,
          backgroundColor: 'rgba(255,255,255,0.15)',
          padding: '8px 16px',
          borderRadius: 20,
          backdropFilter: 'blur(8px)',
        }}
      >
        <p style={{ fontSize: 12, color: '#ffffff', fontWeight: 600 }}>
          Refresh dalam {secondsLeft}s
        </p>
      </div>
    </div>
  );
}
