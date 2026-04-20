import { useState } from 'react';
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radius } from '../theme/colors';
import { useAuthStore } from '../store/authStore';
import * as api from '../api/endpoints';
import type { RootStackParamList } from '../navigation/types';

type LoginNavProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const navigation = useNavigation<LoginNavProp>();
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const data = isRegister
        ? await api.register(phone, name, pin)
        : await api.login(phone, pin);

      // Shape A: direct token — behave as before.
      const token = data.accessToken || data.token;
      if (token) {
        await login(token, data.user);
        return;
      }

      // Shape B: OTP challenge — navigate to OTP screen.
      if (data.otpToken) {
        navigation.navigate('Otp', {
          otpToken: data.otpToken,
          phoneNumber: data.phoneNumber || phone,
        });
        return;
      }

      throw new Error('Invalid auth response');
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          (isRegister ? 'Gagal mendaftar. Coba lagi.' : 'Nomor HP atau PIN salah.')
      );
    } finally {
      setLoading(false);
    }
  };

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
            <Text style={styles.tagline}>Smart Payment Aggregator</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {isRegister ? 'Daftar Akun' : 'Masuk'}
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {isRegister && (
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.label}>Nama Lengkap</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="John Doe"
                  placeholderTextColor="#a3a3a3"
                  style={styles.input}
                />
              </View>
            )}

            <View style={{ marginBottom: 16 }}>
              <Text style={styles.label}>Nomor Telepon</Text>
              <View style={styles.phoneRow}>
                <Text style={styles.prefix}>+62</Text>
                <TextInput
                  value={phone}
                  onChangeText={(v) => setPhone(v.replace(/\D/g, ''))}
                  placeholder="08123456789"
                  placeholderTextColor="#a3a3a3"
                  keyboardType="phone-pad"
                  style={styles.phoneInput}
                />
              </View>
            </View>

            <View style={{ marginBottom: 24 }}>
              <Text style={styles.label}>PIN (6 digit)</Text>
              <TextInput
                value={pin}
                onChangeText={(v) => {
                  const val = v.replace(/\D/g, '');
                  if (val.length <= 6) setPin(val);
                }}
                placeholder="------"
                placeholderTextColor="#c4c4c4"
                secureTextEntry
                keyboardType="number-pad"
                maxLength={6}
                style={styles.pinInput}
              />
            </View>

            <TouchableOpacity
              onPress={submit}
              disabled={loading}
              activeOpacity={0.85}
              style={[
                styles.submit,
                { backgroundColor: loading ? colors.primaryDisabled : colors.primary },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>
                  {isRegister ? 'Daftar' : 'Masuk'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
              <Text style={{ color: colors.textSub, fontSize: 14 }}>
                {isRegister ? 'Sudah punya akun? ' : 'Belum punya akun? '}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsRegister(!isRegister);
                  setError('');
                }}
              >
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>
                  {isRegister ? 'Masuk' : 'Daftar'}
                </Text>
              </TouchableOpacity>
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
  cardTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 20 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSub,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: radius.button,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.button,
  },
  prefix: {
    paddingLeft: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textSub,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 8,
    paddingRight: 16,
    fontSize: 16,
    color: colors.text,
  },
  pinInput: {
    backgroundColor: colors.background,
    borderRadius: radius.button,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    letterSpacing: 12,
    textAlign: 'center',
    color: colors.text,
  },
  submit: {
    paddingVertical: 14,
    borderRadius: radius.button,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  errorBox: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.errorBg,
    borderRadius: radius.sm,
    marginBottom: 16,
  },
  errorText: { color: colors.error, fontSize: 14 },
});
