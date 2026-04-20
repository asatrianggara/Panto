import client from './client';
import type { LoginResponse } from '@/types';

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const { data } = await client.post<LoginResponse>('/auth/login', {
    email,
    password,
  });
  return data;
}

export async function me() {
  const { data } = await client.get('/auth/me');
  return data;
}
