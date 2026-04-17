import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Sparkles } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { parseQrPayload, type MerchantQrPayload } from '../../utils/qr';

interface Props {
  onScanSuccess: (payload: MerchantQrPayload) => void;
  onOpenGenerator: () => void;
}

const SCANNER_ID = 'panto-qr-scanner';

export default function ScanMode({ onScanSuccess, onOpenGenerator }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let scanner: Html5Qrcode | null = null;

    try {
      scanner = new Html5Qrcode(SCANNER_ID, { verbose: false });
      scannerRef.current = scanner;
    } catch (e) {
      setError('Gagal inisialisasi scanner kamera');
      setStarting(false);
      return;
    }

    const handleDecoded = (decodedText: string) => {
      const payload = parseQrPayload(decodedText);
      if (payload && payload.type === 'panto-merchant') {
        scanner
          ?.stop()
          .catch(() => {})
          .finally(() => onScanSuccess(payload));
      }
    };

    const config = {
      fps: 10,
      qrbox: { width: 240, height: 240 },
      aspectRatio: 1.0,
    };

    const tryStart = async () => {
      try {
        await scanner!.start({ facingMode: 'environment' }, config, handleDecoded, () => {});
        if (!cancelled) setStarting(false);
      } catch {
        try {
          await scanner!.start({ facingMode: 'user' }, config, handleDecoded, () => {});
          if (!cancelled) setStarting(false);
        } catch (err: unknown) {
          if (!cancelled) {
            const msg = (err as { message?: string })?.message || '';
            setError(
              msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')
                ? 'Izinkan akses kamera untuk scan QR'
                : 'Tidak dapat mengakses kamera. Pakai gallery upload.',
            );
            setStarting(false);
          }
        }
      }
    };

    tryStart();

    return () => {
      cancelled = true;
      const s = scanner;
      if (!s) return;
      try {
        if (s.isScanning) {
          s.stop().catch(() => {});
        }
      } catch {
        /* ignore */
      }
    };
  }, [onScanSuccess]);

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');

    const fileScannerId = `file-scanner-${Date.now()}`;
    const tempDiv = document.createElement('div');
    tempDiv.id = fileScannerId;
    tempDiv.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;';
    document.body.appendChild(tempDiv);

    const fileScanner = new Html5Qrcode(fileScannerId, { verbose: false });
    try {
      const result = await fileScanner.scanFile(file, false);
      const payload = parseQrPayload(result);
      if (payload && payload.type === 'panto-merchant') {
        onScanSuccess(payload);
      } else {
        setError('QR terbaca tapi bukan format Panto Merchant');
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || String(err);
      setError(`QR tidak terbaca: ${msg.slice(0, 60)}`);
    } finally {
      try {
        fileScanner.clear();
      } catch {
        /* ignore */
      }
      document.body.removeChild(tempDiv);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: '#000000',
        overflow: 'hidden',
      }}
    >
      <style>{`
        #${SCANNER_ID} {
          width: 100% !important;
          height: 100% !important;
          border: none !important;
          padding: 0 !important;
        }
        #${SCANNER_ID} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          display: block !important;
        }
        #${SCANNER_ID} > div, #${SCANNER_ID} > img {
          display: none !important;
        }
      `}</style>

      <div
        id={SCANNER_ID}
        style={{
          position: 'absolute',
          inset: 0,
        }}
      />

      {/* Overlay frame */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        <div
          style={{
            width: 240,
            height: 240,
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: 24,
            position: 'relative',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
          }}
        >
          {/* corner brackets */}
          {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((c) => {
            const isTop = c.startsWith('top');
            const isLeft = c.endsWith('left');
            return (
              <div
                key={c}
                style={{
                  position: 'absolute',
                  width: 30,
                  height: 30,
                  borderColor: '#0047bf',
                  borderStyle: 'solid',
                  borderWidth: 0,
                  borderTopWidth: isTop ? 4 : 0,
                  borderBottomWidth: isTop ? 0 : 4,
                  borderLeftWidth: isLeft ? 4 : 0,
                  borderRightWidth: isLeft ? 0 : 4,
                  borderTopLeftRadius: isTop && isLeft ? 16 : 0,
                  borderTopRightRadius: isTop && !isLeft ? 16 : 0,
                  borderBottomLeftRadius: !isTop && isLeft ? 16 : 0,
                  borderBottomRightRadius: !isTop && !isLeft ? 16 : 0,
                  top: isTop ? -2 : 'auto',
                  bottom: isTop ? 'auto' : -2,
                  left: isLeft ? -2 : 'auto',
                  right: isLeft ? 'auto' : -2,
                }}
              />
            );
          })}
        </div>
      </div>

      {starting && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: 14,
            zIndex: 10,
            backgroundColor: '#000000',
          }}
        >
          Mengaktifkan kamera...
        </div>
      )}

      {/* Bottom helper text + actions */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          padding: '0 20px',
          zIndex: 10,
        }}
      >
        <p
          style={{
            color: '#ffffff',
            fontSize: 13,
            textAlign: 'center',
            textShadow: '0 1px 4px rgba(0,0,0,0.5)',
          }}
        >
          Arahkan kamera ke QR Code merchant
        </p>

        {error && (
          <div
            style={{
              backgroundColor: 'rgba(239,68,68,0.9)',
              color: '#ffffff',
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Pilih dari galeri"
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
            }}
          >
            <ImageIcon size={20} color="#ffffff" />
          </button>

          <button
            onClick={onOpenGenerator}
            style={{
              padding: '12px 18px',
              backgroundColor: '#0047bf',
              color: '#ffffff',
              borderRadius: 24,
              fontSize: 13,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(0,71,191,0.5)',
            }}
          >
            <Sparkles size={16} />
            Generate Demo QR
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFilePick}
      />
    </div>
  );
}
