import axios from 'axios';
import {
  API_URL,
  clearStoredSession,
  getStoredToken,
  getStoredRole,
  isCustomerRole,
  refreshCustomerAccessToken,
  redirectToLogin,
} from '@/lib/authSession';

const api = axios.create({
  baseURL: API_URL,
});

// Intercept requests to attach the token if available
api.interceptors.request.use(
  (config) => {
    const isFormData =
      typeof FormData !== 'undefined' && config.data instanceof FormData;

    if (config.headers) {
      if (isFormData) {
        delete config.headers['Content-Type'];
      } else if (!config.headers['Content-Type']) {
        config.headers['Content-Type'] = 'application/json';
      }
    }

    if (typeof window !== 'undefined') {
      const token = getStoredToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Intercept responses to handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;

    if (
      error.response?.status === 401 &&
      typeof window !== 'undefined' &&
      originalRequest &&
      !originalRequest._retry &&
      isCustomerRole(getStoredRole())
    ) {
      originalRequest._retry = true;
      const refreshedToken = await refreshCustomerAccessToken();

      if (refreshedToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${refreshedToken}`;
        return api(originalRequest);
      }

      clearStoredSession();
      redirectToLogin();
    }

    return Promise.reject(error);
  }
);

export default api;
