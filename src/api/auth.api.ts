import api from './axios';
import type { ApiResponse } from './types';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  role: { name: string; slug: string } | null;
  permissions: string[];
}

export interface ProfileData {
  id: string;
  username: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  shopScope?: string;
  warrantyOnly?: boolean;
  role: { name: string; slug: string } | null;
  createdAt: string;
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

// ─── My Profile (self-service; always keyed to the authenticated user) ─────────
export const getProfile = async (): Promise<ApiResponse<ProfileData>> => {
  const { data } = await api.get('/auth/profile');
  return data;
};

export const updateProfile = async (payload: {
  fullName?: string | null;
  username: string;
  email: string;
  password?: string;
}): Promise<ApiResponse<ProfileData>> => {
  const { data } = await api.put('/auth/profile', payload);
  return data;
};

export const uploadProfilePhoto = async (
  file: File,
): Promise<ApiResponse<{ avatarUrl: string | null }>> => {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/auth/profile/photo', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const removeProfilePhoto = async (): Promise<ApiResponse<{ avatarUrl: string | null }>> => {
  const { data } = await api.delete('/auth/profile/photo');
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
