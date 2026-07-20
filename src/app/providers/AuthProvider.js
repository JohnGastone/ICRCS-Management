import React, { createContext, useContext, useState, useCallback } from 'react';
import { API_BASE_URL, API_ENDPOINTS, ROLE_MAP } from '../../config/apiConfig';

const AuthContext = createContext(null);

// True if the access token is a JWT that hasn't expired. Opaque/non-JWT tokens
// (or tokens without an exp claim) can't be judged here, so we defer to the API
// layer (a 401 triggers refresh/logout) and treat them as live.
function isTokenLive(token) {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return true;
    return payload.exp * 1000 > Date.now();
  } catch {
    return true;
  }
}

function clearStoredSession() {
  localStorage.removeItem('icrcs_user');
  localStorage.removeItem('officer_token');
  localStorage.removeItem('officer_refresh_token');
}

function extractRole(roles = []) {
  for (const r of roles) {
    const code = typeof r === 'object' ? r.RoleCode : r;
    if (ROLE_MAP[code]) return ROLE_MAP[code];
  }
  return 'registration_officer';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('icrcs_user');
    const token = localStorage.getItem('officer_token');
    const refreshToken = localStorage.getItem('officer_refresh_token');
    // Only trust a persisted user when it's backed by a usable session: a live
    // access token, or a refresh token the API layer can exchange on the first
    // 401. A stored user without either is stale (or hand-seeded mock data) — we
    // clear it so the app never appears logged-in without a real backend login.
    if (saved && (isTokenLive(token) || refreshToken)) {
      try { return JSON.parse(saved); } catch { /* fall through to clear */ }
    }
    if (saved || token || refreshToken) clearStoredSession();
    return null;
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError]     = useState(null);

  const login = useCallback(async (email, password) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res  = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });
      const body = await res.json();

      if (!res.ok || body.code === 0) {
        throw new Error(body.message || 'Login failed. Check your credentials.');
      }

      const data         = body.data || body;
      const accessToken  = data.access_token  || data.accessToken;
      const refreshToken = data.refresh_token || data.refreshToken;
      const userInfo     = data.user || {};
      const roles        = data.roles || [];

      if (!accessToken) throw new Error('No access token received.');

      localStorage.setItem('officer_token',         accessToken);
      localStorage.setItem('officer_refresh_token', refreshToken || '');

      const userData = {
        userId:    userInfo.UserID    || userInfo.userId,
        username:  userInfo.Username  || userInfo.username || email,
        email:     userInfo.Email     || email,
        stationId: userInfo.StationID,
        role:      extractRole(roles),
        name:      userInfo.FullName  || userInfo.Username || email,
      };

      setUser(userData);
      localStorage.setItem('icrcs_user', JSON.stringify(userData));
      return userData;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    const token        = localStorage.getItem('officer_token');
    const refreshToken = localStorage.getItem('officer_refresh_token');
    // Best-effort server-side session invalidation. Fire-and-forget so local
    // sign-out (below) is instant and never blocks on the network.
    if (token || refreshToken) {
      fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGOUT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ refresh_token: refreshToken || '' }),
      }).catch(() => {}); // ignore network/abort; local session is cleared regardless
    }
    setUser(null);
    clearStoredSession();
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isOfficer: ['registration_officer', 'assessor', 'approver', 'etd_officer', 'admin', 'management'].includes(user?.role),
    isAdmin: user?.role === 'admin',
    authLoading,
    authError,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
