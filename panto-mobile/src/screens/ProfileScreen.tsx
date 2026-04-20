import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, formatRp, radius, shadow } from '../theme/colors';
import ComingSoonModal from '../components/ComingSoonModal';
import Loader from '../components/Loader';
import { useAuthStore } from '../store/authStore';
import * as api from '../api/endpoints';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(user?.name || '');
  const [stats, setStats] = useState({ totalTransactions: 0, totalSaved: 0, points: 0 });

  const fetchData = useCallback(async () => {
    try {
      const [me, st, pts] = await Promise.allSettled([
        api.getMe(),
        api.getMyStats(),
        api.getPoints(),
      ]);
      if (me.status === 'fulfilled' && me.value) {
        await setUser(me.value);
        setNameValue(me.value.name || '');
      }
      if (st.status === 'fulfilled' && st.value) {
        setStats((p) => ({
          ...p,
          totalTransactions: st.value.totalTransactions || 0,
          totalSaved: st.value.totalSaved || 0,
        }));
      }
      if (pts.status === 'fulfilled' && pts.value) {
        setStats((p) => ({ ...p, points: pts.value.balance || 0 }));
      }
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveName = async () => {
    if (!nameValue.trim()) return;
    try {
      const updated = await api.updateMe({ name: nameValue.trim() });
      if (updated) await setUser(updated);
      setEditingName(false);
    } catch {}
  };

  const handleLogout = () => {
    Alert.alert('Keluar', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const initials = (user?.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const settingsItems: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
  }[] = [
    { icon: 'notifications-outline', label: 'Notifikasi' },
    { icon: 'globe-outline', label: 'Bahasa' },
    { icon: 'color-palette-outline', label: 'Tema' },
    { icon: 'shield-checkmark-outline', label: 'Keamanan' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Loader />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View style={styles.avatar}>
            <Text style={{ color: '#fff', fontSize: 26, fontWeight: '700' }}>{initials}</Text>
          </View>

          {editingName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <TextInput
                value={nameValue}
                onChangeText={setNameValue}
                onSubmitEditing={handleSaveName}
                autoFocus
                style={styles.nameInput}
              />
              <TouchableOpacity style={styles.nameSaveBtn} onPress={handleSaveName}>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
                {user?.name || 'User'}
              </Text>
              <TouchableOpacity onPress={() => setEditingName(true)}>
                <Ionicons name="pencil" size={14} color={colors.textSub} />
              </TouchableOpacity>
            </View>
          )}
          <Text style={{ fontSize: 14, color: colors.textSub, marginTop: 4 }}>
            {user?.phoneNumber || ''}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard
            value={stats.points.toLocaleString('id-ID')}
            label="PantoPoints"
            color={colors.warning}
          />
          <StatCard
            value={String(stats.totalTransactions)}
            label="Total Transaksi"
            color={colors.primary}
          />
          <StatCard
            value={formatRp(stats.totalSaved)}
            label="Total Hemat"
            color={colors.success}
          />
        </View>

        <View style={styles.promoCard}>
          <View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Panto+</Text>
            <Text style={{ fontSize: 13, color: colors.textSub }}>Free Plan</Text>
          </View>
          <TouchableOpacity style={styles.upgradeBtn} onPress={() => setShowModal(true)}>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>
              Upgrade
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingsBlock}>
          {settingsItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => setShowModal(true)}
              activeOpacity={0.7}
              style={[
                styles.settingsRow,
                i < settingsItems.length - 1 && styles.settingsDivider,
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name={item.icon} size={18} color={colors.textSub} />
                <Text style={{ fontSize: 15, color: colors.text, fontWeight: '500' }}>
                  {item.label}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={{ color: colors.error, fontSize: 15, fontWeight: '700' }}>Keluar</Text>
        </TouchableOpacity>
      </ScrollView>

      <ComingSoonModal visible={showModal} onClose={() => setShowModal(false)} />
    </SafeAreaView>
  );
}

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statVal, { color }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInput: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.background,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    minWidth: 160,
    textAlign: 'center',
  },
  nameSaveBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    ...shadow.card,
  },
  statVal: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 11, color: colors.textSub, fontWeight: '500', marginTop: 2 },
  promoCard: {
    backgroundColor: '#fff',
    borderRadius: radius.card,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow.card,
  },
  upgradeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
  },
  settingsBlock: {
    backgroundColor: '#fff',
    borderRadius: radius.card,
    marginBottom: 20,
    ...shadow.card,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  settingsDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: radius.button,
    paddingVertical: 14,
    ...shadow.card,
  },
});
