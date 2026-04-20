import client from './client';
import type {
  ActivityEvent,
  DashboardOverview,
  Paginated,
  TransactionDetail,
  TransactionListItem,
  UserDetail,
  UserListItem,
  UserTransactionBrief,
  UserWallet,
  WalletListItem,
  WalletSummary,
} from '@/types';

type Query = Record<string, string | number | boolean | undefined>;

function toParams(q: Query) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined && v !== '' && v !== null) out[k] = String(v);
  }
  return out;
}

// Dashboard
export async function fetchDashboardOverview() {
  const { data } = await client.get<DashboardOverview>('/dashboard/overview');
  return data;
}

// Users
export async function fetchUsers(params: Query = {}) {
  const { data } = await client.get<Paginated<UserListItem>>('/users', {
    params: toParams(params),
  });
  return data;
}

export async function fetchUser(id: string) {
  const { data } = await client.get<UserDetail>(`/users/${id}`);
  return data;
}

export async function fetchUserWallets(id: string) {
  const { data } = await client.get<{ items: UserWallet[] }>(
    `/users/${id}/wallets`
  );
  return data;
}

export async function fetchUserTransactions(id: string) {
  const { data } = await client.get<{ items: UserTransactionBrief[] }>(
    `/users/${id}/transactions`
  );
  return data;
}

export async function fetchUserActivity(id: string) {
  const { data } = await client.get<{ items: ActivityEvent[] }>(
    `/users/${id}/activity`
  );
  return data;
}

// Wallets
export async function fetchWallets(params: Query = {}) {
  const { data } = await client.get<Paginated<WalletListItem>>('/wallets', {
    params: toParams(params),
  });
  return data;
}

export async function fetchWalletsSummary() {
  const { data } = await client.get<WalletSummary>('/wallets/summary');
  return data;
}

// Transactions
export async function fetchTransactions(params: Query = {}) {
  const { data } = await client.get<Paginated<TransactionListItem>>(
    '/transactions',
    { params: toParams(params) }
  );
  return data;
}

export async function fetchTransaction(id: string) {
  const { data } = await client.get<TransactionDetail>(`/transactions/${id}`);
  return data;
}
