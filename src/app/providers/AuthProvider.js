import React, { createContext, useContext, useState, useCallback } from 'react';
import { AUTH_BASE_URL, ROLE_MAP } from '../../config/apiConfig';

const AuthContext = createContext(null);

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
    return saved ? JSON.parse(saved) : null;
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError]     = useState(null);

  const login = useCallback(async (email, password) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res  = await fetch(`${AUTH_BASE_URL}/auth/login`, {
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
    setUser(null);
    localStorage.removeItem('icrcs_user');
    localStorage.removeItem('officer_token');
    localStorage.removeItem('officer_refresh_token');
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
