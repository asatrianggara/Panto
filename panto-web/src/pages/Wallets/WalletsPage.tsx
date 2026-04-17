import { useState, useEffect, useCallback } from 'react';
import { Plus, X, RefreshCw, ExternalLink, Unlink, Shield, Loader2 } from 'lucide-react';
import WalletIcon from '../../components/WalletIcon';
import * as api from '../../api/endpoints';
import type { Wallet, WalletProvider } from '../../types';

const formatRp = (amount: number) => 'Rp ' + amount.toLocaleString('id-ID');

const providerNames: Record<WalletProvider, string> = {
  gopay: 'GoPay',
  ovo: 'OVO',
  dana: 'DANA',
  shopeepay: 'ShopeePay',
  linkaja: 'LinkAja',
};

const providerOptions: WalletProvider[] = ['gopay', 'ovo', 'dana', 'shopeepay', 'linkaja'];

export default function WalletsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkProvider, setLinkProvider] = useState<WalletProvider>('gopay');
  const [linkPhone, setLinkPhone] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [editingBalance, setEditingBalance] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState('');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [showGopayBind, setShowGopayBind] = useState(false);
  const [gopayBindPhone, setGopayBindPhone] = useState('');
  const [gopayBindLoading, setGopayBindLoading] = useState(false);
  const [gopayBindStep, setGopayBindStep] = useState<'phone' | 'auth' | 'waiting' | 'done'>('phone');
  const [gopayAuthUrl, setGopayAuthUrl] = useState('');
  const [showDanaBind, setShowDanaBind] = useState(false);
  const [danaBindPhone, setDanaBindPhone] = useState('');
  const [danaBindLoading, setDanaBindLoading] = useState(false);
  const [danaBindStep, setDanaBindStep] = useState<'phone' | 'auth' | 'authcode' | 'done'>('phone');
  const [danaUnlinking, setDanaUnlinking] = useState(false);
  const [gopayUnlinking, setGopayUnlinking] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [danaAuthCode, setDanaAuthCode] = useState('');
  const [danaAuthUrl, setDanaAuthUrl] = useState('');

  const fetchWallets = useCallback(async () => {
    try {
      const res = await api.getWallets();
      const data = res.data || res;
      setWallets(Array.isArray(data) ? data : data.wallets || []);
    } catch {
      setError('Gagal memuat dompet');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const totalBalance = wallets.reduce((sum, w) => sum + (w.isActive ? w.balance : 0), 0);
  const danaWallet = wallets.find((w) => w.provider === 'dana');
  const hasDana = !!danaWallet;
  const gopayWallet = wallets.find((w) => w.provider === 'gopay');
  const hasGopay = !!gopayWallet;

  const handleLink = async () => {
    if (!linkPhone) return;
    setLinkLoading(true);
    try {
      await api.linkWallet(linkProvider, linkPhone);
      setShowLinkModal(false);
      setLinkPhone('');
      fetchWallets();
    } catch {
      setError('Gagal menghubungkan wallet');
    } finally {
      setLinkLoading(false);
    }
  };

  const handleToggleRouting = async (wallet: Wallet) => {
    try {
      await api.updateWallet(wallet.id, { inRouting: !wallet.inRouting });
      setWallets((prev) =>
        prev.map((w) => (w.id === wallet.id ? { ...w, inRouting: !w.inRouting } : w))
      );
    } catch {
      setError('Gagal mengubah routing');
    }
  };

  const handleSync = async (wallet: Wallet) => {
    setSyncingId(wallet.id);
    const randomBalance = Math.floor(Math.random() * (500000 - 900 + 1)) + 900;
    try {
      await api.updateWallet(wallet.id, { balance: randomBalance });
      setWallets((prev) =>
        prev.map((w) => (w.id === wallet.id ? { ...w, balance: randomBalance } : w))
      );
    } catch {
      setError('Gagal menyinkronkan saldo');
    } finally {
      setTimeout(() => setSyncingId(null), 600);
    }
  };

  const handleBalanceSave = async (walletId: string) => {
    const amount = parseInt(editValue.replace(/\D/g, ''), 10);
    if (isNaN(amount)) return;
    try {
      await api.updateWallet(walletId, { balance: amount });
      setWallets((prev) =>
        prev.map((w) => (w.id === walletId ? { ...w, balance: amount } : w))
      );
    } catch {
      setError('Gagal mengubah saldo');
    }
    setEditingBalance(null);
  };

  // ────────────────────────────
  // GoPay Binding Flow
  // ────────────────────────────

  const handleGopayBind = async () => {
    if (!gopayBindPhone) return;
    setGopayBindLoading(true);
    setError('');
    try {
      const res = await api.gopayStartBind(gopayBindPhone);
      const data = res.data || res;

      if (data.mode === 'real' && data.authUrl) {
        localStorage.setItem('gopay_binding_phone', gopayBindPhone);
        setGopayAuthUrl(data.authUrl);
        window.open(data.authUrl, '_blank');
        setGopayBindStep('waiting');
        setGopayBindLoading(false);
        return;
      }

      // Simulation mode — no credentials configured
      setGopayBindStep('auth');
      await new Promise((r) => setTimeout(r, 1800));
      await api.gopaySimulateBind(gopayBindPhone);
      setGopayBindStep('done');
      fetchWallets();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Gagal menghubungkan GoPay');
      setGopayBindStep('phone');
    } finally {
      setGopayBindLoading(false);
    }
  };

  // ────────────────────────────
  // DANA Binding Flow
  // ────────────────────────────

  const handleDanaBind = async () => {
    if (!danaBindPhone) return;
    setDanaBindLoading(true);
    setError('');

    try {
      const res = await api.danaStartBind(danaBindPhone);
      const data = res.data || res;

      if (data.mode === 'real' && data.authUrl) {
        setDanaAuthUrl(data.authUrl);
        setDanaBindStep('auth');
        // Open DANA auth in new tab (redirect goes to webhook.site)
        window.open(data.authUrl, '_blank');
        // After a short delay, show authCode input
        setTimeout(() => setDanaBindStep('authcode'), 2000);
        setDanaBindLoading(false);
        return;
      }

      // Simulation mode
      setDanaBindStep('auth');
      await new Promise((r) => setTimeout(r, 2000));
      await api.danaSimulateBind(danaBindPhone);
      setDanaBindStep('done');
      fetchWallets();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg || 'Gagal menghubungkan DANA');
      setDanaBindStep('phone');
    } finally {
      setDanaBindLoading(false);
    }
  };

  const handleDanaAuthCodeSubmit = async () => {
    if (!danaAuthCode.trim()) return;
    setDanaBindLoading(true);
    setError('');
    try {
      await api.danaCompleteBind(danaAuthCode.trim(), '', danaBindPhone);
      setDanaBindStep('done');
      fetchWallets();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg || 'Gagal menyelesaikan binding DANA');
    } finally {
      setDanaBindLoading(false);
    }
  };

  const handleDanaUnlink = async () => {
    setDanaUnlinking(true);
    try {
      await api.danaUnbind();
      fetchWallets();
    } catch {
      setError('Gagal memutuskan DANA');
    } finally {
      setDanaUnlinking(false);
    }
  };

  const handleGopayUnlink = async () => {
    setGopayUnlinking(true);
    try {
      await api.gopayUnbind();
      fetchWallets();
    } catch {
      setError('Gagal memutuskan GoPay');
    } finally {
      setGopayUnlinking(false);
    }
  };

  const handleUnlinkWallet = async (wallet: Wallet) => {
    setUnlinkingId(wallet.id);
    try {
      await api.unlinkWallet(wallet.id);
      fetchWallets();
    } catch {
      setError('Gagal memutuskan wallet');
    } finally {
      setUnlinkingId(null);
    }
  };

  const handleDanaSyncBalance = async () => {
    if (!danaWallet) return;
    setSyncingId(danaWallet.id);
    try {
      const res = await api.danaGetBalance();
      const data = res.data || res;
      setWallets((prev) =>
        prev.map((w) =>
          w.id === danaWallet.id ? { ...w, balance: data.balance } : w
        )
      );
    } catch {
      // Fallback: randomize like other wallets
      const randomBalance = Math.floor(Math.random() * (500000 - 900 + 1)) + 900;
      try {
        await api.updateWallet(danaWallet.id, { balance: randomBalance });
        setWallets((prev) =>
          prev.map((w) =>
            w.id === danaWallet.id ? { ...w, balance: randomBalance } : w
          )
        );
      } catch { /* ignore */ }
    } finally {
      setTimeout(() => setSyncingId(null), 600);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center', paddingTop: 100 }}>
        <div
          style={{
            width: 40, height: 40,
            border: '3px solid #e5e7eb', borderTopColor: '#0047bf',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite',
            margin: '0 auto',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 16px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Dompet Digital</h1>

      {error && (
        <div
          style={{
            padding: '10px 14px', backgroundColor: '#fef2f2',
            borderRadius: 10, color: '#ef4444', fontSize: 14, marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* Total Balance Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0047bf 0%, #0035a0 100%)',
          borderRadius: 16, padding: '20px', marginBottom: 20,
          boxShadow: '0 4px 16px rgba(0,71,191,0.25)',
        }}
      >
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Total Saldo</p>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#ffffff', marginTop: 4 }}>
          {formatRp(totalBalance)}
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
          {wallets.filter((w) => w.isActive).length} dompet aktif
        </p>
      </div>

      {/* ══════════════════════════════════════════
          GOPAY SECTION
          ══════════════════════════════════════════ */}
      {!hasGopay ? (
        <GopayBindCard
          show={showGopayBind}
          onToggle={() => { setShowGopayBind(!showGopayBind); setGopayBindStep('phone'); setError(''); }}
          phone={gopayBindPhone}
          setPhone={setGopayBindPhone}
          step={gopayBindStep}
          loading={gopayBindLoading}
          authUrl={gopayAuthUrl}
          onBind={handleGopayBind}
          onCheckStatus={() => { fetchWallets(); setGopayBindStep('phone'); setShowGopayBind(false); }}
        />
      ) : (
        <WalletCard
          wallet={gopayWallet}
          syncing={syncingId === gopayWallet.id}
          unlinking={gopayUnlinking}
          editingBalance={editingBalance}
          editValue={editValue}
          onSync={() => handleSync(gopayWallet)}
          onToggleRouting={() => handleToggleRouting(gopayWallet)}
          onStartEdit={() => { setEditingBalance(gopayWallet.id); setEditValue(String(gopayWallet.balance)); }}
          onEditChange={setEditValue}
          onEditSave={() => handleBalanceSave(gopayWallet.id)}
          onEditCancel={() => setEditingBalance(null)}
          onUnlink={handleGopayUnlink}
        />
      )}

      {/* ══════════════════════════════════════════
          DANA SECTION
          ══════════════════════════════════════════ */}
      {!hasDana ? (
        <DanaBindCard
          show={showDanaBind}
          onToggle={() => { setShowDanaBind(!showDanaBind); setDanaBindStep('phone'); setError(''); }}
          phone={danaBindPhone}
          setPhone={setDanaBindPhone}
          step={danaBindStep}
          loading={danaBindLoading}
          onBind={handleDanaBind}
          authCode={danaAuthCode}
          setAuthCode={setDanaAuthCode}
          onAuthCodeSubmit={handleDanaAuthCodeSubmit}
          authUrl={danaAuthUrl}
        />
      ) : (
        <DanaLinkedCard
          wallet={danaWallet}
          syncing={syncingId === danaWallet.id}
          unlinking={danaUnlinking}
          onSync={handleDanaSyncBalance}
          onUnlink={handleDanaUnlink}
          onToggleRouting={() => handleToggleRouting(danaWallet)}
        />
      )}

      {/* ══════════════════════════════════════════
          OTHER WALLETS
          ══════════════════════════════════════════ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {wallets
          .filter((w) => w.provider !== 'dana' && w.provider !== 'gopay')
          .map((wallet) => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              syncing={syncingId === wallet.id}
              unlinking={unlinkingId === wallet.id}
              editingBalance={editingBalance}
              editValue={editValue}
              onSync={() => handleSync(wallet)}
              onToggleRouting={() => handleToggleRouting(wallet)}
              onStartEdit={() => { setEditingBalance(wallet.id); setEditValue(String(wallet.balance)); }}
              onEditChange={setEditValue}
              onEditSave={() => handleBalanceSave(wallet.id)}
              onEditCancel={() => setEditingBalance(null)}
              onUnlink={() => handleUnlinkWallet(wallet)}
            />
          ))}
      </div>

      {/* Link Wallet Button */}
      <button
        onClick={() => setShowLinkModal(true)}
        style={{
          width: '100%', padding: '14px', backgroundColor: '#0047bf',
          color: '#ffffff', borderRadius: 12, fontSize: 15, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, border: 'none', cursor: 'pointer',
        }}
      >
        <Plus size={18} />
        Hubungkan Wallet Lain
      </button>

      {/* Generic Link Modal (non-DANA) */}
      {showLinkModal && (
        <LinkModal
          provider={linkProvider}
          setProvider={(p) => {
            if (p === 'dana') {
              setShowLinkModal(false);
              setShowDanaBind(true);
              return;
            }
            setLinkProvider(p);
          }}
          phone={linkPhone}
          setPhone={setLinkPhone}
          loading={linkLoading}
          onLink={handleLink}
          onClose={() => setShowLinkModal(false)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
 * GoPay Bind Card — shown when GoPay is NOT linked
 * ══════════════════════════════════════════════ */
function GopayBindCard({
  show, onToggle, phone, setPhone, step, loading, authUrl, onBind, onCheckStatus,
}: {
  show: boolean;
  onToggle: () => void;
  phone: string;
  setPhone: (v: string) => void;
  step: 'phone' | 'auth' | 'waiting' | 'done';
  loading: boolean;
  authUrl: string;
  onBind: () => void;
  onCheckStatus: () => void;
}) {
  return (
    <div
      style={{
        borderRadius: 16, marginBottom: 16, overflow: 'hidden',
        border: '2px dashed #00AA13',
        backgroundColor: show ? '#f0fff4' : '#f7fdf7',
        transition: 'all 0.2s',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          gap: 12, padding: 16, background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <WalletIcon provider="gopay" size={44} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>
            Hubungkan GoPay
          </p>
          <p style={{ fontSize: 12, color: '#6b7280' }}>
            Link akun GoPay untuk split payment otomatis
          </p>
        </div>
        <ExternalLink size={18} color="#00AA13" />
      </button>

      {show && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ borderTop: '1px solid #bbf7d0', paddingTop: 14 }}>

            {step === 'phone' && (
              <>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 12px', backgroundColor: '#dcfce7',
                    borderRadius: 10, marginBottom: 14,
                  }}
                >
                  <Shield size={16} color="#00AA13" />
                  <p style={{ fontSize: 11, color: '#166534', fontWeight: 600, lineHeight: 1.4 }}>
                    Panto akan terhubung ke akun GoPay kamu. Data kamu aman dan terenkripsi.
                  </p>
                </div>

                {/* Placeholder deep-link button */}
                <a
                  href="https://www.gojek.com/gopay"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    width: '100%', padding: '10px', marginBottom: 14,
                    backgroundColor: '#dcfce7', borderRadius: 10,
                    fontSize: 12, fontWeight: 700, color: '#00AA13',
                    border: '1px solid #bbf7d0', textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={14} /> Buka Halaman GoPay
                </a>

                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>
                  Nomor HP terdaftar di GoPay
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="08123456789"
                  style={{
                    width: '100%', padding: '12px 14px', backgroundColor: '#ffffff',
                    borderRadius: 10, fontSize: 15, color: '#1a1a2e',
                    border: '1px solid #bbf7d0', marginBottom: 12,
                  }}
                />
                <button
                  onClick={onBind}
                  disabled={loading || !phone}
                  style={{
                    width: '100%', padding: '13px', borderRadius: 10,
                    fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
                    backgroundColor: !phone ? '#86efac' : '#00AA13',
                    color: '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  Hubungkan Akun GoPay
                </button>
              </>
            )}

            {step === 'auth' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Loader2
                  size={32} color="#00AA13"
                  style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }}
                />
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>
                  Menghubungkan GoPay...
                </p>
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                  Memverifikasi akun dan mengambil saldo
                </p>
              </div>
            )}

            {step === 'waiting' && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div
                  style={{
                    width: 52, height: 52, borderRadius: '50%',
                    backgroundColor: '#dcfce7', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}
                >
                  <ExternalLink size={24} color="#00AA13" />
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>
                  Halaman GoPay sudah dibuka
                </p>
                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16, lineHeight: 1.5 }}>
                  Selesaikan otorisasi di tab GoPay,<br />lalu kembali ke sini dan klik Periksa Status.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => window.open(authUrl, '_blank')}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 10,
                      backgroundColor: '#dcfce7', border: '1px solid #bbf7d0',
                      fontSize: 12, fontWeight: 700, color: '#00AA13', cursor: 'pointer',
                    }}
                  >
                    Buka Ulang
                  </button>
                  <button
                    onClick={onCheckStatus}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 10,
                      backgroundColor: '#00AA13', border: 'none',
                      fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer',
                    }}
                  >
                    Periksa Status
                  </button>
                </div>
              </div>
            )}

            {step === 'done' && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div
                  style={{
                    width: 48, height: 48, borderRadius: '50%',
                    backgroundColor: '#00AA13', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 10px', fontSize: 24, color: '#fff',
                  }}
                >
                  ✓
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#00AA13' }}>
                  GoPay Terhubung!
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
 * DANA Bind Card — shown when DANA is NOT linked
 * ══════════════════════════════════════════════ */
function DanaBindCard({
  show, onToggle, phone, setPhone, step, loading, onBind,
  authCode, setAuthCode, onAuthCodeSubmit, authUrl,
}: {
  show: boolean;
  onToggle: () => void;
  phone: string;
  setPhone: (v: string) => void;
  step: 'phone' | 'auth' | 'authcode' | 'done';
  loading: boolean;
  onBind: () => void;
  authCode: string;
  setAuthCode: (v: string) => void;
  onAuthCodeSubmit: () => void;
  authUrl: string;
}) {
  return (
    <div
      style={{
        borderRadius: 16, marginBottom: 16, overflow: 'hidden',
        border: '2px dashed #108ee9',
        backgroundColor: show ? '#f0f8ff' : '#f8fbff',
        transition: 'all 0.2s',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          gap: 12, padding: 16, background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <WalletIcon provider="dana" size={44} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>
            Hubungkan DANA
          </p>
          <p style={{ fontSize: 12, color: '#6b7280' }}>
            Link akun DANA untuk split payment otomatis
          </p>
        </div>
        <ExternalLink size={18} color="#108ee9" />
      </button>

      {show && (
        <div style={{ padding: '0 16px 16px' }}>
          <div
            style={{
              borderTop: '1px solid #d4e8f7', paddingTop: 14,
            }}
          >
            {step === 'phone' && (
              <>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 12px', backgroundColor: '#e6f4ff',
                    borderRadius: 10, marginBottom: 14,
                  }}
                >
                  <Shield size={16} color="#108ee9" />
                  <p style={{ fontSize: 11, color: '#108ee9', fontWeight: 600, lineHeight: 1.4 }}>
                    Panto akan terhubung ke akun DANA kamu via OAuth. Data kamu aman dan terenkripsi.
                  </p>
                </div>
                <label
                  style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}
                >
                  Nomor HP terdaftar di DANA
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="08123456789"
                  style={{
                    width: '100%', padding: '12px 14px', backgroundColor: '#ffffff',
                    borderRadius: 10, fontSize: 15, color: '#1a1a2e',
                    border: '1px solid #d4e8f7', marginBottom: 12,
                  }}
                />
                <button
                  onClick={onBind}
                  disabled={loading || !phone || phone.length < 10}
                  style={{
                    width: '100%', padding: '13px', borderRadius: 10,
                    fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
                    backgroundColor: !phone || phone.length < 10 ? '#a3d4f7' : '#108ee9',
                    color: '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      Menghubungkan...
                    </>
                  ) : (
                    'Hubungkan Akun DANA'
                  )}
                </button>
              </>
            )}

            {step === 'auth' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Loader2
                  size={32} color="#108ee9"
                  style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }}
                />
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>
                  Mengotorisasi dengan DANA...
                </p>
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                  Memverifikasi akun dan mengambil saldo
                </p>
              </div>
            )}

            {step === 'authcode' && (
              <>
                <div
                  style={{
                    padding: '10px 12px', backgroundColor: '#fffbeb',
                    borderRadius: 10, marginBottom: 14, lineHeight: 1.5,
                  }}
                >
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>
                    Langkah selanjutnya:
                  </p>
                  <p style={{ fontSize: 11, color: '#92400e' }}>
                    1. Login & otorisasi di halaman DANA yang baru dibuka{'\n'}
                    2. Setelah selesai, DANA akan redirect ke webhook.site{'\n'}
                    3. Copy <strong>authCode</strong> dari URL di webhook.site{'\n'}
                    4. Paste di bawah ini
                  </p>
                </div>
                <button
                  onClick={() => window.open(authUrl, '_blank')}
                  style={{
                    width: '100%', padding: '10px', marginBottom: 12,
                    backgroundColor: '#e6f4ff', borderRadius: 10,
                    fontSize: 12, fontWeight: 700, color: '#108ee9',
                    border: '1px solid #b3d9f7', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <ExternalLink size={14} /> Buka Halaman DANA Lagi
                </button>
                <label
                  style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}
                >
                  Auth Code dari DANA
                </label>
                <input
                  type="text"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder="Paste authCode disini..."
                  style={{
                    width: '100%', padding: '12px 14px', backgroundColor: '#ffffff',
                    borderRadius: 10, fontSize: 14, color: '#1a1a2e',
                    border: '1px solid #d4e8f7', marginBottom: 12,
                    fontFamily: 'monospace',
                  }}
                />
                <button
                  onClick={onAuthCodeSubmit}
                  disabled={loading || !authCode.trim()}
                  style={{
                    width: '100%', padding: '13px', borderRadius: 10,
                    fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
                    backgroundColor: !authCode.trim() ? '#a3d4f7' : '#108ee9',
                    color: '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      Memverifikasi...
                    </>
                  ) : (
                    'Verifikasi & Hubungkan'
                  )}
                </button>
              </>
            )}

            {step === 'done' && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div
                  style={{
                    width: 48, height: 48, borderRadius: '50%',
                    backgroundColor: '#10b981', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 10px', fontSize: 24, color: '#fff',
                  }}
                >
                  ✓
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>
                  DANA Terhubung!
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
 * DANA Linked Card — shown when DANA IS linked
 * ══════════════════════════════════════════════ */
function DanaLinkedCard({
  wallet, syncing, unlinking, onSync, onUnlink, onToggleRouting,
}: {
  wallet: Wallet;
  syncing: boolean;
  unlinking: boolean;
  onSync: () => void;
  onUnlink: () => void;
  onToggleRouting: () => void;
}) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff', borderRadius: 16, marginBottom: 16,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        border: '1px solid #d4e8f7',
      }}
    >
      {/* Header */}
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <WalletIcon provider="dana" size={44} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <p style={{ fontSize: 16, fontWeight: 700 }}>DANA</p>
                <span
                  style={{
                    padding: '2px 8px', borderRadius: 10,
                    backgroundColor: wallet.isRealLinked ? '#e6f4ff' : '#f0f2f5',
                    fontSize: 9, fontWeight: 800,
                    color: wallet.isRealLinked ? '#108ee9' : '#6b7280',
                    letterSpacing: 0.3,
                  }}
                >
                  {wallet.isRealLinked ? 'API LINKED' : 'SIMULATED'}
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#6b7280' }}>{wallet.providerPhone}</p>
            </div>
          </div>
          <div
            style={{
              padding: '4px 10px', borderRadius: 20,
              backgroundColor: '#ecfdf5', fontSize: 11,
              fontWeight: 600, color: '#10b981',
            }}
          >
            Aktif
          </div>
        </div>
      </div>

      {/* Balance */}
      <div
        style={{
          padding: '14px 16px', borderTop: '1px solid #f0f2f5',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div>
          <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Saldo DANA</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#108ee9' }}>
            {formatRp(wallet.balance)}
          </p>
        </div>
        <button
          onClick={onSync}
          disabled={syncing}
          title="Sync saldo dari DANA"
          style={{
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: '#e6f4ff', border: 'none',
            cursor: syncing ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <RefreshCw
            size={16} color="#108ee9"
            style={{ animation: syncing ? 'spin 0.6s linear' : 'none' }}
          />
        </button>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>

      {/* Controls */}
      <div
        style={{
          padding: '12px 16px', borderTop: '1px solid #f0f2f5',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#6b7280' }}>SmartPay Routing</span>
          <button
            onClick={onToggleRouting}
            style={{
              width: 44, height: 24, borderRadius: 12,
              backgroundColor: wallet.inRouting ? '#108ee9' : '#d1d5db',
              position: 'relative', transition: 'background-color 0.2s',
              border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            <div
              style={{
                width: 20, height: 20, borderRadius: '50%',
                backgroundColor: '#ffffff', position: 'absolute', top: 2,
                left: wallet.inRouting ? 22 : 2, transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }}
            />
          </button>
        </div>

        <button
          onClick={onUnlink}
          disabled={unlinking}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 12px', borderRadius: 8,
            backgroundColor: '#fef2f2', border: 'none',
            fontSize: 11, fontWeight: 700, color: '#ef4444',
            cursor: unlinking ? 'default' : 'pointer',
          }}
        >
          <Unlink size={12} />
          {unlinking ? 'Memutus...' : 'Putuskan'}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
 * Generic Wallet Card (non-DANA)
 * ══════════════════════════════════════════════ */
function WalletCard({
  wallet, syncing, unlinking, editingBalance, editValue,
  onSync, onToggleRouting, onStartEdit, onEditChange, onEditSave, onEditCancel, onUnlink,
}: {
  wallet: Wallet;
  syncing: boolean;
  unlinking?: boolean;
  editingBalance: string | null;
  editValue: string;
  onSync: () => void;
  onToggleRouting: () => void;
  onStartEdit: () => void;
  onEditChange: (v: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onUnlink?: () => void;
}) {
  const isEditing = editingBalance === wallet.id;

  return (
    <div
      style={{
        backgroundColor: '#ffffff', borderRadius: 16, marginBottom: 16,
        padding: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <WalletIcon provider={wallet.provider} size={40} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 700 }}>
              {providerNames[wallet.provider] || wallet.provider}
            </p>
            <p style={{ fontSize: 12, color: '#6b7280' }}>{wallet.providerPhone}</p>
          </div>
        </div>
        <div
          style={{
            padding: '4px 10px', borderRadius: 20,
            backgroundColor: wallet.isActive ? '#ecfdf5' : '#fef2f2',
            fontSize: 11, fontWeight: 600,
            color: wallet.isActive ? '#10b981' : '#ef4444',
          }}
        >
          {wallet.isActive ? 'Aktif' : 'Tidak Aktif'}
        </div>
      </div>

      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 14, paddingTop: 14, borderTop: '1px solid #f0f2f5',
        }}
      >
        <div>
          <p style={{ fontSize: 12, color: '#6b7280' }}>Saldo</p>
          {isEditing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                value={editValue}
                onChange={(e) => onEditChange(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onEditSave();
                  if (e.key === 'Escape') onEditCancel();
                }}
                autoFocus
                style={{
                  width: 120, padding: '6px 10px', borderRadius: 8,
                  backgroundColor: '#f0f2f5', fontSize: 16,
                  fontWeight: 700, color: '#1a1a2e',
                }}
              />
              <button
                onClick={onEditSave}
                style={{
                  padding: '6px 12px', backgroundColor: '#0047bf',
                  color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 600,
                }}
              >
                OK
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p
                onClick={onStartEdit}
                style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', cursor: 'pointer' }}
              >
                {formatRp(wallet.balance)}
              </p>
              <button
                onClick={onSync}
                disabled={syncing}
                title="Sync saldo (demo)"
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  backgroundColor: '#e8effc', border: 'none',
                  cursor: syncing ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                }}
              >
                <RefreshCw
                  size={14} color="#0047bf"
                  style={{ animation: syncing ? 'spin 0.6s linear' : 'none' }}
                />
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#6b7280' }}>Routing</span>
          <button
            onClick={onToggleRouting}
            style={{
              width: 44, height: 24, borderRadius: 12,
              backgroundColor: wallet.inRouting ? '#0047bf' : '#d1d5db',
              position: 'relative', transition: 'background-color 0.2s',
              border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            <div
              style={{
                width: 20, height: 20, borderRadius: '50%',
                backgroundColor: '#ffffff', position: 'absolute', top: 2,
                left: wallet.inRouting ? 22 : 2, transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }}
            />
          </button>
        </div>

        {onUnlink && (
          <button
            onClick={onUnlink}
            disabled={unlinking}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '6px 12px', borderRadius: 8,
              backgroundColor: '#fef2f2', border: 'none',
              fontSize: 11, fontWeight: 700, color: '#ef4444',
              cursor: unlinking ? 'default' : 'pointer',
            }}
          >
            <Unlink size={12} />
            {unlinking ? 'Memutus...' : 'Putuskan'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
 * Link Modal (for non-DANA wallets)
 * ══════════════════════════════════════════════ */
function LinkModal({
  provider, setProvider, phone, setPhone, loading, onLink, onClose,
}: {
  provider: WalletProvider;
  setProvider: (p: WalletProvider) => void;
  phone: string;
  setPhone: (v: string) => void;
  loading: boolean;
  onLink: () => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff', borderRadius: '20px 20px 0 0',
          padding: '24px', width: '100%', maxWidth: 430,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 20,
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Hubungkan Wallet</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <X size={20} color="#6b7280" />
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>
            Pilih Provider
          </label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as WalletProvider)}
            style={{
              width: '100%', padding: '12px 16px', backgroundColor: '#f0f2f5',
              borderRadius: 12, fontSize: 15, color: '#1a1a2e', border: 'none', appearance: 'none',
            }}
          >
            {providerOptions.map((p) => (
              <option key={p} value={p}>
                {providerNames[p]}{p === 'dana' ? ' (OAuth)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>
            Nomor Telepon
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="08123456789"
            style={{
              width: '100%', padding: '12px 16px', backgroundColor: '#f0f2f5',
              borderRadius: 12, fontSize: 15, color: '#1a1a2e',
            }}
          />
        </div>

        <button
          onClick={onLink}
          disabled={loading || !phone}
          style={{
            width: '100%', padding: '14px',
            backgroundColor: loading || !phone ? '#93b4e8' : '#0047bf',
            color: '#ffffff', borderRadius: 12, fontSize: 16,
            fontWeight: 700, border: 'none',
            cursor: loading || !phone ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Menghubungkan...' : 'Hubungkan'}
        </button>
      </div>
    </div>
  );
}
