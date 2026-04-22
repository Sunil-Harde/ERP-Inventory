import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      // Ignore errors during logout (might already be expired)
    }
    // Clean up any leftover localStorage from old system
    localStorage.removeItem('erp_token');
    setUser(null);
  }, []);

  useEffect(() => {
    checkAuth();

    // Listen for force-logout events (from API auto-refresh failure)
    const handleForceLogout = () => {
      localStorage.removeItem('erp_token');
      setUser(null);
    };
    window.addEventListener('auth:force-logout', handleForceLogout);
    return () => window.removeEventListener('auth:force-logout', handleForceLogout);
  }, []);

  const checkAuth = async () => {
    try {
      // Cookie is sent automatically — just call /me
      const res = await authAPI.getMe();
      setUser(res.data);
    } catch {
      // Not logged in or token expired (auto-refresh already attempted by API service)
      localStorage.removeItem('erp_token'); // Clean up old system
      setUser(null);
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    // Clean up old localStorage token if it exists
    localStorage.removeItem('erp_token');
    setUser(res.data.user);
    return res;
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const isAdmin = () => hasRole('ADMIN');

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole, isAdmin, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
