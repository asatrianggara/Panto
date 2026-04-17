import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ScanLine, QrCode, ArrowDownLeft } from 'lucide-react';
import ScanMode from './ScanMode';
import PayMode from './PayMode';
import TransferMode from './TransferMode';
import MerchantGenerator from './MerchantGenerator';
import type { MerchantQrPayload } from '../../utils/qr';

type Tab = 'scan' | 'bayar' | 'transfer';

export default function ScanQRPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('scan');
  const [showGenerator, setShowGenerator] = useState(false);

  const handleScanSuccess = (payload: MerchantQrPayload) => {
    navigate('/pay', {
      state: {
        merchantName: payload.merchantName,
        merchantCategory: payload.merchantCategory,
        amount: payload.totalBill || undefined,
      },
    });
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'scan', label: 'Scan', icon: ScanLine },
    { id: 'bayar', label: 'Bayar', icon: QrCode },
    { id: 'transfer', label: 'Transfer', icon: ArrowDownLeft },
  ];

  return (
    <div
      style={{
        backgroundColor: '#000000',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: 'none',
            borderRadius: '50%',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={20} color="#ffffff" />
        </button>
        <span
          style={{
            color: '#ffffff',
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          {tab === 'scan' ? 'Scan QR' : tab === 'bayar' ? 'Tunjukkan QR' : 'Terima Transfer'}
        </span>
        <div style={{ width: 36 }} />
      </div>

      {/* Main content area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {tab === 'scan' && (
          <ScanMode
            onScanSuccess={handleScanSuccess}
            onOpenGenerator={() => setShowGenerator(true)}
          />
        )}
        {tab === 'bayar' && <PayMode />}
        {tab === 'transfer' && <TransferMode />}
      </div>

      {/* Bottom tab bar */}
      <div
        style={{
          backgroundColor: '#0a0a14',
          padding: '12px 20px 24px',
          display: 'flex',
          justifyContent: 'space-around',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                borderRadius: 12,
                transition: 'all 0.2s',
                opacity: active ? 1 : 0.5,
              }}
            >
              <Icon size={22} color={active ? '#ffffff' : '#9ca3af'} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: active ? 700 : 500,
                  color: active ? '#ffffff' : '#9ca3af',
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Merchant Generator Modal */}
      {showGenerator && <MerchantGenerator onClose={() => setShowGenerator(false)} />}
    </div>
  );
}
