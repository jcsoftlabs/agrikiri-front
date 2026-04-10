import axios from 'axios';

// Get API URL from env or fallback to production URL if in prod, else localhost
const IS_PROD = process.env.NODE_ENV === 'production';
const DEFAULT_URL = IS_PROD 
  ? 'https://agrikiri-backend-production.up.railway.app/api' 
  : 'http://localhost:3001/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || DEFAULT_URL;

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

    // Check if we are in browser environment
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('agrikiri_token');
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
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Clear local storage and redirect to login if authentication fails
      // Note: We avoid circular dependencies by doing this directly or via event emission
      // localStorage.removeItem('agrikiri_token');
      // window.location.href = '/login'; // Optional: Redirect forcibly
    }
    return Promise.reject(error);
  }
);

export default api;
