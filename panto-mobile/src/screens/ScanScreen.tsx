import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radius, shadow } from '../theme/colors';
import { parseQrPayload } from '../utils/qr';
import { useAuthStore } from '../store/authStore';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tab = 'scan' | 'pay' | 'transfer';

export default function ScanScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('scan');
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);
  const [userQr, setUserQr] = useState('');
  const [ttl, setTtl] = useState(60);

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission, requestPermission]);

  // Rotate user QR every 60s
  useEffect(() => {
    if (tab !== 'pay' || !user) return;
    const refresh = () => {
      const payload = JSON.stringify({
        type: 'panto-user',
        userId: user.id,
        phone: user.phoneNumber,
        issuedAt: new Date().toISOString(),
        ttl: 60,
      });
      setUserQr(payload);
      setTtl(60);
    };
    refresh();
    const tick = setInterval(() => {
      setTtl((t) => {
        if (t <= 1) {
          refresh();
          return 60;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [tab, user]);

  const handleScanned = ({ data }: { data: string }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    const payload = parseQrPayload(data);
    if (!payload) {
      Alert.alert('QR tidak valid', 'Kode QR bukan format Panto.', [
        { text: 'OK', onPress: () => (scannedRef.current = false) },
      ]);
      return;
    }
    if (payload.type === 'panto-merchant') {
      navigation.navigate('Pay', {
        merchantName: payload.merchantName,
        amount: payload.totalBill ?? undefined,
      });
      setTimeout(() => (scannedRef.current = false), 1200);
      return;
    }
    if (payload.type === 'panto-receive') {
      navigation.navigate('Pay', { amount: payload.amount, merchantName: payload.phone });
      setTimeout(() => (scannedRef.current = false), 1200);
      return;
    }
    Alert.alert('QR User', `User: ${(payload as any).phone}`, [
      { text: 'OK', onPress: () => (scannedRef.current = false) },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan QR</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabs}>
        <TabBtn active={tab === 'scan'} label="Scan" onPress={() => setTab('scan')} />
        <TabBtn active={tab === 'pay'} label="Bayar" onPress={() => setTab('pay')} />
        <TabBtn active={tab === 'transfer'} label="Terima" onPress={() => setTab('transfer')} />
      </View>

      {tab === 'scan' && (
        <View style={{ flex: 1 }}>
          {!permission ? (
            <View style={styles.center}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : !permission.granted ? (
            <View style={styles.center}>
              <Ionicons name="camera" size={48} color={colors.primaryLight} />
              <Text style={{ color: '#fff', fontSize: 15, marginTop: 12, textAlign: 'center' }}>
                Izinkan akses kamera untuk scan QR
              </Text>
              <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Berikan Izin</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <CameraView
                style={StyleSheet.absoluteFill}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={handleScanned}
              />
              <View style={styles.overlay}>
                <View style={styles.frame}>
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                </View>
                <Text style={styles.overlayText}>Arahkan kamera ke QR Panto</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {tab === 'pay' && (
        <ScrollView contentContainerStyle={styles.qrWrap}>
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>QR Kamu</Text>
            <Text style={styles.qrSub}>
              Tunjukkan QR ini ke kasir untuk pembayaran
            </Text>
            <View style={styles.qrBox}>
              {userQr ? (
                <QRCode value={userQr} size={240} backgroundColor="#fff" />
              ) : (
                <ActivityIndicator color={colors.primary} />
              )}
            </View>
            <Text style={styles.ttlText}>
              QR akan diperbarui dalam <Text style={{ fontWeight: '700' }}>{ttl}s</Text>
            </Text>
            <Text style={styles.phoneHint}>{user?.phoneNumber}</Text>
          </View>
        </ScrollView>
      )}

      {tab === 'transfer' && (
        <ScrollView contentContainerStyle={styles.qrWrap}>
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>Terima Transfer</Text>
            <Text style={styles.qrSub}>
              Tunjukkan QR ini ke pengirim (Coming Soon)
            </Text>
            <View style={styles.qrBox}>
              <Ionicons name="construct-outline" size={64} color={colors.textMuted} />
            </View>
            <Text style={styles.phoneHint}>Fitur akan segera tersedia</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function TabBtn({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.tabBtn} activeOpacity={0.8}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      {active && <View style={styles.tabBar} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000',
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#000',
    paddingHorizontal: 8,
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  tabBar: {
    height: 3,
    width: 40,
    backgroundColor: colors.primary,
    borderRadius: 2,
    marginTop: 6,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  permBtn: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 260,
    height: 260,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: colors.primary,
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 },
  topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  overlayText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
    fontWeight: '500',
  },

  qrWrap: { padding: 24, alignItems: 'center' },
  qrCard: {
    backgroundColor: '#fff',
    borderRadius: radius.card,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    ...shadow.card,
  },
  qrTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  qrSub: {
    fontSize: 13,
    color: colors.textSub,
    marginTop: 4,
    marginBottom: 20,
    textAlign: 'center',
  },
  qrBox: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 260,
    minHeight: 260,
  },
  ttlText: { fontSize: 13, color: colors.textSub, marginTop: 16 },
  phoneHint: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 6 },
});
