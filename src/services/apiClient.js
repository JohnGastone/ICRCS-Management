import { API_BASE_URL, API_ENDPOINTS } from '../config/apiConfig';

const TOKEN_KEY   = 'officer_token';
const REFRESH_KEY = 'officer_refresh_token';

/** Wipe the local session and bounce to the login screen. */
function clearSessionAndRedirect() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem('icrcs_user');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

// Single-flight refresh: concurrent 401s share ONE refresh request instead of
// each firing their own (which would race and invalidate each other's tokens).
let refreshPromise = null;

/**
 * Exchange the stored refresh token for a fresh access token.
 * @returns {Promise<string|null>} the new access token, or null if refresh
 *   isn't possible / the backend rejected it.
 *
 * Assumes /auth/refresh accepts { refresh_token } and returns tokens in the
 * same envelope as /auth/login (data.access_token | accessToken, etc.). Adjust
 * here if the backend contract differs.
 */
function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return Promise.resolve(null);

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body.code === 0) return null;

        const data       = body.data || body;
        const newAccess  = data.access_token  || data.accessToken;
        const newRefresh = data.refresh_token || data.refreshToken;
        if (!newAccess) return null;

        localStorage.setItem(TOKEN_KEY, newAccess);
        if (newRefresh) localStorage.setItem(REFRESH_KEY, newRefresh);
        return newAccess;
      } catch {
        return null;
      } finally {
        // Let the next 401 (after this settles) trigger a fresh attempt.
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

/**
 * Authenticated fetch wrapper for the management API. On a 401 it transparently
 * attempts a one-time silent token refresh and replays the request; if refresh
 * fails the session is cleared and the user is sent to /login.
 *
 * @param {string} endpoint  path appended to API_BASE_URL
 * @param {RequestInit & { _retry?: boolean }} [options]  _retry is internal,
 *   guarding against an infinite refresh→401→refresh loop.
 */
export async function apiClient(endpoint, options = {}) {
  const { _retry, ...fetchOptions } = options;
  const url   = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem(TOKEN_KEY);

  const config = {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...fetchOptions.headers,
    },
  };

  const response = await fetch(url, config);

  if (response.status === 401) {
    // One silent refresh + replay before giving up on the session.
    if (!_retry) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return apiClient(endpoint, { ...options, _retry: true });
      }
    }
    clearSessionAndRedirect();
    throw new Error('Session expired. Please log in again.');
  }

  const body = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));

  if (!response.ok) {
    throw new Error(body.message || `HTTP ${response.status}`);
  }

  return body;
}
