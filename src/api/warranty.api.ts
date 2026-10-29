import api from "./axios";
import type { ApiResponse } from "./types";

export type WarrantyStatus =
  | "HELD"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "SCRAPPED"
  | "REJECTED";

export interface WarrantyPart {
  id: string;
  tagNo: string;
  jobCardItemId: string | null;
  vehicleId: string | null;
  customerId: string | null;
  partName: string;
  partNumber: string | null;
  warrantyClaimNo: string | null;
  warrantyOem: string | null;
  technicianId: string | null;
  removedAt: string | null;
  status: WarrantyStatus;
  approvalDocUrl: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  scrappedAt: string | null;
  scrappedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  registrationNumber?: string | null;
  customerName?: string | null;
}

export interface WarrantyListResult {
  items: WarrantyPart[];
  counts: Record<WarrantyStatus, number>;
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

export interface WarrantyListParams {
  status?: WarrantyStatus | "ALL";
  q?: string;
  page?: number;
  limit?: number;
}

export const listWarrantyParts = async (
  params: WarrantyListParams = {},
): Promise<ApiResponse<WarrantyListResult>> => {
  const { data } = await api.get(`/warranty/parts`, { params });
  return data;
};

export const getWarrantyPart = async (
  id: string,
): Promise<ApiResponse<WarrantyPart>> => {
  const { data } = await api.get(`/warranty/parts/${id}`);
  return data;
};

export interface ManualCreateWarrantyPayload {
  jobCardItemId?: string | null;
  vehicleId?: string | null;
  customerId?: string | null;
  partName: string;
  partNumber?: string | null;
  warrantyClaimNo?: string | null;
  warrantyOem?: string | null;
  notes?: string | null;
}

export const manualCreateWarrantyPart = async (
  payload: ManualCreateWarrantyPayload,
): Promise<ApiResponse<WarrantyPart>> => {
  const { data } = await api.post(`/warranty/parts`, payload);
  return data;
};

export const submitWarrantyForApproval = async (
  id: string,
): Promise<ApiResponse<WarrantyPart>> => {
  const { data } = await api.post(`/warranty/parts/${id}/submit`);
  return data;
};

export const approveWarrantyPart = async (
  id: string,
  payload: { approvalDocUrl?: string | null; notes?: string | null } = {},
): Promise<ApiResponse<WarrantyPart>> => {
  const { data } = await api.post(`/warranty/parts/${id}/approve`, payload);
  return data;
};

export const rejectWarrantyPart = async (
  id: string,
  payload: { notes?: string | null } = {},
): Promise<ApiResponse<WarrantyPart>> => {
  const { data } = await api.post(`/warranty/parts/${id}/reject`, payload);
  return data;
};

export const scrapWarrantyPart = async (
  id: string,
  payload: { notes?: string | null } = {},
): Promise<ApiResponse<WarrantyPart>> => {
  const { data } = await api.post(`/warranty/parts/${id}/scrap`, payload);
  return data;
};

export const getWarrantyTagUrl = (id: string): string => {
  const base = api.defaults.baseURL?.replace(/\/$/, "") ?? "";
  return `${base}/warranty/parts/${id}/tag.html`;
};
