export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Local office agent that drives the fingerprint scanner (icrcs-device-service).
// A different origin from API_BASE_URL - it must NOT receive this app's auth token.
export const DEVICE_SERVICE_URL = process.env.REACT_APP_DEVICE_SERVICE_URL || 'http://127.0.0.1:8090';

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
