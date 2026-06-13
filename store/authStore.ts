import { create } from 'zustand';
import api from '@/lib/api';
import {
  clearRefreshToken,
  clearStoredSession,
  decodeTokenExpiration,
  getStoredRefreshToken,
  getStoredRole,
  getStoredToken,
  isCustomerRole,
  persistAccessToken,
  persistRefreshToken,
  persistRole,
  redirectToLogin,
  refreshCustomerAccessToken,
  type SessionRole,
} from '@/lib/authSession';

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
const MOCK_ROLE = (process.env.NEXT_PUBLIC_MOCK_ROLE || 'DELIVERY_AGENT') as
  | 'CUSTOMER' | 'AYIZAN' | 'BUYER' | 'DELIVERY_AGENT' | 'STOCK_MANAGER' | 'CASHIER' | 'ACCOUNTANT' | 'ADMIN' | 'ASSOCIATE';

// Profils fictifs selon le rôle activé
const MOCK_PROFILES: Record<string, object> = {
  DELIVERY_AGENT: {
    id: 'mock-livreur-001',
    email: 'demo.livreur@agrikiri.ht',
    firstName: 'Pierre',
    lastName: 'Livreur',
    role: 'DELIVERY_AGENT',
    phone: '+509 3100-0000',
  },
  ASSOCIATE: {
    id: 'mock-associate-001',
    email: 'demo.associe@agrikiri.ht',
    firstName: 'Jean',
    lastName: 'Demo',
    role: 'ASSOCIATE',
    associateType: 'INVESTOR',
    mlmLevel: 'SILVER',
    phone: '+509 3000-0000',
    referralCode: 'DEMO2026',
    monthsAtCurrentLevel: 3,
  },
  AYIZAN: {
    id: 'mock-ayizan-001',
    email: 'demo.ayizan@agrikiri.ht',
    firstName: 'Marie',
    lastName: 'Ayizan',
    role: 'AYIZAN',
    mlmLevel: 'GOLD',
    phone: '+509 3200-0000',
    referralCode: 'AYIZ2026',
    monthsAtCurrentLevel: 6,
  },
  CUSTOMER: {
    id: 'mock-customer-001',
    email: 'demo.client@agrikiri.ht',
    firstName: 'Client',
    lastName: 'Demo',
    role: 'CUSTOMER',
    phone: '+509 3300-0000',
  },
  BUYER: {
    id: 'mock-buyer-001',
    email: 'demo.acheteur@agrikiri.ht',
    firstName: 'Samuel',
    lastName: 'Terrain',
    role: 'BUYER',
    phone: '+509 3400-0000',
  },
  STOCK_MANAGER: {
    id: 'mock-stock-001',
    email: 'demo.stock@agrikiri.ht',
    firstName: 'Ruth',
    lastName: 'Stock',
    role: 'STOCK_MANAGER',
    phone: '+509 3450-0000',
  },
  CASHIER: {
    id: 'mock-cashier-001',
    email: 'demo.caissier@agrikiri.ht',
    firstName: 'Nadia',
    lastName: 'Caisse',
    role: 'CASHIER',
    phone: '+509 3500-0000',
  },
  ACCOUNTANT: {
    id: 'mock-accountant-001',
    email: 'demo.compta@agrikiri.ht',
    firstName: 'Elsa',
    lastName: 'Compta',
    role: 'ACCOUNTANT',
    phone: '+509 3600-0000',
  },
};

const MOCK_USER = (MOCK_PROFILES[MOCK_ROLE] || MOCK_PROFILES['CUSTOMER']) as any;
const MOCK_TOKEN = 'mock-token-demo-mode';

let logoutTimer: ReturnType<typeof setTimeout> | null = null;

function clearLogoutTimer() {
  if (logoutTimer) {
    clearTimeout(logoutTimer);
    logoutTimer = null;
  }
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'CUSTOMER' | 'AYIZAN' | 'BUYER' | 'DELIVERY_AGENT' | 'STOCK_MANAGER' | 'CASHIER' | 'ACCOUNTANT' | 'ADMIN' | 'ASSOCIATE';
  associateType?: string | null;
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
  setUser: (user: User | null) => void;
  login: (credentials: Record<string, any>) => Promise<User>;
  register: (data: Record<string, any>) => Promise<User>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

function persistSession(user: User, token: string, refreshToken?: string | null) {
  persistAccessToken(token);
  persistRole(user.role as SessionRole);

  if (isCustomerRole(user.role) && refreshToken) {
    persistRefreshToken(refreshToken);
  } else if (!isCustomerRole(user.role)) {
    clearRefreshToken();
  }
}

function clearAuthState(set: (partial: Partial<AuthState>) => void, shouldRedirect: boolean = true) {
  clearLogoutTimer();
  clearStoredSession();
  set({ user: null, token: null, isAuthenticated: false, isLoading: false });

  if (shouldRedirect) {
    redirectToLogin();
  }
}

function scheduleSessionGuard(
  set: (partial: Partial<AuthState>) => void,
  get: () => AuthState,
  user: User,
  token: string
) {
  clearLogoutTimer();
  const expiration = decodeTokenExpiration(token);
  if (!expiration) return;

  const remainingMs = expiration - Date.now();

  if (isCustomerRole(user.role) && getStoredRefreshToken()) {
    const refreshLeadMs = 60 * 1000;
    const refreshDelay = Math.max(0, remainingMs - refreshLeadMs);

    logoutTimer = setTimeout(async () => {
      const refreshedToken = await refreshCustomerAccessToken();

      if (!refreshedToken) {
        clearAuthState(set);
        return;
      }

      const currentUser = get().user ?? user;
      set({ token: refreshedToken, isAuthenticated: true });
      scheduleSessionGuard(set, get, currentUser, refreshedToken);
    }, refreshDelay);

    return;
  }

  logoutTimer = setTimeout(() => {
    clearAuthState(set);
  }, Math.max(0, remainingMs));
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: IS_MOCK ? MOCK_USER : null,
  token: IS_MOCK ? MOCK_TOKEN : getStoredToken(),
  isAuthenticated: IS_MOCK ? true : !!getStoredToken(),
  isLoading: false,
  setUser: (user) => {
    if (user) {
      persistRole(user.role as SessionRole);
      set({ user, isAuthenticated: true });

      const currentToken = get().token ?? getStoredToken();
      if (currentToken) {
        scheduleSessionGuard(set, get, user, currentToken);
      }
      return;
    }

    clearAuthState(set, false);
  },

  login: async (credentials) => {
    if (IS_MOCK) {
      set({ user: MOCK_USER, token: MOCK_TOKEN, isAuthenticated: true });
      return MOCK_USER;
    }
    try {
      const response = await api.post('/auth/login', credentials);
      const payload = response.data?.data ?? response.data;
      const user = payload?.user;
      const token = payload?.accessToken ?? payload?.token;
      const refreshToken = payload?.refreshToken ?? null;

      if (!user || !token) {
        throw new Error('Réponse de connexion invalide');
      }

      persistSession(user, token, refreshToken);
      set({ user, token, isAuthenticated: true });
      scheduleSessionGuard(set, get, user, token);
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
      const refreshToken = payload?.refreshToken ?? null;

      if (!user || !token) {
        throw new Error('Réponse d’inscription invalide');
      }

      persistSession(user, token, refreshToken);
      set({ user, token, isAuthenticated: true });
      scheduleSessionGuard(set, get, user, token);
      return user;
    } catch (error) {
      throw error;
    }
  },

  logout: () => {
    clearAuthState(set);
  },

  checkAuth: async () => {
    if (IS_MOCK) {
      set({ user: MOCK_USER, token: MOCK_TOKEN, isAuthenticated: true, isLoading: false });
      return;
    }
    set({ isLoading: true });
    try {
      const storedRole = getStoredRole();
      let storedToken = getStoredToken();

      if (!storedToken && isCustomerRole(storedRole) && getStoredRefreshToken()) {
        storedToken = await refreshCustomerAccessToken();
      }

      if (!storedToken) {
        clearAuthState(set, false);
        return;
      }

      const response = await api.get('/auth/me');
      const user = response.data?.data ?? response.data;
      persistSession(user, storedToken, getStoredRefreshToken());
      set({ user, token: storedToken, isAuthenticated: true, isLoading: false });
      scheduleSessionGuard(set, get, user, storedToken);
    } catch (error) {
      clearAuthState(set, false);
    }
  },
}));
