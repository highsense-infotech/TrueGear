import api from './axios';
import type { ApiResponse } from './types';

export type PartStatus = 'pending' | 'available' | 'unavailable' | 'dispatched';

export interface PartRequest {
  id: string;
  partName: string;
  partNumber: string;
  vehicleNumber: string;
  vehicleModel: string;
  serviceDescription: string;
  status: PartStatus;
  requestTime: string;
  showDispatchInfo?: boolean;
  expectedTime?: string | null;
  requestedByTechnician?: boolean;
}

export interface PartsDashboardStats {
  pending: number;
  available: number;
  unavailable: number;
  dispatched: number;
}

export interface JobCardGroup {
  jobCardId: string;
  vehicleNumber: string;
  vehicleModel: string;
  jobCardStatus: string;
  createdAt: string;
  partRequests: PartRequest[];
}

export const getPartsDashboard = (): Promise<ApiResponse<{ stats: PartsDashboardStats; jobCardGroups: JobCardGroup[] }>> =>
  api.get('/parts-manager/dashboard').then((res) => res.data);

export const getPartRequests = (status?: PartStatus): Promise<ApiResponse<PartRequest[]>> =>
  api.get('/parts-manager/parts', { params: status ? { status } : undefined }).then((res) => res.data);

export interface MarkAvailablePayload {
  unitPrice?: number;
  extraLabourCost?: number;
}

export interface MarkAvailableResult {
  id: string;
  status: string;
  customerApprovalStatus?: string;
  approvalUrl?: string;
  newTotalEstimate?: string;
}

export const markPartAvailable = (
  partId: string,
  payload: MarkAvailablePayload = {},
): Promise<ApiResponse<MarkAvailableResult>> =>
  api.put(`/parts-manager/parts/${partId}/mark-available`, payload).then((res) => res.data);

export const markPartUnavailable = (
  partId: string,
  expectedTime: string,
): Promise<ApiResponse<{ id: string; status: string; expectedTime: string }>> =>
  api.put(`/parts-manager/parts/${partId}/mark-unavailable`, { expectedTime }).then((res) => res.data);

export const markPartDispatched = (partId: string): Promise<ApiResponse<{ id: string; status: string }>> =>
  api.put(`/parts-manager/parts/${partId}/mark-dispatched`).then((res) => res.data);
