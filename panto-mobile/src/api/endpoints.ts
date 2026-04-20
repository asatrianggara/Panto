import client from './client';

const unwrap = <T>(res: { data: any }): T => (res.data?.data ?? res.data) as T;

export const login = async (phone: string, pin: string) => {
  const res = await client.post('/auth/login', { phone, pin });
  return unwrap<{ accessToken?: string; token?: string; user: any }>(res);
};

export const register = async (phone: string, name: string, pin: string) => {
  const res = await client.post('/auth/register', { phone, name, pin });
  return unwrap<{ accessToken?: string; token?: string; user: any }>(res);
};

export const getMe = async () => {
  const res = await client.get('/users/me');
  return unwrap<any>(res);
};

export const updateMe = async (updateData: Record<string, unknown>) => {
  const res = await client.patch('/users/me', updateData);
  return unwrap<any>(res);
};

export const getMyStats = async () => {
  const res = await client.get('/users/me/stats');
  return unwrap<{ totalTransactions: number; totalSaved: number }>(res);
};

export const getWallets = async () => {
  const res = await client.get('/wallets');
  const data = unwrap<any>(res);
  return Array.isArray(data) ? data : data?.wallets ?? [];
};

export const linkWallet = async (provider: string, providerPhone: string) => {
  const res = await client.post('/wallets/link', { provider, providerPhone });
  return unwrap<any>(res);
};

export const unlinkWallet = async (id: string) => {
  const res = await client.delete(`/wallets/${id}`);
  return unwrap<any>(res);
};

export const updateWallet = async (id: string, updateData: Record<string, unknown>) => {
  const res = await client.patch(`/wallets/${id}`, updateData);
  return unwrap<any>(res);
};

export const getWalletsSummary = async () => {
  const res = await client.get('/wallets/summary');
  return unwrap<any>(res);
};

export const calculateSplit = async (
  amount: number,
  merchantName: string,
  merchantCategory?: string,
) => {
  const res = await client.post('/smartpay/calculate', {
    amount,
    merchantName,
    merchantCategory,
  });
  return unwrap<any>(res);
};

export const createTransaction = async (txData: Record<string, unknown>) => {
  const res = await client.post('/transactions', txData);
  return unwrap<any>(res);
};

export const getTransactions = async (page?: number, limit?: number) => {
  const res = await client.get('/transactions', { params: { page, limit } });
  const data = unwrap<any>(res);
  return Array.isArray(data) ? data : data?.transactions ?? [];
};

export const getPoints = async () => {
  const res = await client.get('/points');
  return unwrap<any>(res);
};

export const getMerchants = async () => {
  const res = await client.get('/merchants');
  const data = unwrap<any>(res);
  return Array.isArray(data) ? data : [];
};

// GoPay
export const gopayStartBind = async (phoneNumber: string) => {
  const res = await client.post('/gopay/bind', { phoneNumber });
  return unwrap<any>(res);
};
export const gopaySimulateBind = async (phoneNumber: string) => {
  const res = await client.post('/gopay/bind/simulate', { phoneNumber });
  return unwrap<any>(res);
};
export const gopayUnbind = async () => {
  const res = await client.post('/gopay/unbind');
  return unwrap<any>(res);
};

// DANA
export const danaStartBind = async (phoneNumber: string) => {
  const res = await client.post('/dana/bind', { phoneNumber });
  return unwrap<any>(res);
};
export const danaCompleteBind = async (
  accessToken: string,
  tokenId: string,
  phoneNumber: string,
) => {
  const res = await client.post('/dana/bind/complete', {
    accessToken,
    tokenId,
    phoneNumber,
  });
  return unwrap<any>(res);
};
export const danaSimulateBind = async (phoneNumber: string) => {
  const res = await client.post('/dana/bind/simulate', { phoneNumber });
  return unwrap<any>(res);
};
export const danaGetBalance = async () => {
  const res = await client.post('/dana/balance');
  return unwrap<any>(res);
};
export const danaUnbind = async () => {
  const res = await client.post('/dana/unbind');
  return unwrap<any>(res);
};
