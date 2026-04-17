import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  Lock,
  X,
  Crown,
} from 'lucide-react';
import WalletIcon from '../../components/WalletIcon';
import ComingSoonModal from '../../components/ComingSoonModal';
import * as api from '../../api/endpoints';
import type { Transaction, WalletProvider } from '../../types';

const formatRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID');
const formatRpShort = (n: number) => {
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1) + 'jt';
  if (n >= 1_000) return 'Rp ' + Math.round(n / 1_000) + 'rb';
  return 'Rp ' + n;
};

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

type DateFilter = 'week' | 'month' | '3months' | 'custom';
type TypeFilter = 'all' | 'qr_payment' | 'transfer' | 'merge' | 'pln' | 'pdam' | 'pulsa';
type WalletFilter = 'all' | WalletProvider;

const dateFilterOptions: { id: DateFilter; label: string; locked?: boolean }[] = [
  { id: 'week', label: 'Minggu Ini' },
  { id: 'month', label: 'Bulan Lalu' },
  { id: '3months', label: '3 Bulan' },
  { id: 'custom', label: 'Custom', locked: true },
];

const typeFilterOptions: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'Semua Tipe' },
  { id: 'qr_payment', label: 'QR Payment' },
  { id: 'transfer', label: 'Transfer Bank' },
  { id: 'merge', label: 'Merge Money' },
  { id: 'pln', label: 'PLN' },
  { id: 'pdam', label: 'PDAM' },
  { id: 'pulsa', label: 'Pulsa' },
];

const walletFilterOptions: { id: WalletFilter; label: string }[] = [
  { id: 'all', label: 'Semua Wallet' },
  { id: 'gopay', label: 'GoPay' },
  { id: 'ovo', label: 'OVO' },
  { id: 'dana', label: 'DANA' },
  { id: 'shopeepay', label: 'ShopeePay' },
  { id: 'linkaja', label: 'LinkAja' },
];

function getDateRange(filter: DateFilter): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  if (filter === 'week') {
    const day = from.getDay() || 7;
    from.setDate(from.getDate() - (day - 1));
    from.setHours(0, 0, 0, 0);
  } else if (filter === 'month') {
    from.setMonth(from.getMonth() - 1);
    from.setHours(0, 0, 0, 0);
  } else {
    from.setMonth(from.getMonth() - 3);
    from.setHours(0, 0, 0, 0);
  }
  return { from, to };
}

interface Stats {
  points: number;
  totalAmount: number;
  totalSaved: number;
}

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats>({ points: 0, totalAmount: 0, totalSaved: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [dateFilter, setDateFilter] = useState<DateFilter>('3months');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [walletFilter, setWalletFilter] = useState<WalletFilter>('all');
  const [chartTab, setChartTab] = useState<WalletFilter>('all');
  const [showDownload, setShowDownload] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, pointsRes] = await Promise.allSettled([
        api.getTransactions(1, 100),
        api.getPoints(),
      ]);

      let txList: Transaction[] = [];
      if (txRes.status === 'fulfilled') {
        const data = txRes.value.data || txRes.value;
        txList = Array.isArray(data) ? data : data.transactions || [];
      }
      setTransactions(txList);

      const totalAmount = txList.reduce((s, t) => s + (t.totalAmount || 0), 0);
      const totalSaved = txList.reduce((s, t) => s + (t.totalSaving || 0), 0);

      let pts = 0;
      if (pointsRes.status === 'fulfilled') {
        const p = pointsRes.value.data || pointsRes.value;
        pts = p.balance || 0;
      }
      setStats({ points: pts, totalAmount, totalSaved });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply filters
  const filteredTx = useMemo(() => {
    if (dateFilter === 'custom') return transactions;
    const { from, to } = getDateRange(dateFilter);
    return transactions.filter((tx) => {
      const d = new Date(tx.createdAt);
      if (d < from || d > to) return false;
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (walletFilter !== 'all') {
        const used = tx.splits?.some((s) => s.provider === walletFilter);
        if (!used) return false;
      }
      return true;
    });
  }, [transactions, dateFilter, typeFilter, walletFilter]);

  // Group by month
  const grouped = useMemo(() => {
    const map: Record<string, { label: string; items: Transaction[] }> = {};
    filteredTx
      .slice()
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .forEach((tx) => {
        const d = new Date(tx.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
        const label = `${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
        if (!map[key]) map[key] = { label, items: [] };
        map[key].items.push(tx);
      });
    return Object.entries(map).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [filteredTx]);

  // Chart data
  const chartData = useMemo(() => {
    const dayMap: Record<string, number> = {};
    filteredTx.forEach((tx) => {
      const d = new Date(tx.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      let value = 0;
      if (chartTab === 'all') {
        value = tx.totalAmount || 0;
      } else {
        const split = tx.splits?.find((s) => s.provider === chartTab);
        if (split) value = split.amount;
      }
      dayMap[key] = (dayMap[key] || 0) + value;
    });
    return Object.entries(dayMap)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, value]) => ({ date, value }));
  }, [filteredTx, chartTab]);

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
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 16px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Riwayat</h1>
        <button
          onClick={() => setShowDownload(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            backgroundColor: '#e8effc',
            color: '#0047bf',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Download size={14} />
          Download
        </button>
      </div>

      {/* Stats Row (reused pattern from Profile) */}
      <StatsRow stats={stats} />

      {/* Filters */}
      <FiltersBar
        dateFilter={dateFilter}
        setDateFilter={(f) => {
          if (dateFilterOptions.find((o) => o.id === f)?.locked) {
            setShowComingSoon(true);
            return;
          }
          setDateFilter(f);
        }}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        walletFilter={walletFilter}
        setWalletFilter={setWalletFilter}
      />

      {/* Chart */}
      <ChartCard data={chartData} chartTab={chartTab} setChartTab={setChartTab} />

      {/* Transaction List Grouped by Month */}
      <TransactionList
        groups={grouped}
        expandedId={expandedId}
        setExpandedId={setExpandedId}
      />

      {showDownload && (
        <DownloadModal
          onClose={() => setShowDownload(false)}
          onPickPanto={() => setShowComingSoon(true)}
          transactions={filteredTx}
        />
      )}

      <ComingSoonModal isOpen={showComingSoon} onClose={() => setShowComingSoon(false)} />
    </div>
  );
}

/* ========================
 * Stats Row — reuses Profile pattern
 * ======================== */
function StatsRow({ stats }: { stats: Stats }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 10,
        marginBottom: 16,
      }}
    >
      <div style={statCardStyle}>
        <p style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>
          {stats.points.toLocaleString('id-ID')}
        </p>
        <p style={statLabelStyle}>PantoPoints</p>
      </div>
      <div style={statCardStyle}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0047bf' }}>
          {formatRpShort(stats.totalAmount)}
        </p>
        <p style={statLabelStyle}>Total Transaksi</p>
      </div>
      <div style={statCardStyle}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>
          {formatRpShort(stats.totalSaved)}
        </p>
        <p style={statLabelStyle}>Total Hemat</p>
      </div>
    </div>
  );
}

const statCardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 14,
  padding: '14px 8px',
  textAlign: 'center',
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#6b7280',
  fontWeight: 500,
  marginTop: 2,
};

/* ========================
 * Filters Bar
 * ======================== */
interface FiltersBarProps {
  dateFilter: DateFilter;
  setDateFilter: (f: DateFilter) => void;
  typeFilter: TypeFilter;
  setTypeFilter: (f: TypeFilter) => void;
  walletFilter: WalletFilter;
  setWalletFilter: (f: WalletFilter) => void;
}

function FiltersBar({
  dateFilter,
  setDateFilter,
  typeFilter,
  setTypeFilter,
  walletFilter,
  setWalletFilter,
}: FiltersBarProps) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: '14px 14px 10px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Filter size={13} color="#6b7280" />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Filter
        </span>
      </div>

      {/* Date filter chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {dateFilterOptions.map((opt) => {
          const active = dateFilter === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setDateFilter(opt.id)}
              style={{
                padding: '7px 12px',
                borderRadius: 18,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                backgroundColor: active ? '#0047bf' : '#f0f2f5',
                color: active ? '#ffffff' : '#1a1a2e',
              }}
            >
              {opt.label}
              {opt.locked && <Lock size={10} />}
            </button>
          );
        })}
      </div>

      {/* Type + Wallet selects */}
      <div style={{ display: 'flex', gap: 8 }}>
        <SelectChip
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as TypeFilter)}
          options={typeFilterOptions}
        />
        <SelectChip
          value={walletFilter}
          onChange={(v) => setWalletFilter(v as WalletFilter)}
          options={walletFilterOptions}
        />
      </div>
    </div>
  );
}

function SelectChip<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      style={{
        flex: 1,
        padding: '8px 12px',
        borderRadius: 10,
        backgroundColor: '#f0f2f5',
        fontSize: 12,
        fontWeight: 600,
        color: '#1a1a2e',
        border: 'none',
        appearance: 'none',
        cursor: 'pointer',
      }}
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ========================
 * Chart (SVG, no library)
 * ======================== */
interface ChartCardProps {
  data: { date: string; value: number }[];
  chartTab: WalletFilter;
  setChartTab: (t: WalletFilter) => void;
}

function ChartCard({ data, chartTab, setChartTab }: ChartCardProps) {
  const chartTabs = walletFilterOptions;
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) setWidth(containerRef.current.clientWidth);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const height = 140;
  const padding = { top: 16, right: 12, bottom: 22, left: 12 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const points = data.map((d, i) => {
    const x = data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW;
    const y = innerH - (d.value / maxValue) * innerH;
    return { x: x + padding.left, y: y + padding.top, value: d.value, date: d.date };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath = points.length
    ? `M ${points[0].x},${innerH + padding.top} L ${points
        .map((p) => `${p.x},${p.y}`)
        .join(' L ')} L ${points[points.length - 1].x},${innerH + padding.top} Z`
    : '';

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: '14px 14px 12px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Tren Pengeluaran
        </span>
      </div>

      {/* Wallet tabs */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          marginBottom: 10,
          overflowX: 'auto',
          paddingBottom: 4,
        }}
      >
        <style>{`.chart-tabs::-webkit-scrollbar { display: none; }`}</style>
        {chartTabs.map((t) => {
          const active = chartTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setChartTab(t.id)}
              style={{
                padding: '6px 12px',
                borderRadius: 16,
                fontSize: 11,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                backgroundColor: active ? '#0047bf' : '#f0f2f5',
                color: active ? '#ffffff' : '#6b7280',
              }}
            >
              {t.label.replace('Semua Wallet', 'Semua')}
            </button>
          );
        })}
      </div>

      <div ref={containerRef} style={{ width: '100%' }}>
        {data.length === 0 ? (
          <div
            style={{
              height,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
              fontSize: 12,
            }}
          >
            Tidak ada data untuk filter ini
          </div>
        ) : (
          <svg width={width} height={height}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0047bf" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#0047bf" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((r) => (
              <line
                key={r}
                x1={padding.left}
                x2={width - padding.right}
                y1={padding.top + innerH * r}
                y2={padding.top + innerH * r}
                stroke="#f0f2f5"
                strokeWidth={1}
              />
            ))}
            <path d={areaPath} fill="url(#chartGradient)" />
            <polyline
              fill="none"
              stroke="#0047bf"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylinePoints}
            />
            {points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={3} fill="#0047bf" />
            ))}
            {points.length > 0 && (
              <>
                <text x={padding.left} y={height - 4} fontSize="9" fill="#9ca3af">
                  {points[0].date.slice(5)}
                </text>
                <text x={width - padding.right} y={height - 4} fontSize="9" fill="#9ca3af" textAnchor="end">
                  {points[points.length - 1].date.slice(5)}
                </text>
              </>
            )}
          </svg>
        )}
      </div>
    </div>
  );
}

/* ========================
 * Transaction List grouped by month
 * ======================== */
interface TransactionListProps {
  groups: [string, { label: string; items: Transaction[] }][];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
}

function TransactionList({ groups, expandedId, setExpandedId }: TransactionListProps) {
  if (groups.length === 0) {
    return (
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 16,
          padding: '50px 20px',
          textAlign: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ fontSize: 42, marginBottom: 8 }}>📋</div>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>
          Tidak ada transaksi
        </p>
        <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
          Coba ubah filter di atas
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {groups.map(([key, group]) => {
        const total = group.items.reduce((s, t) => s + t.totalAmount, 0);
        return (
          <div key={key}>
            {/* Month Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 4px 8px',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>
                {group.label}
              </span>
              <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
                {group.items.length} transaksi · {formatRpShort(total)}
              </span>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              }}
            >
              {group.items.map((tx, idx) => {
                const expanded = expandedId === tx.id;
                const d = new Date(tx.createdAt);
                return (
                  <div
                    key={tx.id}
                    style={{
                      borderBottom:
                        idx < group.items.length - 1 ? '1px solid #f0f2f5' : 'none',
                    }}
                  >
                    <button
                      onClick={() => setExpandedId(expanded ? null : tx.id)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
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
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#0047bf',
                          }}
                        >
                          <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}>
                            {d.getDate()}
                          </span>
                          <span style={{ fontSize: 9, fontWeight: 600, lineHeight: 1, marginTop: 2 }}>
                            {MONTHS_ID[d.getMonth()].slice(0, 3)}
                          </span>
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>
                            {tx.merchantName}
                          </p>
                          <p style={{ fontSize: 11, color: '#6b7280' }}>
                            {d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} · {tx.type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>
                            {formatRp(tx.totalAmount)}
                          </p>
                          {tx.totalSaving > 0 && (
                            <p style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>
                              Hemat {formatRp(tx.totalSaving)}
                            </p>
                          )}
                        </div>
                        {expanded ? (
                          <ChevronUp size={14} color="#6b7280" />
                        ) : (
                          <ChevronDown size={14} color="#6b7280" />
                        )}
                      </div>
                    </button>

                    {expanded && tx.splits && tx.splits.length > 0 && (
                      <div
                        style={{
                          padding: '0 16px 14px',
                          borderTop: '1px solid #f0f2f5',
                          backgroundColor: '#f8faff',
                        }}
                      >
                        <p
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#6b7280',
                            padding: '10px 0 6px',
                            textTransform: 'uppercase',
                            letterSpacing: 0.4,
                          }}
                        >
                          Split Breakdown
                        </p>
                        {tx.splits.map((split) => (
                          <div
                            key={split.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingBottom: 6,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <WalletIcon provider={split.provider} size={22} />
                              <span style={{ fontSize: 12 }}>
                                {split.provider.charAt(0).toUpperCase() + split.provider.slice(1)}
                              </span>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>
                              {formatRp(split.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ========================
 * Download Modal
 * ======================== */
interface DownloadModalProps {
  onClose: () => void;
  onPickPanto: () => void;
  transactions: Transaction[];
}

function DownloadModal({ onClose, onPickPanto, transactions }: DownloadModalProps) {
  const handleDownloadPerMonth = () => {
    const header = 'Tanggal,Merchant,Tipe,Jumlah,Hemat,Status\n';
    const rows = transactions
      .map((tx) => {
        const d = new Date(tx.createdAt).toISOString().split('T')[0];
        return `${d},"${tx.merchantName}",${tx.type},${tx.totalAmount},${tx.totalSaving},${tx.status}`;
      })
      .join('\n');
    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const today = new Date().toISOString().split('T')[0];
    link.download = `panto-history-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
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
          padding: 24,
          width: '100%',
          maxWidth: 430,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Download Riwayat</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="#6b7280" />
          </button>
        </div>

        <button
          onClick={handleDownloadPerMonth}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '14px 16px',
            backgroundColor: '#f8faff',
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
            marginBottom: 10,
            textAlign: 'left',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: '#e8effc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Download size={18} color="#0047bf" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>Per Bulan</p>
            <p style={{ fontSize: 12, color: '#6b7280' }}>Download CSV transaksi dari filter saat ini</p>
          </div>
        </button>

        <button
          onClick={onPickPanto}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '14px 16px',
            backgroundColor: '#fff8eb',
            borderRadius: 12,
            border: '1px solid #fde9b8',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Crown size={18} color="#f59e0b" />
          </div>
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#1a1a2e',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Custom Range <Lock size={12} color="#f59e0b" />
            </p>
            <p style={{ fontSize: 12, color: '#92651b' }}>Khusus Panto VIP</p>
          </div>
        </button>
      </div>
    </div>
  );
}
