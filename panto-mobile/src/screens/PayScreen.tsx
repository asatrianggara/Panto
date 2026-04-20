import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, formatRp, radius, shadow } from '../theme/colors';
import WalletIcon from '../components/WalletIcon';
import * as api from '../api/endpoints';
import type { RootStackParamList } from '../navigation/types';
import type { SmartPayResult, SplitResult } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Pay'>;
type PayRoute = RouteProp<RootStackParamList, 'Pay'>;

const quickPicks = [
  { name: 'Kopi Kenangan', amount: 35000 },
  { name: 'Indomaret', amount: 50000 },
  { name: 'GrabFood', amount: 75000 },
];

export default function PayScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<PayRoute>();
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [smartPay, setSmartPay] = useState<SmartPayResult | null>(null);
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

  useEffect(() => {
    const params = route.params;
    if (params?.merchantName) setMerchantName(params.merchantName);
    if (params?.amount) setAmount(String(params.amount));
  }, [route.params]);

  const handleCalculate = async () => {
    if (numericAmount < 1000) {
      setError('Minimum pembayaran Rp 1.000');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await api.calculateSplit(numericAmount, merchantName || 'Merchant');
      setSmartPay(data);
      setCustomSplits(data?.splits || []);
      setStep(2);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(', ') : msg || 'Gagal menghitung split. Pastikan ada wallet aktif.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    setProcessing(true);
    try {
      const data = await api.createTransaction({
        merchantName: merchantName || 'Merchant',
        totalAmount: numericAmount,
        splits: customSplits.map((s) => ({ walletId: s.walletId, amount: s.amount })),
      });
      setTxResult({
        id: data.id,
        pointsEarned: data.pointsEarned || 0,
        createdAt: data.createdAt || new Date().toISOString(),
      });
      setStep(3);
    } catch {
      setError('Pembayaran gagal. Coba lagi.');
    } finally {
      setProcessing(false);
    }
  };

  // Step 3: Success
  if (step === 3) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 40 }}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={44} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Pembayaran Berhasil!</Text>

          <View style={styles.successCard}>
            <View style={{ marginBottom: 14 }}>
              <Text style={styles.successLabel}>Merchant</Text>
              <Text style={styles.successValue}>{merchantName || 'Merchant'}</Text>
            </View>
            <View style={{ marginBottom: 14 }}>
              <Text style={styles.successLabel}>Total</Text>
              <Text style={styles.totalBig}>{formatRp(numericAmount)}</Text>
            </View>
            <View style={{ marginBottom: 14 }}>
              <Text style={styles.successLabel}>Waktu</Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>
                {new Date(txResult?.createdAt || '').toLocaleString('id-ID')}
              </Text>
            </View>

            {smartPay && (
              <View style={styles.splitBox}>
                <Text style={styles.breakdownTitle}>Split Breakdown</Text>
                {customSplits.map((split, i) => (
                  <View key={i} style={styles.breakdownRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <WalletIcon provider={split.provider} size={24} />
                      <Text style={{ fontSize: 14, color: colors.text }}>
                        {cap(split.provider)}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '600' }}>
                      {formatRp(split.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {smartPay && smartPay.summary.totalSaving > 0 && (
              <View style={[styles.hemat, { backgroundColor: colors.successBg }]}>
                <Text style={{ color: colors.success, fontWeight: '600' }}>Total Hemat</Text>
                <Text style={{ color: colors.success, fontWeight: '700' }}>
                  {formatRp(smartPay.summary.totalSaving)}
                </Text>
              </View>
            )}

            {txResult && txResult.pointsEarned > 0 && (
              <View style={[styles.hemat, { backgroundColor: colors.warningBg }]}>
                <Text style={{ color: colors.warning, fontWeight: '600' }}>
                  Poin Diperoleh
                </Text>
                <Text style={{ color: colors.warning, fontWeight: '700' }}>
                  +{txResult.pointsEarned}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Tabs', { screen: 'Home' })}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Kembali ke Home</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Processing
  if (processing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 20, fontSize: 16, fontWeight: '600', color: colors.text }}>
            Memproses pembayaran...
          </Text>
          <Text style={{ marginTop: 8, fontSize: 13, color: colors.textSub }}>
            Mohon tunggu sebentar
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Step 2
  if (step === 2 && smartPay) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <TouchableOpacity
            style={styles.backRow}
            onPress={() => setStep(1)}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={18} color={colors.textSub} />
            <Text style={styles.backText}>Kembali</Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 14, color: colors.textSub }}>
            {merchantName || 'Merchant'}
          </Text>
          <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 16, color: colors.text }}>
            {formatRp(numericAmount)}
          </Text>

          <View style={styles.splitCard}>
            <View style={styles.splitHead}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                Recommended Split
              </Text>
              <TouchableOpacity onPress={() => setIsCustomizing(!isCustomizing)}>
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
                  {isCustomizing ? 'Selesai' : 'Customize'}
                </Text>
              </TouchableOpacity>
            </View>

            {customSplits.map((split, i) => {
              const pct = numericAmount > 0 ? (split.amount / numericAmount) * 100 : 0;
              return (
                <View key={i} style={{ marginBottom: 14 }}>
                  <View style={styles.splitRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <WalletIcon provider={split.provider} size={32} />
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                        {cap(split.provider)}
                      </Text>
                    </View>
                    {isCustomizing ? (
                      <TextInput
                        value={String(split.amount)}
                        onChangeText={(v) => {
                          const val = parseInt(v.replace(/\D/g, ''), 10) || 0;
                          setCustomSplits((prev) => {
                            const next = [...prev];
                            next[i] = { ...next[i], amount: val };
                            return next;
                          });
                        }}
                        keyboardType="number-pad"
                        style={styles.splitInput}
                      />
                    ) : (
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                        {formatRp(split.amount)}
                      </Text>
                    )}
                  </View>

                  <View style={styles.pctBar}>
                    <View
                      style={[
                        styles.pctFill,
                        { width: `${Math.min(100, pct)}%`, backgroundColor: colors.primary },
                      ]}
                    />
                  </View>
                  <Text style={styles.pctText}>
                    {pct.toFixed(0)}%
                    {split.promo ? `  ·  Promo: ${split.promo}` : ''}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.summaryCard}>
            <Row label="Total" value={formatRp(smartPay.summary.totalAmount)} />
            <Row
              label="Fee"
              value={
                smartPay.summary.totalFee === 0 ? 'GRATIS' : formatRp(smartPay.summary.totalFee)
              }
              valueColor={smartPay.summary.totalFee === 0 ? colors.success : colors.text}
            />
            {smartPay.summary.totalSaving > 0 && (
              <Row
                label="Hemat"
                value={formatRp(smartPay.summary.totalSaving)}
                labelColor={colors.success}
                valueColor={colors.success}
              />
            )}
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handlePay}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Bayar {formatRp(numericAmount)}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Step 1
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            style={styles.backRow}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={18} color={colors.textSub} />
            <Text style={styles.backText}>Kembali</Text>
          </TouchableOpacity>

          <Text style={styles.h1}>Pembayaran Baru</Text>

          <View style={styles.inputCard}>
            <View style={styles.inputHead}>
              <Text style={styles.inputLabelUpper}>Jumlah Pembayaran</Text>
              {!!amount && (
                <TouchableOpacity onPress={() => setAmount('')}>
                  <Text style={{ color: colors.textSub, fontSize: 11, fontWeight: '600' }}>
                    Hapus
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.rpPrefix}>Rp</Text>
              <TextInput
                value={amount ? parseInt(amount, 10).toLocaleString('id-ID') : ''}
                onChangeText={(v) => setAmount(v.replace(/\D/g, ''))}
                placeholder="0"
                placeholderTextColor="#d4d4d4"
                keyboardType="number-pad"
                style={styles.amountInput}
              />
            </View>
          </View>

          <View style={styles.inputCard}>
            <Text style={styles.inputLabelUpper}>Nama Merchant</Text>
            <TextInput
              value={merchantName}
              onChangeText={setMerchantName}
              placeholder="Ketik nama merchant (opsional)"
              placeholderTextColor="#9ca3af"
              style={styles.merchantInput}
            />
          </View>

          <View style={styles.quickPicks}>
            {quickPicks.map((q) => (
              <TouchableOpacity
                key={q.name}
                style={styles.quickPick}
                onPress={() => {
                  setAmount(String(q.amount));
                  setMerchantName(q.name);
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }}>
                  {q.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              {
                backgroundColor:
                  loading || numericAmount < 1 ? colors.primaryDisabled : colors.primary,
              },
            ]}
            disabled={loading || numericAmount < 1}
            onPress={handleCalculate}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Find Best Split</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  labelColor = colors.textSub,
  valueColor = colors.text,
}: {
  label: string;
  value: string;
  labelColor?: string;
  valueColor?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
      <Text style={{ fontSize: 14, color: labelColor, fontWeight: '500' }}>{label}</Text>
      <Text style={{ fontSize: 14, color: valueColor, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '700', marginBottom: 20, color: colors.text },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  backText: { fontSize: 14, color: colors.textSub },

  inputCard: {
    backgroundColor: '#fff',
    borderRadius: radius.card,
    padding: 20,
    marginBottom: 16,
    ...shadow.card,
  },
  inputHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabelUpper: {
    fontSize: 11,
    color: colors.textSub,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: colors.divider,
    paddingBottom: 6,
  },
  rpPrefix: { fontSize: 22, fontWeight: '700', color: colors.textSub },
  amountInput: {
    flex: 1,
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
    padding: 0,
  },
  merchantInput: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    padding: 0,
  },
  quickPicks: { flexDirection: 'row', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  quickPick: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    ...shadow.card,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.button,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  splitCard: {
    backgroundColor: '#fff',
    borderRadius: radius.card,
    padding: 20,
    marginBottom: 16,
    ...shadow.card,
  },
  splitHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  splitInput: {
    width: 110,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.background,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    color: colors.text,
  },
  pctBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.divider,
    overflow: 'hidden',
  },
  pctFill: { height: 6, borderRadius: 3 },
  pctText: { fontSize: 11, color: colors.textSub, marginTop: 4, textAlign: 'right' },

  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: radius.card,
    padding: 20,
    marginBottom: 24,
    ...shadow.card,
  },

  errorBox: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.errorBg,
    borderRadius: radius.sm,
    marginBottom: 16,
  },
  errorText: { color: colors.error, fontSize: 14 },

  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.text,
    marginBottom: 8,
  },
  successCard: {
    backgroundColor: '#fff',
    borderRadius: radius.card,
    padding: 20,
    marginVertical: 24,
    ...shadow.card,
  },
  successLabel: { fontSize: 12, color: colors.textSub },
  successValue: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 2 },
  totalBig: { fontSize: 22, fontWeight: '700', color: colors.primary, marginTop: 2 },
  splitBox: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 16,
    marginBottom: 16,
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSub,
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  hemat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
});
