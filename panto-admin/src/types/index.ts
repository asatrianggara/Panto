export type AdminRole = 'super_admin' | 'admin' | 'support' | 'read_only';

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
}

export interface LoginResponse {
  token: string;
  admin: AdminUser;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export type TxStatus = 'pending' | 'processing' | 'success' | 'failed';

export type WalletProvider =
  | 'gopay'
  | 'ovo'
  | 'dana'
  | 'shopeepay'
  | 'linkaja';

export interface DashboardOverview {
  totalUsers: number;
  activeUsers: number;
  totalWallets: number;
  activeWallets: number;
  transactionsToday: number;
  transactionVolumeToday: number;
  failedTransactionsToday: number;
  newUsersToday: number;
}

export interface UserListItem {
  id: string;
  phoneNumber: string;
  name: string;
  email: string | null;
  tier: 'free' | 'plus';
  isActive: boolean;
  walletCount: number;
  createdAt: string;
}

export interface UserDetail {
  id: string;
  phoneNumber: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  tier: 'free' | 'plus';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stats: {
    walletCount: number;
    activeWalletCount: number;
    totalBalance: number;
    transactionCount: number;
    successfulTransactions: number;
    totalSpent: number;
  };
}

export interface UserWallet {
  id: string;
  provider: WalletProvider;
  providerPhone: string;
  balance: number;
  isActive: boolean;
  inRouting: boolean;
  isRealLinked: boolean;
  lastSynced: string | null;
  linkedAt: string;
}

export interface UserTransactionBrief {
  id: string;
  type: string;
  merchantName: string | null;
  totalAmount: number;
  status: TxStatus;
  createdAt: string;
}

export interface ActivityEvent {
  type: 'transaction' | 'wallet_linked';
  timestamp: string;
  summary: string;
  refId: string;
}

export interface WalletListItem {
  id: string;
  userId: string;
  userName: string | null;
  userPhone: string | null;
  provider: WalletProvider;
  providerPhone: string;
  balance: number;
  isActive: boolean;
  inRouting: boolean;
  isRealLinked: boolean;
  lastSynced: string | null;
  linkedAt: string;
}

export interface WalletSummary {
  byProvider: Array<{
    provider: string;
    walletCount: number;
    activeCount: number;
    totalBalance: number;
    realLinkedCount: number;
  }>;
  totals: {
    walletCount: number;
    activeCount: number;
    totalBalance: number;
  };
}

export interface TransactionListItem {
  id: string;
  userId: string;
  userName: string | null;
  userPhone: string | null;
  type: string;
  merchantName: string | null;
  merchantCategory: string | null;
  totalAmount: number;
  totalFee: number;
  totalSaving: number;
  status: TxStatus;
  createdAt: string;
  completedAt: string | null;
}

export interface TransactionDetail {
  id: string;
  userId: string;
  user: { id: string; name: string; phoneNumber: string } | null;
  type: string;
  merchantName: string | null;
  merchantCategory: string | null;
  totalAmount: number;
  totalFee: number;
  totalSaving: number;
  pointsEarned: number;
  status: TxStatus;
  idempotencyKey: string;
  createdAt: string;
  completedAt: string | null;
  splits: Array<{
    id: string;
    walletId: string;
    provider: string;
    amount: number;
    fee: number;
    promoSaving: number;
    status: TxStatus;
    processedAt: string | null;
  }>;
}
