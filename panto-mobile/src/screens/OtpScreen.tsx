import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radius } from '../theme/colors';
import { useAuthStore } from '../store/authStore';
import * as api from '../api/endpoints';
import type { RootStackParamList } from '../navigation/types';

// Demo bypass: typing 123456 on the OTP screen is accepted by the backend in
// development builds. Shown to testers via a hint under the digit boxes.
const DEMO_CODE = '123456';
const RESEND_SECONDS = 30;
const OTP_LENGTH = 6;

type OtpNavProp = NativeStackNavigationProp<RootStackParamList, 'Otp'>;
type OtpRouteProp = RouteProp<RootStackParamList, 'Otp'>;

const formatPhone = (raw: string) => {
  // Normalize to +62xxxxxxxx for display. Accepts +62..., 62..., or 08...
  if (!raw) return '';
  let p = raw.trim();
  if (p.startsWith('+')) return p;
  if (p.startsWith('62')) return `+${p}`;
  if (p.startsWith('0')) return `+62${p.slice(1)}`;
  return `+62${p}`;
};

export default function OtpScreen() {
  const navigation = useNavigation<OtpNavProp>();
  const route = useRoute<OtpRouteProp>();
  const login = useAuthStore((s) => s.login);

  const [otpToken, setOtpToken] = useState(route.params.otpToken);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputRef = useRef<TextInput>(null);

  const phoneDisplay = useMemo(
    () => formatPhone(route.params.phoneNumber),
    [route.params.phoneNumber],
  );

  // Countdown tick.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  // Autofocus the hidden input on mount.
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  const onChangeOtp = (raw: string) => {
    const cleaned = raw.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setOtp(cleaned);
    if (error) setError('');
  };

  const submit = async (codeOverride?: string) => {
    const code = codeOverride ?? otp;
    if (code.length !== OTP_LENGTH) return;
    setError('');
    setLoading(true);
    try {
      const data = await api.verifyOtp(otpToken, code);
      const token = data.accessToken || data.token;
      if (!token || !data.user) throw new Error('Invalid verify response');
      await login(token, data.user);
      // isAuthenticated flips -> RootNavigator swaps to Tabs automatically.
    } catch (err: any) {
      const serverCode = err?.response?.data?.code;
      const serverMessage = err?.response?.data?.message;
      if (serverCode === 'OTP_EXPIRED') {
        setError('Kode kedaluwarsa. Silakan kirim ulang kode.');
      } else if (serverCode === 'INVALID_OTP') {
        setError('Kode OTP salah. Coba lagi.');
      } else {
        setError(serverMessage || 'Verifikasi gagal. Coba lagi.');
      }
      setOtp('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (secondsLeft > 0 || resending) return;
    setError('');
    setResending(true);
    try {
      const data = await api.resendOtp(otpToken);
      if (data?.otpToken) setOtpToken(data.otpToken);
      setSecondsLeft(
        typeof data?.expiresInSeconds === 'number' && data.expiresInSeconds > 0
          ? Math.min(data.expiresInSeconds, RESEND_SECONDS)
          : RESEND_SECONDS,
      );
      setOtp('');
      inputRef.current?.focus();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal mengirim ulang kode.');
    } finally {
      setResending(false);
    }
  };

  const boxes = Array.from({ length: OTP_LENGTH }, (_, i) => i);
  const canSubmit = otp.length === OTP_LENGTH && !loading;
  // The "focused" box is the one the user is about to type into.
  const activeIndex = Math.min(otp.length, OTP_LENGTH - 1);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.topBg} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.brand}>Panto</Text>
            <Text style={styles.tagline}>Verifikasi Nomor HP</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Masukkan Kode OTP</Text>
            <Text style={styles.subtitle}>
              Kode dikirim ke{' '}
              <Text style={styles.phone}>{phoneDisplay || '+62...'}</Text>
            </Text>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={8}
              style={{ alignSelf: 'flex-start', marginBottom: 20 }}
            >
              <Text style={styles.changeNumber}>Ganti nomor</Text>
            </TouchableOpacity>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable onPress={() => inputRef.current?.focus()}>
              <View style={styles.boxesRow}>
                {boxes.map((i) => {
                  const digit = otp[i] ?? '';
                  const isActive = i === activeIndex && otp.length < OTP_LENGTH;
                  const isFilled = !!digit;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.digitBox,
                        isFilled && styles.digitBoxFilled,
                        isActive && styles.digitBoxActive,
                      ]}
                    >
                      <Text style={styles.digitText}>{digit}</Text>
                    </View>
                  );
                })}
              </View>
              <TextInput
                ref={inputRef}
                value={otp}
                onChangeText={onChangeOtp}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                textContentType="oneTimeCode"
                autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
                // Hidden — the visible UI is the boxes above.
                style={styles.hiddenInput}
                caretHidden
                returnKeyType="done"
                onSubmitEditing={() => submit()}
              />
            </Pressable>

            <Text style={styles.demoHint}>Demo: gunakan {DEMO_CODE}</Text>

            <TouchableOpacity
              onPress={() => submit()}
              disabled={!canSubmit}
              activeOpacity={0.85}
              style={[
                styles.submit,
                {
                  backgroundColor: canSubmit
                    ? colors.primary
                    : colors.primaryDisabled,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Verifikasi</Text>
              )}
            </TouchableOpacity>

            <View style={styles.resendRow}>
              {secondsLeft > 0 ? (
                <Text style={styles.resendMuted}>
                  Kirim ulang kode dalam {secondsLeft}s
                </Text>
              ) : (
                <TouchableOpacity
                  onPress={resend}
                  disabled={resending}
                  hitSlop={8}
                >
                  <Text style={styles.resendLink}>
                    {resending ? 'Mengirim...' : 'Kirim ulang kode'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
    backgroundColor: colors.primary,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: { alignItems: 'center', marginBottom: 32 },
  brand: { fontSize: 42, fontWeight: '700', color: '#fff', letterSpacing: -1 },
  tagline: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.card,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSub,
    marginBottom: 4,
  },
  phone: { color: colors.text, fontWeight: '600' },
  changeNumber: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
    marginTop: 4,
  },
  errorBox: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.errorBg,
    borderRadius: radius.sm,
    marginBottom: 16,
  },
  errorText: { color: colors.error, fontSize: 14 },
  boxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  digitBox: {
    width: 46,
    height: 56,
    borderRadius: radius.button,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  digitBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  digitBoxActive: {
    borderColor: colors.primary,
  },
  digitText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 56,
    width: '100%',
  },
  demoHint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  submit: {
    paddingVertical: 14,
    borderRadius: radius.button,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  resendMuted: {
    color: colors.textSub,
    fontSize: 14,
  },
  resendLink: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});
