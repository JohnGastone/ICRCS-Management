export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
  },
  CASES: {
    BASE: '/cases',
    BY_ID: (id) => `/cases/${id}`,
  },
  BIOMETRIC: {
    BASE: '/biometric',
  },
  REPORTS: {
    BASE: '/reports',
  },
};

export const REQUEST_TIMEOUT = 30000;
