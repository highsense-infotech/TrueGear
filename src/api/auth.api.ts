import api from './axios';
import type { ApiResponse } from './types';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: { name: string; slug: string } | null;
  permissions: string[];
}

export interface SessionInfo {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  isRevoked: boolean;
  isCurrent: boolean;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

export const login = async (
  email: string,
  password: string,
): Promise<ApiResponse<{ token: string; user: AuthUser }>> => {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
};

export const logout = async (): Promise<void> => {
  try {
    await api.post('/auth/logout');
  } catch {
    // best-effort — clear local state regardless
  }
};

export const register = async (payload: {
  name: string;
  email: string;
  password: string;
}): Promise<ApiResponse<{ token: string; user: AuthUser }>> => {
  const { data } = await api.post('/auth/register', payload);
  return data;
};

export const listSessions = async (): Promise<ApiResponse<SessionInfo[]>> => {
  const { data } = await api.get('/auth/sessions');
  return data;
};

export const revokeSession = async (sessionId: string): Promise<ApiResponse<null>> => {
  const { data } = await api.delete(`/auth/sessions/${sessionId}`);
  return data;
};
