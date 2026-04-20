import { create } from 'zustand';
import type { AdminUser } from '@/types';

const TOKEN_KEY = 'panto_admin_token';
const USER_KEY = 'panto_admin_user';

interface AuthState {
  token: string | null;
  admin: AdminUser | null;
  isAuthenticated: boolean;
  login: (token: string, admin: AdminUser) => void;
  logout: () => void;
}

function loadAdmin(): AdminUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  admin: loadAdmin(),
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),

  login: (token, admin) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(admin));
    set({ token, admin, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, admin: null, isAuthenticated: false });
  },
}));
