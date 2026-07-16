import api from './axios';
import type { ApiResponse } from './types';

// Admin SMTP settings. The password is never returned — `passwordConfigured`
// tells the UI whether one is stored.
export interface EmailSettings {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  enabled: boolean;
  passwordConfigured: boolean;
}

export interface UpdateEmailSettingsPayload {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password?: string; // blank/omitted → keep the existing password
  fromName?: string | null;
  fromEmail: string;
  replyTo?: string | null;
  enabled: boolean;
}

export const getEmailSettings = async (): Promise<ApiResponse<EmailSettings>> => {
  const { data } = await api.get('/admin/settings/email');
  return data;
};

export const updateEmailSettings = async (
  payload: UpdateEmailSettingsPayload,
): Promise<ApiResponse<EmailSettings>> => {
  const { data } = await api.put('/admin/settings/email', payload);
  return data;
};

export const sendTestEmail = async (to: string): Promise<ApiResponse<{ to: string }>> => {
  const { data } = await api.post('/admin/settings/email/test', { to });
  return data;
};
