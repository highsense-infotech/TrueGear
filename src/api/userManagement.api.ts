import api from './axios';
import type { ApiResponse } from './types';

export interface ManagedRole {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  userCount: number;
  createdAt: string;
}

export type ShopScope = 'SERVICE' | 'MAJOR' | 'ALL';

export interface ManagedUser {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  role: { name: string; slug: string };
  shopScope?: ShopScope;
  warrantyOnly?: boolean;
  // Evolve technician mapping (only set for technician users).
  evolveTechnicianNo?: number | null;
  // Technician profile (only set for technician users). ability may serialize as
  // a string from the DB numeric column. designationId → designations master.
  ability?: number | string | null;
  designationId?: string | null;
  designationName?: string | null;
  designationActive?: boolean | null;
}

export interface RolesPaginatedData {
  data: ManagedRole[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// ─── Roles ───────────────────────────────────────────────────────────────────
export const listRoles = (): Promise<ApiResponse<ManagedRole[]>> =>
  api.get('/user-management/roles').then((res) => res.data);

export const listRolesPaginated = (
  params: { page: number; limit: number },
): Promise<ApiResponse<RolesPaginatedData>> =>
  api.get('/user-management/roles', { params }).then((res) => res.data);

export const createRole = (data: {
  name: string;
  slug: string;
}): Promise<ApiResponse<ManagedRole>> =>
  api.post('/user-management/roles', data).then((res) => res.data);

export const updateRole = (
  id: string,
  data: { name?: string; slug?: string; isActive?: boolean },
): Promise<ApiResponse<ManagedRole>> =>
  api.put(`/user-management/roles/${id}`, data).then((res) => res.data);

export const deleteRole = (id: string): Promise<ApiResponse<null>> =>
  api.delete(`/user-management/roles/${id}`).then((res) => res.data);

// ─── Users ───────────────────────────────────────────────────────────────────
export const listUsers = (roleSlug?: string): Promise<ApiResponse<ManagedUser[]>> =>
  api
    .get('/user-management/users', { params: roleSlug ? { roleSlug } : undefined })
    .then((res) => res.data);

export interface UsersPaginatedData {
  data: ManagedUser[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  stats: { totalUsers: number; totalActive: number };
}

export const listUsersPaginated = (
  params: { page: number; limit: number; roleSlug?: string; search?: string },
): Promise<ApiResponse<UsersPaginatedData>> =>
  api.get('/user-management/users', { params }).then((res) => res.data);

export const createUser = (data: {
  username: string;
  email: string;
  password: string;
  roleSlug: string;
  shopScope?: ShopScope;
  warrantyOnly?: boolean;
  evolveTechnicianNo?: number | null;
  ability?: number | null;
  designationId?: string | null;
}): Promise<ApiResponse<ManagedUser>> =>
  api.post('/user-management/users', data).then((res) => res.data);

export const updateUser = (
  id: string,
  data: {
    username?: string;
    email?: string;
    roleSlug?: string;
    isActive?: boolean;
    shopScope?: ShopScope;
    warrantyOnly?: boolean;
    evolveTechnicianNo?: number | null;
    ability?: number | null;
    designationId?: string | null;
  },
): Promise<ApiResponse<ManagedUser>> =>
  api.put(`/user-management/users/${id}`, data).then((res) => res.data);

export const deleteUser = (id: string): Promise<ApiResponse<null>> =>
  api.delete(`/user-management/users/${id}`).then((res) => res.data);

// ─── Evolve Technician Mapping (admin-only) ────────────────────────────────────
// Maps local technician users to their Evolve TechnicianNo. The Service Advisor
// never sees these — they exist only on the admin User Management screen.

export interface EvolveTechnician {
  technicianNo: number;
  firstName: string;
  lastName: string;
  displayName: string;
}

export interface TechnicianMapping {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  evolveTechnicianNo: number | null;
}

/** Active Evolve technicians (live from Evolve) for the mapping picker. */
export const listEvolveTechnicians = (): Promise<ApiResponse<EvolveTechnician[]>> =>
  api.get('/user-management/evolve-technicians').then((res) => res.data);

/** Local technician users with their current Evolve mapping. */
export const listTechnicianMappings = (): Promise<ApiResponse<TechnicianMapping[]>> =>
  api.get('/user-management/technician-mappings').then((res) => res.data);

/** Set (number) or clear (null) a technician's Evolve TechnicianNo. */
export const setUserEvolveTechnicianNo = (
  userId: string,
  evolveTechnicianNo: number | null,
): Promise<ApiResponse<{ userId: string; evolveTechnicianNo: number | null }>> =>
  api
    .put(`/user-management/users/${userId}/evolve-technician-no`, { evolveTechnicianNo })
    .then((res) => res.data);

// ─── Role Permissions ─────────────────────────────────────────────────────────

export interface RolePermission {
  resource: string;
  action: string;
}

export const getRolePermissions = (roleId: string): Promise<ApiResponse<RolePermission[]>> =>
  api.get(`/user-management/roles/${roleId}/permissions`).then((res) => res.data);

export const updateRolePermissions = (
  roleId: string,
  permissions: RolePermission[],
): Promise<ApiResponse<null>> =>
  api.put(`/user-management/roles/${roleId}/permissions`, { permissions }).then((res) => res.data);
