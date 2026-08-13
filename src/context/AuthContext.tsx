import React, { createContext, useContext, useState, useCallback } from 'react';
import type { User, AuthData, ShopScope } from '../types/user.types';
import { logout as logoutApi } from '../api/auth.api';

const STORAGE_KEY = 'tg_auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (data: AuthData) => void;
  // Refresh the cached user after a self-service profile update (name, email,
  // username, avatar). Auth is userId-based so no token refresh is required.
  updateUser: (partial: Partial<User>) => void;
  logout: () => Promise<void>;
  hasRole: (roleSlug: string) => boolean;
  hasPermission: (resource: string, action: string) => boolean;
  // Record-level scope (UX layer only — the backend is the real boundary).
  // Defaults preserve current behaviour for users without an assigned scope.
  shopScope: ShopScope;
  warrantyOnly: boolean;
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

  const updateUser = useCallback((partial: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as AuthData) : null;
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ token: parsed?.token ?? null, user: next }),
        );
      } catch {
        // best-effort — in-memory state still updates
      }
      return next;
    });
  }, []);

  const logout = useCallback(async () => {
    await logoutApi();
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

  // Derived scope — defaults to unrestricted (ALL / false) for users without
  // an assigned scope, matching the backend defaults.
  const shopScope: ShopScope = user?.shopScope ?? 'ALL';
  const warrantyOnly: boolean = user?.warrantyOnly ?? false;

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, updateUser, logout, hasRole, hasPermission, shopScope, warrantyOnly }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
