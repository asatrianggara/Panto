import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';
import * as api from '../../api/endpoints';
import {
  generateQrDataUrl,
  downloadQrImage,
  type MerchantQrPayload,
} from '../../utils/qr';

interface MerchantData {
  id: string;
  name: string;
  category: string;
  defaultBill: number | null;
  logoEmoji: string;
  qrPayload: MerchantQrPayload;
}

interface Props {
  onClose: () => void;
}

const formatRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

export default function MerchantGenerator({ onClose }: Props) {
  const [merchants, setMerchants] = useState<MerchantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    api
      .getMerchants()
      .then((res) => {
        const data = res.data || res;
        setMerchants(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (merchant: MerchantData) => {
    setDownloadingId(merchant.id);
    try {
      const dataUrl = await generateQrDataUrl(merchant.qrPayload, 512);
      const safeName = merchant.name.replace(/\s+/g, '-').toLowerCase();
      downloadQrImage(dataUrl, `panto-qr-${safeName}.png`);
    } finally {
      setTimeout(() => setDownloadingId(null), 600);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px 20px 0 0',
          width: '100%',
          maxWidth: 430,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '20px 20px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f2f5',
          }}
        >
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>Demo QR Merchant</h3>
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              Download lalu scan untuk simulasi pembayaran
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={22} color="#6b7280" />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: 16 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
              Memuat merchant...
            </div>
          ) : (
            merchants.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: '#f8faff',
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    border: '1px solid #e5e7eb',
                  }}
                >
                  {m.logoEmoji || '🏬'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{m.name}</p>
                  <p style={{ fontSize: 12, color: '#6b7280' }}>
                    {m.defaultBill ? formatRp(m.defaultBill) : 'Open bill'} · {m.category}
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(m)}
                  disabled={downloadingId === m.id}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#0047bf',
                    color: '#ffffff',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Download size={14} />
                  {downloadingId === m.id ? 'OK' : 'QR'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
