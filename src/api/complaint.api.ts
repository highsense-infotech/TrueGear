import api from './axios';
import type { ApiResponse } from './types';

export interface Complaint {
  id: string;
  name: string;
  isActive: boolean;
}

export const listComplaints = async (): Promise<ApiResponse<Complaint[]>> => {
  const { data } = await api.get('/complaints');
  return data;
};

export const addComplaint = async (name: string): Promise<ApiResponse<Complaint>> => {
  const { data } = await api.post('/complaints', { name });
  return data;
};

export const updateComplaint = async (
  id: string,
  body: { name?: string; isActive?: boolean },
): Promise<ApiResponse<Complaint>> => {
  const { data } = await api.put(`/complaints/${id}`, body);
  return data;
};

export const deleteComplaint = async (id: string): Promise<ApiResponse<null>> => {
  const { data } = await api.delete(`/complaints/${id}`);
  return data;
};
