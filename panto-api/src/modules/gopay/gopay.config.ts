export interface GoPayConfig {
  serverKey: string;
  clientKey: string;
  redirectUrl: string;
  frontendCallbackUrl: string;
  baseUrl: string;
  env: 'sandbox' | 'production';
}

const SANDBOX_BASE = 'https://api.sandbox.midtrans.com';
const PROD_BASE    = 'https://api.midtrans.com';

export function loadGoPayConfig(): GoPayConfig | null {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return null;

  const env = (process.env.MIDTRANS_ENV as 'sandbox' | 'production') || 'sandbox';

  return {
    serverKey,
    clientKey:           process.env.MIDTRANS_CLIENT_KEY || '',
    redirectUrl:         process.env.GOPAY_REDIRECT_URL          || 'https://www.gojek.com',
    frontendCallbackUrl: process.env.GOPAY_FRONTEND_CALLBACK_URL || 'http://localhost:5173/gopay/callback',
    baseUrl:             process.env.MIDTRANS_BASE_URL  || (env === 'production' ? PROD_BASE : SANDBOX_BASE),
    env,
  };
}
