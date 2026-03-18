import api from './axios';

export interface ServiceTypeItem {
  id: string;
  code: string;
  name: string;
  emoji: string;
  isActive: boolean;
}

export const listServiceTypes = async (): Promise<{ status: boolean; data: ServiceTypeItem[] }> => {
  const { data } = await api.get('/service-types');
  return data;
};
