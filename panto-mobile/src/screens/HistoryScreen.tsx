import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, formatRp, radius, shadow } from '../theme/colors';
import WalletIcon from '../components/WalletIcon';
import Loader from '../components/Loader';
import * as api from '../api/endpoints';
import type { Transaction, WalletProvider } from '../types';

type DateFilter = 'week' | 'month' | '3months' | 'all';
type TypeFilter = 'all' | 'payment' | 'transfer';

export default function HistoryScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [walletFilter, setWalletFilter] = useState<WalletProvider | 'all'>('all');

  const fetchData = useCallback(async () => {
    try {
      const data = await api.getTransactions(1, 50);
      setTransactions(data || []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const bound =
      dateFilter === 'week'
        ? now - 7 * day
        : dateFilter === 'month'
        ? now - 30 * day
        : dateFilter === '3months'
        ? now - 90 * day
        : 0;

    return transactions.filter((t) => {
      if (bound && new Date(t.createdAt).getTime() < bound) return false;
      if (typeFilter !== 'all' && t.type && t.type !== typeFilter) return false;
      if (walletFilter !== 'all') {
        if (!t.splits?.some((s) => s.provider === walletFilter)) return false;
      }
      return true;
    });
  }, [transactions, dateFilter, typeFilter, walletFilter]);

  const stats = useMemo(() => {
    const total = filtered.reduce((s, t) => s + t.totalAmount, 0);
    const saved = filtered.reduce((s, t) => s + (t.totalSaving || 0), 0);
    const points = filtered.reduce((s, t) => s + (t.pointsEarned || 0), 0);
    return { total, saved, points };
  }, [filtered]);

  const grouped = useMemo(() => {
    const g: Record<string, Transaction[]> = {};
    filtered.forEach((t) => {
      const d = new Date(t.createdAt);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!g[k]) g[k] = [];
      g[k].push(t);
    });
    return Object.entries(g).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Loader />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <Text style={styles.h1}>Riwayat</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statVal, { color: colors.warning }]}>
              {stats.points.toLocaleString('id-ID')}
            </Text>
            <Text style={styles.statLabel}>PantoPoints</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statVal, { color: colors.primary }]}>
              {formatRp(stats.total)}
            </Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statVal, { color: colors.success }]}>
              {formatRp(stats.saved)}
            </Text>
            <Text style={styles.statLabel}>Hemat</Text>
          </View>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 8 }}
        >
          {(['week', 'month', '3months', 'all'] as DateFilter[]).map((d) => (
            <Chip
              key={d}
              active={dateFilter === d}
              label={
                d === 'week' ? '1 Minggu' : d === 'month' ? '1 Bulan' : d === '3months' ? '3 Bulan' : 'Semua'
              }
              onPress={() => setDateFilter(d)}
            />
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 4, marginBottom: 12 }}
        >
          {(['all', 'gopay', 'ovo', 'dana', 'shopeepay', 'linkaja'] as const).map((p) => (
            <Chip
              key={p}
              active={walletFilter === p}
              label={p === 'all' ? 'Semua Wallet' : p.toUpperCase()}
              onPress={() => setWalletFilter(p as any)}
            />
          ))}
        </ScrollView>

        {/* Transactions */}
        {grouped.length === 0 ? (
          <View style={[styles.emptyCard]}>
            <Text style={{ color: colors.textSub }}>Belum ada transaksi</Text>
          </View>
        ) : (
          grouped.map(([month, list]) => (
            <View key={month} style={{ marginBottom: 16 }}>
              <Text style={styles.monthHead}>{formatMonth(month)}</Text>
              <View style={styles.groupCard}>
                {list.map((tx, i) => {
                  const expanded = expandedId === tx.id;
                  return (
                    <View key={tx.id}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setExpandedId(expanded ? null : tx.id)}
                        style={[
                          styles.txRow,
                          i < list.length - 1 && styles.txRowDivider,
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                          <View style={styles.txIcon}>
                            <Text style={{ fontWeight: '700', color: colors.primary }}>
                              {(tx.merchantName?.charAt(0) || 'T').toUpperCase()}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.txName} numberOfLines={1}>
                              {tx.merchantName}
                            </Text>
                            <Text style={styles.txDate}>
                              {new Date(tx.createdAt).toLocaleString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Text>
                          </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.txAmount}>{formatRp(tx.totalAmount)}</Text>
                          {tx.totalSaving > 0 && (
                            <Text style={styles.txSave}>Hemat {formatRp(tx.totalSaving)}</Text>
                          )}
                        </View>
                      </TouchableOpacity>

                      {expanded && tx.splits && (
                        <View style={styles.expandBox}>
                          {tx.splits.map((s) => (
                            <View key={s.id} style={styles.splitRow}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <WalletIcon provider={s.provider} size={22} />
                                <Text style={{ fontSize: 13, color: colors.text }}>
                                  {s.provider.toUpperCase()}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                                {formatRp(s.amount)}
                              </Text>
                            </View>
                          ))}
                          {tx.pointsEarned > 0 && (
                            <View style={[styles.splitRow, { marginTop: 4 }]}>
                              <Text style={{ fontSize: 12, color: colors.warning, fontWeight: '600' }}>
                                Poin Diperoleh
                              </Text>
                              <Text style={{ fontSize: 12, color: colors.warning, fontWeight: '700' }}>
                                +{tx.pointsEarned}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.chip,
        { backgroundColor: active ? colors.primary : '#fff' },
      ]}
    >
      <Text
        style={{
          color: active ? '#fff' : colors.text,
          fontSize: 12,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function formatMonth(key: string) {
  const [y, m] = key.split('-');
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    ...shadow.card,
  },
  statVal: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 11, color: colors.textSub, fontWeight: '500', marginTop: 2 },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    ...shadow.card,
  },

  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: radius.card,
    paddingVertical: 32,
    alignItems: 'center',
    ...shadow.card,
  },

  monthHead: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSub,
    marginBottom: 8,
    paddingLeft: 4,
  },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: radius.card,
    overflow: 'hidden',
    ...shadow.card,
  },

  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  txRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txName: { fontSize: 14, fontWeight: '600', color: colors.text },
  txDate: { fontSize: 12, color: colors.textSub, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700', color: colors.text },
  txSave: { fontSize: 11, color: colors.success, fontWeight: '600', marginTop: 2 },

  expandBox: {
    backgroundColor: colors.background,
    padding: 14,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
});
