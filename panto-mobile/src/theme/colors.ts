export const colors = {
  primary: '#0047bf',
  primaryDark: '#0035a0',
  primaryLight: '#e8effc',
  primaryDisabled: '#93b4e8',
  background: '#f0f2f5',
  card: '#ffffff',
  text: '#1a1a2e',
  textSub: '#6b7280',
  textMuted: '#9ca3af',
  border: '#e5e7eb',
  divider: '#f0f2f5',
  success: '#10b981',
  successBg: '#ecfdf5',
  warning: '#f59e0b',
  warningBg: '#fffbeb',
  error: '#ef4444',
  errorBg: '#fef2f2',
  dana: '#108ee9',
  danaBg: '#e6f4ff',
  danaBorder: '#d4e8f7',
  gopay: '#00aa13',
  gopayBg: '#dcfce7',
  gopayBorder: '#bbf7d0',
  ovo: '#4c3494',
  shopeepay: '#ee4d2d',
  linkaja: '#e82529',
  shadow: 'rgba(0,0,0,0.06)',
  overlay: 'rgba(0,0,0,0.5)',
  whiteSoft: 'rgba(255,255,255,0.7)',
  whiteSofter: 'rgba(255,255,255,0.15)',
};

export const radius = {
  card: 16,
  button: 12,
  sm: 10,
  xs: 8,
  pill: 20,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  fab: {
    shadowColor: '#0047bf',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const formatRp = (amount: number): string =>
  'Rp ' + (amount || 0).toLocaleString('id-ID');
