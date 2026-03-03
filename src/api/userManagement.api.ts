import api from './axios';

export interface ManagedRole {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  userCount: number;
  createdAt: string;
}

export interface ManagedUser {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  role: { name: string; slug: string };
}

// ─── Roles ───────────────────────────────────────────────────────────────────
export const listRoles = (): Promise<{ status: boolean; data: ManagedRole[] }> =>
  api.get('/user-management/roles').then((res) => res.data);

export const createRole = (data: {
  name: string;
  slug: string;
}): Promise<{ status: boolean; data: ManagedRole }> =>
  api.post('/user-management/roles', data).then((res) => res.data);

export const updateRole = (
  id: string,
  data: { name?: string; slug?: string; isActive?: boolean },
): Promise<{ status: boolean; data: ManagedRole }> =>
  api.put(`/user-management/roles/${id}`, data).then((res) => res.data);

export const deleteRole = (id: string): Promise<{ status: boolean; message: string }> =>
  api.delete(`/user-management/roles/${id}`).then((res) => res.data);

// ─── Users ───────────────────────────────────────────────────────────────────
export const listUsers = (roleSlug?: string): Promise<{ status: boolean; data: ManagedUser[] }> =>
  api
    .get('/user-management/users', { params: roleSlug ? { roleSlug } : undefined })
    .then((res) => res.data);

export const createUser = (data: {
  username: string;
  email: string;
  password: string;
  roleSlug: string;
}): Promise<{ status: boolean; data: ManagedUser }> =>
  api.post('/user-management/users', data).then((res) => res.data);

export const updateUser = (
  id: string,
  data: { username?: string; email?: string; roleSlug?: string; isActive?: boolean },
): Promise<{ status: boolean; data: ManagedUser }> =>
  api.put(`/user-management/users/${id}`, data).then((res) => res.data);

export const deleteUser = (id: string): Promise<{ status: boolean; message: string }> =>
  api.delete(`/user-management/users/${id}`).then((res) => res.data);

// ─── Role Permissions ─────────────────────────────────────────────────────────

export interface RolePermission {
  resource: string;
  action: string;
}

export const getRolePermissions = (roleId: string): Promise<{ status: boolean; data: RolePermission[] }> =>
  api.get(`/user-management/roles/${roleId}/permissions`).then((res) => res.data);

export const updateRolePermissions = (
  roleId: string,
  permissions: RolePermission[],
): Promise<{ status: boolean; message: string }> =>
  api.put(`/user-management/roles/${roleId}/permissions`, { permissions }).then((res) => res.data);
