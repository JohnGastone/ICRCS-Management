import { API_BASE_URL } from '../config/apiConfig';

export async function apiClient(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('officer_token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);

  // Token expired / invalid — clear session and go to login
  if (response.status === 401) {
    localStorage.removeItem('officer_token');
    localStorage.removeItem('officer_refresh_token');
    localStorage.removeItem('icrcs_user');
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  const body = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));

  if (!response.ok) {
    throw new Error(body.message || `HTTP ${response.status}`);
  }

  return body;
}
