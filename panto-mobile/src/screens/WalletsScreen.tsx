import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, formatRp, radius, shadow } from '../theme/colors';
import WalletIcon from '../components/WalletIcon';
import Loader from '../components/Loader';
import * as api from '../api/endpoints';
import type { Wallet, WalletProvider } from '../types';

const providerNames: Record<WalletProvider, string> = {
  gopay: 'GoPay',
  ovo: 'OVO',
  dana: 'DANA',
  shopeepay: 'ShopeePay',
  linkaja: 'LinkAja',
};
const providerOptions: WalletProvider[] = ['gopay', 'ovo', 'dana', 'shopeepay', 'linkaja'];

export default function WalletsScreen() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [linkProvider, setLinkProvider] = useState<WalletProvider>('ovo');
  const [linkPhone, setLinkPhone] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // GoPay/DANA bind state
  const [bindProvider, setBindProvider] = useState<'gopay' | 'dana' | null>(null);
  const [bindPhone, setBindPhone] = useState('');
  const [bindLoading, setBindLoading] = useState(false);

  const fetchWallets = useCallback(async () => {
    try {
      const data = await api.getWallets();
      setWallets(data);
    } catch {
      setError('Gagal memuat dompet');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWallets();
    setRefreshing(false);
  };

  const totalBalance = wallets.reduce((s, w) => s + (w.isActive ? w.balance : 0), 0);
  const danaWallet = wallets.find((w) => w.provider === 'dana');
  const gopayWallet = wallets.find((w) => w.provider === 'gopay');
  const others = wallets.filter((w) => w.provider !== 'dana' && w.provider !== 'gopay');

  const handleLink = async () => {
    if (!linkPhone) return;
    setLinkLoading(true);
    try {
      if (linkProvider === 'gopay' || linkProvider === 'dana') {
        if (linkProvider === 'gopay') await api.gopaySimulateBind(linkPhone);
        else await api.danaSimulateBind(linkPhone);
      } else {
        await api.linkWallet(linkProvider, linkPhone);
      }
      setShowLink(false);
      setLinkPhone('');
      await fetchWallets();
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
        prev.map((w) => (w.id === wallet.id ? { ...w, inRouting: !w.inRouting } : w)),
      );
    } catch {
      setError('Gagal mengubah routing');
    }
  };

  const handleSync = async (wallet: Wallet) => {
    setSyncingId(wallet.id);
    const random = Math.floor(Math.random() * (500000 - 900 + 1)) + 900;
    try {
      await api.updateWallet(wallet.id, { balance: random });
      setWallets((prev) =>
        prev.map((w) => (w.id === wallet.id ? { ...w, balance: random } : w)),
      );
    } catch {} finally {
      setTimeout(() => setSyncingId(null), 500);
    }
  };

  const handleUnlink = (wallet: Wallet) => {
    Alert.alert('Putuskan Wallet', `Putuskan ${providerNames[wallet.provider]}?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Putuskan',
        style: 'destructive',
        onPress: async () => {
          setUnlinkingId(wallet.id);
          try {
            if (wallet.provider === 'gopay') await api.gopayUnbind();
            else if (wallet.provider === 'dana') await api.danaUnbind();
            else await api.unlinkWallet(wallet.id);
            await fetchWallets();
          } catch {
            setError('Gagal memutuskan wallet');
          } finally {
            setUnlinkingId(null);
          }
        },
      },
    ]);
  };

  const handleBind = async (provider: 'gopay' | 'dana') => {
    if (!bindPhone) return;
    setBindLoading(true);
    try {
      if (provider === 'gopay') {
        await api.gopayStartBind(bindPhone).catch(() => api.gopaySimulateBind(bindPhone));
      } else {
        await api.danaStartBind(bindPhone).catch(() => api.danaSimulateBind(bindPhone));
      }
      setBindProvider(null);
      setBindPhone('');
      await fetchWallets();
    } catch {
      setError(`Gagal menghubungkan ${provider.toUpperCase()}`);
    } finally {
      setBindLoading(false);
    }
  };

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
        <Text style={styles.h1}>Dompet Digital</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Total Balance */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Saldo</Text>
          <Text style={styles.totalAmount}>{formatRp(totalBalance)}</Text>
          <Text style={styles.totalSub}>
            {wallets.filter((w) => w.isActive).length} dompet aktif
          </Text>
        </View>

        {/* GoPay */}
        {gopayWallet ? (
          <WalletCard
            wallet={gopayWallet}
            syncing={syncingId === gopayWallet.id}
            unlinking={unlinkingId === gopayWallet.id}
            onSync={() => handleSync(gopayWallet)}
            onToggleRouting={() => handleToggleRouting(gopayWallet)}
            onUnlink={() => handleUnlink(gopayWallet)}
          />
        ) : (
          <BindCard
            provider="gopay"
            active={bindProvider === 'gopay'}
            phone={bindPhone}
            setPhone={setBindPhone}
            loading={bindLoading}
            onToggle={() => {
              setBindProvider(bindProvider === 'gopay' ? null : 'gopay');
              setBindPhone('');
            }}
            onSubmit={() => handleBind('gopay')}
          />
        )}

        {/* DANA */}
        {danaWallet ? (
          <WalletCard
            wallet={danaWallet}
            syncing={syncingId === danaWallet.id}
            unlinking={unlinkingId === danaWallet.id}
            onSync={() => handleSync(danaWallet)}
            onToggleRouting={() => handleToggleRouting(danaWallet)}
            onUnlink={() => handleUnlink(danaWallet)}
          />
        ) : (
          <BindCard
            provider="dana"
            active={bindProvider === 'dana'}
            phone={bindPhone}
            setPhone={setBindPhone}
            loading={bindLoading}
            onToggle={() => {
              setBindProvider(bindProvider === 'dana' ? null : 'dana');
              setBindPhone('');
            }}
            onSubmit={() => handleBind('dana')}
          />
        )}

        {/* Other wallets */}
        {others.map((w) => (
          <WalletCard
            key={w.id}
            wallet={w}
            syncing={syncingId === w.id}
            unlinking={unlinkingId === w.id}
            onSync={() => handleSync(w)}
            onToggleRouting={() => handleToggleRouting(w)}
            onUnlink={() => handleUnlink(w)}
          />
        ))}

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.linkBtn}
          onPress={() => setShowLink(true)}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.linkBtnText}>Hubungkan Wallet Lain</Text>
        </TouchableOpacity>
      </ScrollView>

      <LinkModal
        visible={showLink}
        provider={linkProvider}
        setProvider={setLinkProvider}
        phone={linkPhone}
        setPhone={setLinkPhone}
        loading={linkLoading}
        onClose={() => setShowLink(false)}
        onLink={handleLink}
      />
    </SafeAreaView>
  );
}

function WalletCard({
  wallet,
  syncing,
  unlinking,
  onSync,
  onToggleRouting,
  onUnlink,
}: {
  wallet: Wallet;
  syncing: boolean;
  unlinking: boolean;
  onSync: () => void;
  onToggleRouting: () => void;
  onUnlink: () => void;
}) {
  return (
    <View style={styles.walletCard}>
      <View style={styles.walletHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <WalletIcon provider={wallet.provider} size={40} />
          <View>
            <Text style={styles.walletName}>{providerNames[wallet.provider]}</Text>
            <Text style={styles.walletPhone}>{wallet.providerPhone}</Text>
          </View>
        </View>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: wallet.isActive ? colors.successBg : colors.errorBg },
          ]}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: wallet.isActive ? colors.success : colors.error,
            }}
          >
            {wallet.isActive ? 'Aktif' : 'Tidak Aktif'}
          </Text>
        </View>
      </View>

      <View style={styles.walletRow}>
        <View>
          <Text style={{ fontSize: 12, color: colors.textSub }}>Saldo</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.walletBalance}>{formatRp(wallet.balance)}</Text>
            <TouchableOpacity
              onPress={onSync}
              disabled={syncing}
              style={styles.syncBtn}
              activeOpacity={0.8}
            >
              {syncing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="refresh" size={14} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Toggle value={wallet.inRouting} onPress={onToggleRouting} />
          <TouchableOpacity
            onPress={onUnlink}
            disabled={unlinking}
            style={styles.unlinkBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="unlink" size={12} color={colors.error} />
            <Text style={styles.unlinkText}>
              {unlinking ? 'Memutus...' : 'Putus'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function Toggle({ value, onPress }: { value: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.toggle,
        { backgroundColor: value ? colors.primary : colors.textMuted },
      ]}
    >
      <View style={[styles.toggleKnob, { left: value ? 22 : 2 }]} />
    </TouchableOpacity>
  );
}

function BindCard({
  provider,
  active,
  phone,
  setPhone,
  loading,
  onToggle,
  onSubmit,
}: {
  provider: 'gopay' | 'dana';
  active: boolean;
  phone: string;
  setPhone: (v: string) => void;
  loading: boolean;
  onToggle: () => void;
  onSubmit: () => void;
}) {
  const brandColor = provider === 'gopay' ? colors.gopay : colors.dana;
  const brandBg = provider === 'gopay' ? colors.gopayBg : colors.danaBg;

  return (
    <View
      style={[
        styles.bindCard,
        { borderColor: brandColor, backgroundColor: active ? brandBg : '#f9fffa' },
      ]}
    >
      <TouchableOpacity
        style={styles.bindHeader}
        onPress={onToggle}
        activeOpacity={0.85}
      >
        <WalletIcon provider={provider} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={styles.bindTitle}>Hubungkan {providerNames[provider]}</Text>
          <Text style={styles.bindSub}>
            Link akun {providerNames[provider]} untuk split payment otomatis
          </Text>
        </View>
        <Ionicons name="open-outline" size={18} color={brandColor} />
      </TouchableOpacity>

      {active && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <View style={[styles.bindHint, { backgroundColor: brandBg }]}>
            <Ionicons name="shield-checkmark" size={16} color={brandColor} />
            <Text style={[styles.bindHintText, { color: brandColor }]}>
              Panto akan terhubung ke akun {providerNames[provider]} kamu. Data kamu aman
              dan terenkripsi.
            </Text>
          </View>

          <Text style={styles.bindLabel}>Nomor HP terdaftar</Text>
          <TextInput
            value={phone}
            onChangeText={(v) => setPhone(v.replace(/\D/g, ''))}
            placeholder="08123456789"
            placeholderTextColor="#a3a3a3"
            keyboardType="phone-pad"
            style={[styles.bindInput, { borderColor: brandColor }]}
          />

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onSubmit}
            disabled={loading || !phone}
            style={[
              styles.bindSubmit,
              { backgroundColor: !phone ? '#a3d4f7' : brandColor },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.bindSubmitText}>
                Hubungkan Akun {providerNames[provider]}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function LinkModal({
  visible,
  provider,
  setProvider,
  phone,
  setPhone,
  loading,
  onClose,
  onLink,
}: {
  visible: boolean;
  provider: WalletProvider;
  setProvider: (p: WalletProvider) => void;
  phone: string;
  setPhone: (v: string) => void;
  loading: boolean;
  onClose: () => void;
  onLink: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Hubungkan Wallet</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSub} />
            </TouchableOpacity>
          </View>

          <Text style={styles.bindLabel}>Pilih Provider</Text>
          <View style={styles.providerRow}>
            {providerOptions.map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setProvider(p)}
                style={[
                  styles.providerChip,
                  provider === p && { backgroundColor: colors.primaryLight },
                ]}
              >
                <WalletIcon provider={p} size={22} />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    marginTop: 4,
                    color: provider === p ? colors.primary : colors.text,
                  }}
                >
                  {providerNames[p]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.bindLabel, { marginTop: 16 }]}>Nomor Telepon</Text>
          <TextInput
            value={phone}
            onChangeText={(v) => setPhone(v.replace(/\D/g, ''))}
            placeholder="08123456789"
            placeholderTextColor="#a3a3a3"
            keyboardType="phone-pad"
            style={styles.sheetInput}
          />

          <TouchableOpacity
            onPress={onLink}
            disabled={loading || !phone}
            activeOpacity={0.85}
            style={[
              styles.sheetSubmit,
              { backgroundColor: !phone || loading ? colors.primaryDisabled : colors.primary },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.bindSubmitText}>Hubungkan</Text>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 16 },
  errorBox: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.errorBg,
    borderRadius: radius.sm,
    marginBottom: 14,
  },
  errorText: { color: colors.error, fontSize: 14 },

  totalCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: 20,
    marginBottom: 20,
  },
  totalLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  totalAmount: { color: '#fff', fontSize: 28, fontWeight: '700', marginTop: 4 },
  totalSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },

  walletCard: {
    backgroundColor: '#fff',
    borderRadius: radius.card,
    marginBottom: 16,
    padding: 16,
    ...shadow.card,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletName: { fontSize: 15, fontWeight: '700', color: colors.text },
  walletPhone: { fontSize: 12, color: colors.textSub, marginTop: 2 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  walletBalance: { fontSize: 18, fontWeight: '700', color: colors.text },
  syncBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    position: 'absolute',
    top: 2,
  },
  unlinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.errorBg,
    borderRadius: 8,
  },
  unlinkText: { fontSize: 11, fontWeight: '700', color: colors.error },

  bindCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: radius.card,
    marginBottom: 16,
    overflow: 'hidden',
  },
  bindHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  bindTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  bindSub: { fontSize: 12, color: colors.textSub, marginTop: 2 },
  bindHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radius.sm,
    marginBottom: 14,
  },
  bindHintText: { fontSize: 11, fontWeight: '600', flex: 1 },
  bindLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSub,
    marginBottom: 6,
  },
  bindInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: 12,
  },
  bindSubmit: {
    paddingVertical: 13,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  bindSubmitText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.button,
    marginTop: 4,
  },
  linkBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  sheetHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  providerRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  providerChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    minWidth: 78,
  },
  sheetInput: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.button,
    fontSize: 15,
    color: colors.text,
    marginBottom: 24,
  },
  sheetSubmit: {
    paddingVertical: 14,
    borderRadius: radius.button,
    alignItems: 'center',
  },
});
