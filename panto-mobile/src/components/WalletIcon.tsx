import { View, Text } from 'react-native';
import type { WalletProvider } from '../types';

const providerConfig: Record<WalletProvider, { color: string; label: string }> = {
  gopay: { color: '#00aa13', label: 'G' },
  ovo: { color: '#4c3494', label: 'O' },
  dana: { color: '#108ee9', label: 'D' },
  shopeepay: { color: '#ee4d2d', label: 'S' },
  linkaja: { color: '#e82529', label: 'L' },
};

interface Props {
  provider: WalletProvider;
  size?: number;
}

export default function WalletIcon({ provider, size = 36 }: Props) {
  const config = providerConfig[provider] || { color: '#999', label: '?' };
  const fontSize = size * 0.45;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: config.color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#ffffff', fontWeight: '700', fontSize }}>
        {config.label}
      </Text>
    </View>
  );
}
