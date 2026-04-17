import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScanLine,
  Clock,
  ArrowLeftRight,
  ArrowUpDown,
  Zap,
  Droplets,
  Smartphone,
  CreditCard,
  Lock,
  Star,
  ChevronRight,
  Wifi,
  Tv,
  Gamepad2,
  HeartPulse,
} from 'lucide-react';
import WalletIcon from '../../components/WalletIcon';
import ComingSoonModal from '../../components/ComingSoonModal';
import * as api from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import type { Transaction, WalletProvider } from '../../types';

const formatRp = (amount: number) =>
  'Rp ' + amount.toLocaleString('id-ID');

interface WalletSummary {
  totalBalance: number;
  activeWallets: number;
  totalSaved: number;
  providers: WalletProvider[];
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  action: string;
  locked: boolean;
  badge?: string;
}

const menuItems: MenuItem[] = [
  { icon: ScanLine, label: 'Scan QR', action: '/pay', locked: false },
  { icon: ScanLine, label: 'Scan Demo', action: '/scan', locked: false, badge: 'NEW' },
  { icon: Clock, label: 'History', action: '/history', locked: false },
  { icon: ArrowLeftRight, label: 'Merge', action: 'soon', locked: true },
  { icon: ArrowUpDown, label: 'Transfer', action: 'soon', locked: true },
  { icon: Zap, label: 'PLN', action: 'soon', locked: true },
  { icon: Droplets, label: 'PDAM', action: 'soon', locked: true },
  { icon: Smartphone, label: 'Pulsa', action: 'soon', locked: true },
  { icon: CreditCard, label: 'E-money', action: 'soon', locked: true },
  { icon: Wifi, label: 'Internet', action: 'soon', locked: true },
  { icon: Tv, label: 'TV Kabel', action: 'soon', locked: true },
  { icon: Gamepad2, label: 'Voucher', action: 'soon', locked: true },
  { icon: HeartPulse, label: 'BPJS', action: 'soon', locked: true },
];

const ITEMS_PER_PAGE = 8;

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [summary, setSummary] = useState<WalletSummary>({
    totalBalance: 0,
    activeWallets: 0,
    totalSaved: 0,
    providers: [],
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activePage, setActivePage] = useState(0);
  const pagerRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.ceil(menuItems.length / ITEMS_PER_PAGE);
  const pages: MenuItem[][] = Array.from({ length: totalPages }, (_, i) =>
    menuItems.slice(i * ITEMS_PER_PAGE, (i + 1) * ITEMS_PER_PAGE),
  );

  const handlePagerScroll = () => {
    const el = pagerRef.current;
    if (!el) return;
    const page = Math.round(el.scrollLeft / el.clientWidth);
    if (page !== activePage) setActivePage(page);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, txRes, pointsRes] = await Promise.allSettled([
        api.getWalletsSummary(),
        api.getTransactions(1, 5),
        api.getPoints(),
      ]);

      if (summaryRes.status === 'fulfilled') {
        const s = summaryRes.value.data || summaryRes.value;
        setSummary({
          totalBalance: s.totalBalance || 0,
          activeWallets: s.activeWallets || 0,
          totalSaved: s.totalSaved || 0,
          providers: s.providers || [],
        });
      }
      if (txRes.status === 'fulfilled') {
        const txData = txRes.value.data || txRes.value;
        setTransactions(Array.isArray(txData) ? txData.slice(0, 5) : txData.transactions?.slice(0, 5) || []);
      }
      if (pointsRes.status === 'fulfilled') {
        const p = pointsRes.value.data || pointsRes.value;
        setPoints(p.balance || 0);
      }

      if (!user) {
        try {
          const meRes = await api.getMe();
          const userData = meRes.data || meRes;
          setUser(userData);
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [user, setUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMenuClick = (item: MenuItem) => {
    if (item.locked) {
      setShowModal(true);
    } else {
      navigate(item.action);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center', paddingTop: 100 }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid #e5e7eb',
            borderTopColor: '#0047bf',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <p style={{ marginTop: 16, color: '#6b7280', fontSize: 14 }}>Memuat data...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0047bf 0%, #0035a0 100%)',
          padding: '20px 20px 28px',
          borderRadius: '0 0 24px 24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff' }}>Panto</h1>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'rgba(255,255,255,0.15)',
              padding: '6px 12px',
              borderRadius: 20,
            }}
          >
            <Star size={14} color="#f59e0b" fill="#f59e0b" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
              {points.toLocaleString('id-ID')} Poin
            </span>
          </div>
        </div>

        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
          Total Balance
        </p>
        <h2 style={{ fontSize: 32, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>
          {formatRp(summary.totalBalance)}
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>
          Across {summary.activeWallets} active wallets
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          {summary.providers.map((p) => (
            <WalletIcon key={p} provider={p} size={24} />
          ))}
        </div>

        {summary.totalSaved > 0 && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'rgba(16,185,129,0.2)',
              padding: '6px 12px',
              borderRadius: 20,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>
              Total saved: {formatRp(summary.totalSaved)}
            </span>
          </div>
        )}
      </div>

      {/* Menu Pager */}
      <div style={{ padding: '20px 16px' }}>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: '16px 0 12px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}
        >
          <style>{`
            .menu-pager::-webkit-scrollbar { display: none; }
            .menu-pager { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>
          <div
            ref={pagerRef}
            className="menu-pager"
            onScroll={handlePagerScroll}
            style={{
              display: 'flex',
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              scrollBehavior: 'smooth',
            }}
          >
            {pages.map((page, pageIdx) => (
              <div
                key={pageIdx}
                style={{
                  flex: '0 0 100%',
                  scrollSnapAlign: 'start',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gridAutoRows: 'auto',
                  gap: 12,
                  padding: '0 16px',
                }}
              >
                {page.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={() => handleMenuClick(item)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        padding: 8,
                        opacity: item.locked ? 0.45 : 1,
                        position: 'relative',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'transform 0.15s',
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          backgroundColor: item.locked ? '#f0f2f5' : '#e8effc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                        }}
                      >
                        <Icon size={20} color={item.locked ? '#9ca3af' : '#0047bf'} />
                        {item.locked && (
                          <Lock
                            size={10}
                            color="#9ca3af"
                            style={{ position: 'absolute', bottom: 2, right: 2 }}
                          />
                        )}
                        {item.badge && (
                          <span
                            style={{
                              position: 'absolute',
                              top: -6,
                              right: -8,
                              backgroundColor: '#ef4444',
                              color: '#ffffff',
                              fontSize: 8,
                              fontWeight: 800,
                              padding: '2px 5px',
                              borderRadius: 8,
                              letterSpacing: 0.4,
                              boxShadow: '0 2px 6px rgba(239,68,68,0.4)',
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: item.locked ? '#9ca3af' : '#1a1a2e',
                        }}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Page indicator dots */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 6,
                marginTop: 14,
              }}
            >
              {pages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    pagerRef.current?.scrollTo({
                      left: i * (pagerRef.current?.clientWidth || 0),
                      behavior: 'smooth',
                    });
                  }}
                  style={{
                    width: i === activePage ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: i === activePage ? '#0047bf' : '#d1d5db',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    padding: 0,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Promo Banner */}
      <div style={{ padding: '0 16px 16px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #0047bf 0%, #0060ff 100%)',
            borderRadius: 16,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', marginBottom: 2 }}>
              Upgrade ke Panto+
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
              untuk voucher harian!
            </p>
          </div>
          <ChevronRight size={20} color="#ffffff" />
        </div>
      </div>

      {/* Recent Transactions */}
      <div style={{ padding: '0 16px 20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Transaksi Terbaru</h3>
          <span
            onClick={() => navigate('/history')}
            style={{ fontSize: 13, color: '#0047bf', fontWeight: 600, cursor: 'pointer' }}
          >
            Lihat Semua
          </span>
        </div>

        {transactions.length === 0 ? (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: '32px 20px',
              textAlign: 'center',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            }}
          >
            <p style={{ fontSize: 14, color: '#6b7280' }}>Belum ada transaksi</p>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            }}
          >
            {transactions.map((tx, i) => (
              <div
                key={tx.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderBottom: i < transactions.length - 1 ? '1px solid #f0f2f5' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: '#e8effc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                    }}
                  >
                    {tx.merchantName?.charAt(0)?.toUpperCase() || 'T'}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>
                      {tx.merchantName}
                    </p>
                    <p style={{ fontSize: 12, color: '#6b7280' }}>
                      {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>
                    {formatRp(tx.totalAmount)}
                  </p>
                  {tx.totalSaving > 0 && (
                    <p style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>
                      Hemat {formatRp(tx.totalSaving)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ComingSoonModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
