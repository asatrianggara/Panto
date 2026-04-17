export interface DanaConfig {
  clientId: string;
  privateKey?: string;
  privateKeyPath?: string;
  clientSecret: string;
  origin: string;
  merchantId: string;
  env: 'sandbox' | 'production';
}

export function loadDanaConfig(): DanaConfig {
  const clientId = process.env.DANA_CLIENT_ID;
  if (!clientId) {
    throw new Error('DANA_CLIENT_ID is required in .env');
  }

  return {
    clientId,
    privateKey: process.env.DANA_PRIVATE_KEY,
    privateKeyPath: process.env.DANA_PRIVATE_KEY_PATH,
    clientSecret: process.env.DANA_CLIENT_SECRET || '',
    origin: process.env.DANA_ORIGIN || 'http://gapurapay.com',
    merchantId: process.env.DANA_MERCHANT_ID || '',
    env: (process.env.DANA_ENV as 'sandbox' | 'production') || 'sandbox',
  };
}
