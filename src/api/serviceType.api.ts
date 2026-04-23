import api from './axios';
import type { ApiResponse } from './types';

export interface ServiceTypeItem {
  id: string;
  code: string;
  name: string;
  emoji: string;
  estimatedDurationMinutes: number;
  isActive: boolean;
}

export const listServiceTypes = async (category?: string): Promise<ApiResponse<ServiceTypeItem[]>> => {
  const { data } = await api.get('/service-types', { params: category ? { category } : {} });
  return data;
};
