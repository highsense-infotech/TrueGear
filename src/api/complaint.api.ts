import api from './axios';

export interface Complaint {
  id: string;
  name: string;
  isActive: boolean;
}

export const listComplaints = async (): Promise<{ status: boolean; data: Complaint[] }> => {
  const { data } = await api.get('/complaints');
  return data;
};

export const addComplaint = async (name: string): Promise<{ status: boolean; data: Complaint }> => {
  const { data } = await api.post('/complaints', { name });
  return data;
};

export const updateComplaint = async (id: string, body: { name?: string; isActive?: boolean }): Promise<{ status: boolean; data: Complaint }> => {
  const { data } = await api.put(`/complaints/${id}`, body);
  return data;
};

export const deleteComplaint = async (id: string): Promise<{ status: boolean }> => {
  const { data } = await api.delete(`/complaints/${id}`);
  return data;
};
