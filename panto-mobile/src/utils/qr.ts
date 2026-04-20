export interface MerchantQrPayload {
  type: 'panto-merchant';
  merchantId: string;
  merchantName: string;
  merchantCategory?: string;
  totalBill?: number | null;
  issuedAt: string;
}

export interface UserQrPayload {
  type: 'panto-user';
  userId: string;
  phone: string;
  issuedAt: string;
  ttl: number;
}

export interface ReceiveQrPayload {
  type: 'panto-receive';
  userId: string;
  phone: string;
  amount: number;
  txRef: string;
  issuedAt: string;
}

export type PantoQrPayload = MerchantQrPayload | UserQrPayload | ReceiveQrPayload;

export function parseQrPayload(raw: string): PantoQrPayload | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.type === 'string') {
      if (
        parsed.type === 'panto-merchant' ||
        parsed.type === 'panto-user' ||
        parsed.type === 'panto-receive'
      ) {
        return parsed as PantoQrPayload;
      }
    }
    return null;
  } catch {
    return null;
  }
}
