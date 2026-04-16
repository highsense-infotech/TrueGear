import api from './axios';

export interface ServiceTypeItem {
  id: string;
  code: string;
  name: string;
  emoji: string;
  estimatedDurationMinutes: number;
  isActive: boolean;
}

export const listServiceTypes = async (category?: string): Promise<{ status: boolean; data: ServiceTypeItem[] }> => {
  const { data } = await api.get('/service-types', { params: category ? { category } : {} });
  return data;
};
