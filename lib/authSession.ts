import axios from 'axios';

const IS_PROD = process.env.NODE_ENV === 'production';
const DEFAULT_URL = IS_PROD
  ? 'https://agrikiri-backend-production.up.railway.app/api'
  : 'http://localhost:3001/api';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || DEFAULT_URL;
export const TOKEN_STORAGE_KEY = 'agrikiri_token';
export const REFRESH_TOKEN_STORAGE_KEY = 'agrikiri_refresh_token';
export const ROLE_STORAGE_KEY = 'agrikiri_role';

export type SessionRole =
  | 'CUSTOMER'
  | 'AYIZAN'
  | 'BUYER'
  | 'DELIVERY_AGENT'
  | 'STOCK_MANAGER'
  | 'CASHIER'
  | 'ACCOUNTANT'
  | 'ADMIN'
  | 'ASSOCIATE';

let refreshPromise: Promise<string | null> | null = null;

export function isCustomerRole(role: string | null | undefined): role is 'CUSTOMER' {
  return role === 'CUSTOMER';
}

export function decodeTokenExpiration(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decodedPayload = JSON.parse(atob(normalizedPayload));
    const expiration = Number(decodedPayload?.exp);

    return Number.isFinite(expiration) ? expiration * 1000 : null;
  } catch {
    return null;
  }
}

export function persistAccessToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
}

export function persistRefreshToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
  }
}

export function persistRole(role: SessionRole) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ROLE_STORAGE_KEY, role);
  }
}

export function getStoredRole(): SessionRole | null {
  if (typeof window === 'undefined') return null;

  const role = localStorage.getItem(ROLE_STORAGE_KEY);
  return role as SessionRole | null;
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;

  return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function getStoredToken() {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) return null;

  const expiration = decodeTokenExpiration(token);
  if (expiration && expiration <= Date.now()) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return null;
  }

  return token;
}

export function clearStoredSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(ROLE_STORAGE_KEY);
  }
}

export function clearRefreshToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }
}

export function redirectToLogin() {
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

export async function refreshCustomerAccessToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  const role = getStoredRole();

  if (!refreshToken || !isCustomerRole(role)) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/auth/refresh`, { refreshToken }, { headers: { 'Content-Type': 'application/json' } })
      .then((response) => {
        const payload = response.data?.data ?? response.data;
        const nextToken = payload?.accessToken ?? payload?.token;

        if (!nextToken) {
          throw new Error('Réponse de refresh invalide');
        }

        persistAccessToken(nextToken);
        return nextToken as string;
      })
      .catch(() => {
        clearStoredSession();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}
