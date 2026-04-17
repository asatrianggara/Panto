import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, X } from 'lucide-react';
import WalletIcon from '../../components/WalletIcon';
import * as api from '../../api/endpoints';
import type { SmartPayResult, SplitResult, WalletProvider } from '../../types';

const formatRp = (amount: number) => 'Rp ' + amount.toLocaleString('id-ID');

const quickPicks = [
  { name: 'Kopi Kenangan', amount: 35000 },
  { name: 'Indomaret', amount: 50000 },
  { name: 'GrabFood', amount: 75000 },
];

interface PayLocationState {
  merchantName?: string;
  merchantCategory?: string;
  amount?: number;
}

export default function PayPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [merchantName, setMerchantName] = useState('');

  useEffect(() => {
    const incoming = (location.state || {}) as PayLocationState;
    if (incoming.merchantName || incoming.amount) {
      if (incoming.merchantName) setMerchantName(incoming.merchantName);
      if (incoming.amount) setAmount(String(incoming.amount));
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [smartPayResult, setSmartPayResult] = useState<SmartPayResult | null>(null);
  const [customSplits, setCustomSplits] = useState<SplitResult[]>([]);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [txResult, setTxResult] = useState<{
    id: string;
    pointsEarned: number;
    createdAt: string;
  } | null>(null);

  const numericAmount = parseInt(amount.replace(/\D/g, ''), 10) || 0;

  const handleAmountChange = (val: string) => {
    const numeric = val.replace(/\D/g, '');
    setAmount(numeric);
  };

  const handleQuickPick = (pick: { name: string; amount: number }) => {
    setAmount(String(pick.amount));
    setMerchantName(pick.name);
  };

  const handleCalculate = async () => {
    if (numericAmount < 1000) {
      setError('Minimum pembayaran Rp 1.000');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.calculateSplit(numericAmount, merchantName || 'Merchant');
      const data = res.data || res;
      setSmartPayResult(data);
      setCustomSplits(data.splits || []);
      setStep(2);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string | string[] }; status?: number } };
      const msg = axiosErr.response?.data?.message;
      const errorMsg = Array.isArray(msg) ? msg.join(', ') : msg;
      console.error('SmartPay error:', axiosErr.response?.status, axiosErr.response?.data);
      setError(errorMsg || 'Gagal menghitung split. Pastikan ada wallet aktif.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomAmount = (index: number, newAmount: string) => {
    const val = parseInt(newAmount.replace(/\D/g, ''), 10) || 0;
    setCustomSplits((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], amount: val };
      return updated;
    });
  };

  const handlePay = async () => {
    setProcessing(true);
    try {
      const splits = customSplits.map((s) => ({
        walletId: s.walletId,
        amount: s.amount,
      }));
      const res = await api.createTransaction({
        merchantName: merchantName || 'Merchant',
        totalAmount: numericAmount,
        splits,
      });
      const data = res.data || res;
      setTxResult({
        id: data.id,
        pointsEarned: data.pointsEarned || 0,
        createdAt: data.createdAt || new Date().toISOString(),
      });
      setStep(3);
    } catch {
      setError('Pembayaran gagal. Coba lagi.');
      setProcessing(false);
    }
  };

  // Step 3: Success
  if (step === 3) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', minHeight: '100vh' }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '40px auto 20px',
            animation: 'scaleIn 0.3s ease-out',
          }}
        >
          <Check size={40} color="#ffffff" strokeWidth={3} />
        </div>
        <style>{`@keyframes scaleIn { from { transform: scale(0) } to { transform: scale(1) } }`}</style>

        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#1a1a2e' }}>
          Pembayaran Berhasil!
        </h2>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: '20px',
            margin: '24px 0',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            textAlign: 'left',
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: '#6b7280' }}>Merchant</p>
            <p style={{ fontSize: 16, fontWeight: 700 }}>{merchantName || 'Merchant'}</p>
          </div>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: '#6b7280' }}>Total</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#0047bf' }}>
              {formatRp(numericAmount)}
            </p>
          </div>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: '#6b7280' }}>Waktu</p>
            <p style={{ fontSize: 14, fontWeight: 500 }}>
              {new Date(txResult?.createdAt || '').toLocaleString('id-ID')}
            </p>
          </div>

          {smartPayResult && (
            <>
              <div
                style={{
                  borderTop: '1px solid #f0f2f5',
                  paddingTop: 16,
                  marginBottom: 16,
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#6b7280' }}>
                  Split Breakdown
                </p>
                {customSplits.map((split, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <WalletIcon provider={split.provider} size={24} />
                      <span style={{ fontSize: 14 }}>
                        {split.provider.charAt(0).toUpperCase() + split.provider.slice(1)}
                      </span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                      {formatRp(split.amount)}
                    </span>
                  </div>
                ))}
              </div>

              {smartPayResult.summary.totalSaving > 0 && (
                <div
                  style={{
                    backgroundColor: '#ecfdf5',
                    borderRadius: 10,
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}
                >
                  <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>
                    Total Hemat
                  </span>
                  <span style={{ fontSize: 13, color: '#10b981', fontWeight: 700 }}>
                    {formatRp(smartPayResult.summary.totalSaving)}
                  </span>
                </div>
              )}
            </>
          )}

          {txResult && txResult.pointsEarned > 0 && (
            <div
              style={{
                backgroundColor: '#fffbeb',
                borderRadius: 10,
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 13, color: '#f59e0b', fontWeight: 600 }}>
                Poin Diperoleh
              </span>
              <span style={{ fontSize: 13, color: '#f59e0b', fontWeight: 700 }}>
                +{txResult.pointsEarned}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/')}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: '#0047bf',
            color: '#ffffff',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          Kembali ke Home
        </button>
      </div>
    );
  }

  // Processing state
  if (processing) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
        }}
      >
        <Loader2
          size={48}
          color="#0047bf"
          style={{ animation: 'spin 1s linear infinite' }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <p style={{ marginTop: 20, fontSize: 16, fontWeight: 600, color: '#1a1a2e' }}>
          Memproses pembayaran...
        </p>
        <p style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>Mohon tunggu sebentar</p>
      </div>
    );
  }

  // Step 2: SmartPay Result
  if (step === 2 && smartPayResult) {
    return (
      <div style={{ padding: '20px 16px', minHeight: '100vh' }}>
        <button
          onClick={() => setStep(1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#6b7280',
            fontSize: 14,
            marginBottom: 20,
            padding: 0,
          }}
        >
          <ArrowLeft size={18} /> Kembali
        </button>

        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 14, color: '#6b7280' }}>{merchantName || 'Merchant'}</p>
          <h2 style={{ fontSize: 28, fontWeight: 700 }}>{formatRp(numericAmount)}</h2>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: '20px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Recommended Split</h3>
            <button
              onClick={() => setIsCustomizing(!isCustomizing)}
              style={{
                fontSize: 13,
                color: '#0047bf',
                fontWeight: 600,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isCustomizing ? 'Selesai' : 'Customize'}
            </button>
          </div>

          {customSplits.map((split, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <WalletIcon provider={split.provider} size={32} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                    {split.provider.charAt(0).toUpperCase() + split.provider.slice(1)}
                  </span>
                </div>
                {isCustomizing ? (
                  <input
                    value={String(split.amount)}
                    onChange={(e) => handleCustomAmount(i, e.target.value)}
                    style={{
                      width: 100,
                      padding: '6px 10px',
                      borderRadius: 8,
                      backgroundColor: '#f0f2f5',
                      fontSize: 14,
                      fontWeight: 700,
                      textAlign: 'right',
                      color: '#1a1a2e',
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 14, fontWeight: 700 }}>
                    {formatRp(split.amount)}
                  </span>
                )}
              </div>

              {/* Percentage bar */}
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#f0f2f5',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${numericAmount > 0 ? (split.amount / numericAmount) * 100 : 0}%`,
                    backgroundColor: '#0047bf',
                    borderRadius: 3,
                    transition: 'width 0.3s',
                  }}
                />
              </div>
              <p style={{ fontSize: 11, color: '#6b7280', marginTop: 2, textAlign: 'right' }}>
                {numericAmount > 0 ? ((split.amount / numericAmount) * 100).toFixed(0) : 0}%
                {split.promo && (
                  <span style={{ color: '#10b981', marginLeft: 8 }}>
                    Promo: {split.promo}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: '16px 20px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 14, color: '#6b7280' }}>Total</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>
              {formatRp(smartPayResult.summary.totalAmount)}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 14, color: '#6b7280' }}>Fee</span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: smartPayResult.summary.totalFee === 0 ? '#10b981' : '#1a1a2e',
              }}
            >
              {smartPayResult.summary.totalFee === 0
                ? 'GRATIS'
                : formatRp(smartPayResult.summary.totalFee)}
            </span>
          </div>
          {smartPayResult.summary.totalSaving > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: '#10b981', fontWeight: 600 }}>Hemat</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>
                {formatRp(smartPayResult.summary.totalSaving)}
              </span>
            </div>
          )}
        </div>

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

        <button
          onClick={handlePay}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: '#0047bf',
            color: '#ffffff',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          Bayar {formatRp(numericAmount)}
        </button>
      </div>
    );
  }

  // Step 1: Enter Payment
  return (
    <div style={{ padding: '20px 16px', minHeight: '100vh' }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#6b7280',
          fontSize: 14,
          marginBottom: 20,
          padding: 0,
        }}
      >
        <ArrowLeft size={18} /> Kembali
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Pembayaran Baru</h1>

      {/* Amount Input */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 16,
          padding: '20px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <label
            style={{
              fontSize: 11,
              color: '#6b7280',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
            }}
          >
            Jumlah Pembayaran
          </label>
          {amount && (
            <button
              type="button"
              onClick={() => setAmount('')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                color: '#6b7280',
                fontWeight: 600,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 6px',
              }}
            >
              <X size={12} /> Hapus
            </button>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 6,
            borderBottom: '2px solid #f0f2f5',
            paddingBottom: 8,
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 700, color: '#6b7280' }}>Rp</span>
          <input
            type="text"
            value={amount ? parseInt(amount, 10).toLocaleString('id-ID') : ''}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0"
            inputMode="numeric"
            autoComplete="off"
            style={{
              flex: 1,
              fontSize: 30,
              fontWeight: 700,
              color: '#1a1a2e',
              background: 'none',
              padding: 0,
              border: 'none',
              outline: 'none',
              minWidth: 0,
            }}
          />
        </div>
      </div>

      {/* Merchant Name */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 16,
          padding: '14px 20px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          marginBottom: 16,
        }}
      >
        <label
          style={{
            fontSize: 11,
            color: '#6b7280',
            fontWeight: 600,
            display: 'block',
            marginBottom: 4,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
          }}
        >
          Nama Merchant
        </label>
        <input
          type="text"
          value={merchantName}
          onChange={(e) => setMerchantName(e.target.value)}
          placeholder="Ketik nama merchant (opsional)"
          autoComplete="off"
          style={{
            width: '100%',
            fontSize: 16,
            fontWeight: 600,
            color: '#1a1a2e',
            background: 'none',
            padding: 0,
            border: 'none',
            outline: 'none',
          }}
        />
      </div>

      {/* Quick Picks */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {quickPicks.map((pick) => (
          <button
            key={pick.name}
            onClick={() => handleQuickPick(pick)}
            style={{
              padding: '8px 14px',
              backgroundColor: '#ffffff',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 500,
              color: '#1a1a2e',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
            }}
          >
            {pick.name}
          </button>
        ))}
      </div>

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

      <button
        onClick={handleCalculate}
        disabled={loading || numericAmount < 1}
        style={{
          width: '100%',
          padding: '16px',
          backgroundColor: loading || numericAmount < 1 ? '#93b4e8' : '#0047bf',
          color: '#ffffff',
          borderRadius: 12,
          fontSize: 16,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {loading ? (
          <>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            Menghitung...
          </>
        ) : (
          'Find Best Split'
        )}
      </button>
    </div>
  );
}
