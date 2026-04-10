import { create } from 'zustand';
import api from '@/lib/api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'CUSTOMER' | 'AYIZAN' | 'ADMIN';
  mlmLevel?: string;
  phone?: string;
  avatarUrl?: string;
  referralCode?: string | null;
  monthsAtCurrentLevel?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: Record<string, any>) => Promise<User>;
  register: (data: Record<string, any>) => Promise<User>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('agrikiri_token') : null,
  isAuthenticated: !!(typeof window !== 'undefined' && localStorage.getItem('agrikiri_token')),
  isLoading: false,

  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const payload = response.data?.data ?? response.data;
      const user = payload?.user;
      const token = payload?.accessToken ?? payload?.token;

      if (!user || !token) {
        throw new Error('Réponse de connexion invalide');
      }
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('agrikiri_token', token);
      }
      
      set({ user, token, isAuthenticated: true });
      return user;
    } catch (error) {
      throw error;
    }
  },

  register: async (data) => {
    try {
      const response = await api.post('/auth/register', data);
      const payload = response.data?.data ?? response.data;
      const user = payload?.user;
      const token = payload?.accessToken ?? payload?.token;

      if (!user || !token) {
        throw new Error('Réponse d’inscription invalide');
      }
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('agrikiri_token', token);
      }
      
      set({ user, token, isAuthenticated: true });
      return user;
    } catch (error) {
      throw error;
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('agrikiri_token');
    }
    set({ user: null, token: null, isAuthenticated: false });
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/auth/me');
      const user = response.data?.data ?? response.data;
      const token = typeof window !== 'undefined' ? localStorage.getItem('agrikiri_token') : null;
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (error) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('agrikiri_token');
      }
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
