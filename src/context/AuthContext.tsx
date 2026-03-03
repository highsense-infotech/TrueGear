import React, { createContext, useContext, useState, useCallback } from 'react';
import type { User, AuthData } from '../types/user.types';

const STORAGE_KEY = 'tg_auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (data: AuthData) => void;
  logout: () => void;
  hasRole: (roleSlug: string) => boolean;
  hasPermission: (resource: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getStoredAuth(): { user: User | null; token: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AuthData;
      return { user: parsed.user, token: parsed.token };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return { user: null, token: null };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => getStoredAuth().user);
  const [token, setToken] = useState<string | null>(() => getStoredAuth().token);

  const login = useCallback((data: AuthData) => {
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const hasRole = useCallback(
    (roleSlug: string) => user?.role?.slug === roleSlug,
    [user],
  );

  const hasPermission = useCallback(
    (resource: string, action: string) => {
      if (!user) return false;
      if (user.role?.slug === 'super-admin') return true;
      return user.permissions?.includes(`${resource}:${action}`) ?? false;
    },
    [user],
  );

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout, hasRole, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
