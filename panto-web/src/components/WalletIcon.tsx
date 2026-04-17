import type { WalletProvider } from '../types';

const providerConfig: Record<WalletProvider, { color: string; label: string }> = {
  gopay: { color: '#00aa13', label: 'G' },
  ovo: { color: '#4c3494', label: 'O' },
  dana: { color: '#108ee9', label: 'D' },
  shopeepay: { color: '#ee4d2d', label: 'S' },
  linkaja: { color: '#e82529', label: 'L' },
};

interface WalletIconProps {
  provider: WalletProvider;
  size?: number;
}

export default function WalletIcon({ provider, size = 36 }: WalletIconProps) {
  const config = providerConfig[provider] || { color: '#999', label: '?' };
  const fontSize = size * 0.45;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: config.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontWeight: 700,
        fontSize,
        flexShrink: 0,
      }}
    >
      {config.label}
    </div>
  );
}
