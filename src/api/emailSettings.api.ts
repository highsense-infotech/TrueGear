import api from './axios';
import type { ApiResponse } from './types';

export type MailAuthType = 'BASIC' | 'MICROSOFT_OAUTH2';

// Admin email settings. Secrets are never returned — `passwordConfigured` /
// `clientSecretConfigured` tell the UI whether one is stored.
export interface EmailSettings {
  authType: MailAuthType;
  host: string;
  port: number;
  secure: boolean;
  // BASIC
  username: string;
  // MICROSOFT_OAUTH2
  tenantId: string;
  clientId: string;
  senderEmail: string;
  // Common
  fromName: string;
  fromEmail: string;
  replyTo: string;
  enabled: boolean;
  passwordConfigured: boolean;
  clientSecretConfigured: boolean;
}

export interface UpdateEmailSettingsPayload {
  authType: MailAuthType;
  host: string;
  port: number;
  secure: boolean;
  // BASIC
  username?: string;
  password?: string; // blank/omitted → keep the existing password
  // MICROSOFT_OAUTH2
  tenantId?: string;
  clientId?: string;
  clientSecret?: string; // blank/omitted → keep the existing client secret
  senderEmail?: string;
  // Common
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
