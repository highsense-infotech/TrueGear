import api from './axios';
import type { ApiResponse } from './types';

export interface Designation {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  assignedUserCount?: number;
}

export interface DesignationsPaginatedData {
  data: Designation[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export type DesignationStatusFilter = 'all' | 'active' | 'inactive';

// Admin list — paginated, with search + status filter (All / Active / Inactive).
export const listDesignationsPaginated = (
  params: { page: number; limit: number; search?: string; status?: DesignationStatusFilter },
): Promise<ApiResponse<DesignationsPaginatedData>> =>
  api.get('/designations', { params }).then((res) => res.data);

// Active-only list — for the User Management technician dropdown.
export const listActiveDesignations = (): Promise<ApiResponse<Designation[]>> =>
  api.get('/designations', { params: { active: 'true' } }).then((res) => res.data);

export const createDesignation = (
  data: { name: string; description?: string | null },
): Promise<ApiResponse<Designation>> =>
  api.post('/designations', data).then((res) => res.data);

export const updateDesignation = (
  id: string,
  data: { name?: string; description?: string | null; isActive?: boolean },
): Promise<ApiResponse<Designation>> =>
  api.put(`/designations/${id}`, data).then((res) => res.data);
