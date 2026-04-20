import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, formatRp, radius, shadow } from '../theme/colors';
import WalletIcon from '../components/WalletIcon';
import ComingSoonModal from '../components/ComingSoonModal';
import Loader from '../components/Loader';
import * as api from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import type { RootStackParamList } from '../navigation/types';
import type { Transaction, WalletSummary } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type IconName = keyof typeof Ionicons.glyphMap;

type MenuItem = {
  icon: IconName;
  label: string;
  locked: boolean;
  route?: 'Pay' | 'Scan' | 'History';
  badge?: string;
};

const menuItems: MenuItem[] = [
  { icon: 'scan-outline', label: 'Scan QR', locked: false, route: 'Pay' },
  { icon: 'qr-code-outline', label: 'Scan Demo', locked: false, route: 'Scan', badge: 'NEW' },
  { icon: 'time-outline', label: 'History', locked: false, route: 'History' },
  { icon: 'swap-horizontal-outline', label: 'Merge', locked: true },
  { icon: 'swap-vertical-outline', label: 'Transfer', locked: true },
  { icon: 'flash-outline', label: 'PLN', locked: true },
  { icon: 'water-outline', label: 'PDAM', locked: true },
  { icon: 'phone-portrait-outline', label: 'Pulsa', locked: true },
  { icon: 'card-outline', label: 'E-money', locked: true },
  { icon: 'wifi-outline', label: 'Internet', locked: true },
  { icon: 'tv-outline', label: 'TV Kabel', locked: true },
  { icon: 'game-controller-outline', label: 'Voucher', locked: true },
  { icon: 'heart-outline', label: 'BPJS', locked: true },
];

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
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
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [s, tx, p] = await Promise.allSettled([
        api.getWalletsSummary(),
        api.getTransactions(1, 5),
        api.getPoints(),
      ]);
      if (s.status === 'fulfilled' && s.value) {
        setSummary({
          totalBalance: s.value.totalBalance || 0,
          activeWallets: s.value.activeWallets || 0,
          totalSaved: s.value.totalSaved || 0,
          providers: s.value.providers || [],
        });
      }
      if (tx.status === 'fulfilled') {
        const list = (tx.value || []).slice(0, 5);
        setTransactions(list);
      }
      if (p.status === 'fulfilled' && p.value) {
        setPoints(p.value.balance || 0);
      }
      if (!user) {
        try {
          const me = await api.getMe();
          if (me) await setUser(me);
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  }, [setUser, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleMenu = (item: MenuItem) => {
    if (item.locked || !item.route) {
      setShowModal(true);
      return;
    }
    if (item.route === 'Pay') navigation.navigate('Pay');
    else if (item.route === 'Scan') navigation.navigate('Scan');
    else if (item.route === 'History') navigation.navigate('Tabs', { screen: 'History' });
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Loader label="Memuat data..." />
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Header */}
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Text style={styles.brand}>Panto</Text>
              <View style={styles.pointsPill}>
                <Ionicons name="star" size={14} color={colors.warning} />
                <Text style={styles.pointsPillText}>
                  {points.toLocaleString('id-ID')} Poin
                </Text>
              </View>
            </View>

            <Text style={styles.balanceLabel}>Total Balance</Text>
            <Text style={styles.balanceValue}>{formatRp(summary.totalBalance)}</Text>
            <Text style={styles.balanceSub}>
              Across {summary.activeWallets} active wallets
            </Text>

            <View style={styles.providerRow}>
              {summary.providers.map((p) => (
                <View key={p} style={{ marginRight: 6 }}>
                  <WalletIcon provider={p} size={24} />
                </View>
              ))}
            </View>

            {summary.totalSaved > 0 && (
              <View style={styles.savedPill}>
                <Text style={styles.savedPillText}>
                  Total saved: {formatRp(summary.totalSaved)}
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>

        {/* Menu Grid */}
        <View style={styles.menuWrap}>
          <View style={styles.menuCard}>
            <View style={styles.menuGrid}>
              {menuItems.slice(0, 8).map((item) => (
                <TouchableOpacity
                  key={item.label}
                  onPress={() => handleMenu(item)}
                  activeOpacity={0.7}
                  style={[styles.menuItem, item.locked && { opacity: 0.45 }]}
                >
                  <View
                    style={[
                      styles.menuIconBox,
                      { backgroundColor: item.locked ? colors.background : colors.primaryLight },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={item.locked ? colors.textMuted : colors.primary}
                    />
                    {item.locked && (
                      <View style={styles.lockBadge}>
                        <Ionicons name="lock-closed" size={9} color={colors.textMuted} />
                      </View>
                    )}
                    {item.badge && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>{item.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.menuLabel,
                      { color: item.locked ? colors.textMuted : colors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Promo */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <TouchableOpacity
            style={styles.promo}
            onPress={() => setShowModal(true)}
            activeOpacity={0.9}
          >
            <View>
              <Text style={styles.promoTitle}>Upgrade ke Panto+</Text>
              <Text style={styles.promoSub}>untuk voucher harian!</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Recent Transactions */}
        <View style={{ paddingHorizontal: 16 }}>
          <View style={styles.recentHead}>
            <Text style={styles.recentTitle}>Transaksi Terbaru</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Tabs', { screen: 'History' })}
            >
              <Text style={styles.recentLink}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>

          {transactions.length === 0 ? (
            <View style={[styles.txCard, { paddingVertical: 28, alignItems: 'center' }]}>
              <Text style={{ color: colors.textSub }}>Belum ada transaksi</Text>
            </View>
          ) : (
            <View style={styles.txCard}>
              {transactions.map((tx, i) => (
                <View
                  key={tx.id}
                  style={[
                    styles.txRow,
                    i < transactions.length - 1 && styles.txRowDivider,
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={styles.txAvatar}>
                      <Text style={{ fontWeight: '700', color: colors.primary }}>
                        {(tx.merchantName?.charAt(0) || 'T').toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.txName} numberOfLines={1}>
                        {tx.merchantName}
                      </Text>
                      <Text style={styles.txDate}>
                        {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
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
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <ComingSoonModal visible={showModal} onClose={() => setShowModal(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerSafe: { backgroundColor: colors.primary },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  brand: { fontSize: 24, fontWeight: '700', color: '#fff' },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.whiteSofter,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pointsPillText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  balanceValue: { color: '#fff', fontSize: 32, fontWeight: '700', marginTop: 4 },
  balanceSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4, marginBottom: 12 },
  providerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  savedPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16,185,129,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  savedPillText: { fontSize: 13, fontWeight: '600', color: colors.success },

  menuWrap: { padding: 16 },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: radius.card,
    paddingVertical: 16,
    ...shadow.card,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  menuItem: { width: '25%', alignItems: 'center', paddingVertical: 6 },
  menuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lockBadge: { position: 'absolute', right: 2, bottom: 2 },
  newBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: colors.error,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  newBadgeText: { color: '#fff', fontSize: 8, fontWeight: '800', letterSpacing: 0.4 },
  menuLabel: { fontSize: 11, fontWeight: '500', marginTop: 6 },

  promo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: radius.card,
  },
  promoTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  promoSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },

  recentHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  recentLink: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  txCard: {
    backgroundColor: '#fff',
    borderRadius: radius.card,
    overflow: 'hidden',
    ...shadow.card,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  txRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  txAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txName: { fontSize: 14, fontWeight: '600', color: colors.text, maxWidth: 180 },
  txDate: { fontSize: 12, color: colors.textSub },
  txAmount: { fontSize: 14, fontWeight: '700', color: colors.text },
  txSave: { fontSize: 11, color: colors.success, fontWeight: '600' },
});
