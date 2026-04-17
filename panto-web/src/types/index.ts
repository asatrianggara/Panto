export type WalletProvider = 'gopay' | 'ovo' | 'dana' | 'shopeepay' | 'linkaja';

export interface User {
  id: string;
  phoneNumber: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  tier: string;
  createdAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  provider: WalletProvider;
  providerPhone: string;
  balance: number;
  isActive: boolean;
  inRouting: boolean;
  transferFee: number;
  lastSynced: string;
  linkedAt: string;
  isRealLinked?: boolean;
  providerAccessToken?: string;
}

export interface TransactionSplit {
  id: string;
  transactionId: string;
  walletId: string;
  provider: WalletProvider;
  amount: number;
  fee: number;
  promoSaving: number;
  status: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: string;
  merchantName: string;
  merchantCategory: string;
  totalAmount: number;
  totalFee: number;
  totalSaving: number;
  pointsEarned: number;
  status: string;
  createdAt: string;
  completedAt?: string;
  splits?: TransactionSplit[];
}

export interface SplitResult {
  walletId: string;
  provider: WalletProvider;
  amount: number;
  percentage: number;
  promo?: string;
}

export interface SmartPayResult {
  splits: SplitResult[];
  summary: {
    totalAmount: number;
    totalFee: number;
    totalSaving: number;
    walletsUsed: number;
  };
}

export interface PointsBalance {
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
  monthlyEarned: number;
}

export interface PointsLog {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}
