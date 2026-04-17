import client from './client';

export const login = async (phone: string, pin: string) => {
  const { data } = await client.post('/auth/login', { phone, pin });
  return data;
};

export const register = async (phone: string, name: string, pin: string) => {
  const { data } = await client.post('/auth/register', { phone, name, pin });
  return data;
};

export const getMe = async () => {
  const { data } = await client.get('/users/me');
  return data;
};

export const updateMe = async (updateData: Record<string, unknown>) => {
  const { data } = await client.patch('/users/me', updateData);
  return data;
};

export const getMyStats = async () => {
  const { data } = await client.get('/users/me/stats');
  return data;
};

export const getWallets = async () => {
  const { data } = await client.get('/wallets');
  return data;
};

export const linkWallet = async (provider: string, providerPhone: string) => {
  const { data } = await client.post('/wallets/link', { provider, providerPhone });
  return data;
};

export const unlinkWallet = async (id: string) => {
  const { data } = await client.delete(`/wallets/${id}`);
  return data;
};

export const updateWallet = async (id: string, updateData: Record<string, unknown>) => {
  const { data } = await client.patch(`/wallets/${id}`, updateData);
  return data;
};

export const getWalletsSummary = async () => {
  const { data } = await client.get('/wallets/summary');
  return data;
};

export const calculateSplit = async (
  amount: number,
  merchantName: string,
  merchantCategory?: string
) => {
  const { data } = await client.post('/smartpay/calculate', {
    amount,
    merchantName,
    merchantCategory,
  });
  return data;
};

export const validateSplit = async (
  amount: number,
  customSplits: Array<{ walletId: string; amount: number }>
) => {
  const { data } = await client.post('/smartpay/validate', { amount, customSplits });
  return data;
};

export const createTransaction = async (txData: Record<string, unknown>) => {
  const { data } = await client.post('/transactions', txData);
  return data;
};

export const getTransactions = async (page?: number, limit?: number) => {
  const { data } = await client.get('/transactions', { params: { page, limit } });
  return data;
};

export const getTransaction = async (id: string) => {
  const { data } = await client.get(`/transactions/${id}`);
  return data;
};

export const getPoints = async () => {
  const { data } = await client.get('/points');
  return data;
};

export const getPointsHistory = async (page?: number, limit?: number) => {
  const { data } = await client.get('/points/history', { params: { page, limit } });
  return data;
};

export const getMerchants = async () => {
  const { data } = await client.get('/merchants');
  return data;
};

// DANA Integration
export const getDanaStatus = async () => {
  const { data } = await client.get('/dana/status');
  return data;
};

export const danaStartBind = async (phoneNumber: string, callbackUrl?: string) => {
  const { data } = await client.post('/dana/bind', { phoneNumber, callbackUrl });
  return data;
};

export const danaCompleteBind = async (accessToken: string, tokenId: string, phoneNumber: string) => {
  const { data } = await client.post('/dana/bind/complete', { accessToken, tokenId, phoneNumber });
  return data;
};

export const danaSimulateBind = async (phoneNumber: string) => {
  const { data } = await client.post('/dana/bind/simulate', { phoneNumber });
  return data;
};

export const danaGetBalance = async () => {
  const { data } = await client.post('/dana/balance');
  return data;
};

export const danaUnbind = async () => {
  const { data } = await client.post('/dana/unbind');
  return data;
};
