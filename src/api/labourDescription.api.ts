import api from './axios';
import type { ApiResponse } from './types';

export interface LabourDescription {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LabourDescriptionsPaginatedData {
  data: LabourDescription[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export type LabourDescriptionStatusFilter = 'all' | 'active' | 'inactive';

// Admin list — paginated, with search + status filter (All / Active / Inactive).
export const listLabourDescriptionsPaginated = (
  params: { page: number; limit: number; search?: string; status?: LabourDescriptionStatusFilter },
): Promise<ApiResponse<LabourDescriptionsPaginatedData>> =>
  api.get('/labour-descriptions', { params }).then((res) => res.data);

// Active-only list — for the Job Card Labour dropdown.
export const listActiveLabourDescriptions = (): Promise<ApiResponse<LabourDescription[]>> =>
  api.get('/labour-descriptions', { params: { active: 'true' } }).then((res) => res.data);

export const createLabourDescription = (
  data: { name: string },
): Promise<ApiResponse<LabourDescription>> =>
  api.post('/labour-descriptions', data).then((res) => res.data);

export const updateLabourDescription = (
  id: string,
  data: { name?: string; isActive?: boolean },
): Promise<ApiResponse<LabourDescription>> =>
  api.put(`/labour-descriptions/${id}`, data).then((res) => res.data);
