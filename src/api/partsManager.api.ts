import api from './axios';

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

export interface PartsDashboardResponse {
  status: boolean;
  message: string;
  data: {
    stats: PartsDashboardStats;
    jobCardGroups: JobCardGroup[];
  };
}

export const getPartsDashboard = (): Promise<PartsDashboardResponse> =>
  api.get('/parts-manager/dashboard').then((res) => res.data);

export const getPartRequests = (status?: PartStatus): Promise<{ data: PartRequest[] }> =>
  api.get('/parts-manager/parts', { params: status ? { status } : undefined }).then((res) => res.data);

export const markPartAvailable = (partId: string): Promise<{ status: boolean; data: { id: string; status: string } }> =>
  api.put(`/parts-manager/parts/${partId}/mark-available`).then((res) => res.data);

export const markPartUnavailable = (partId: string, expectedTime: string): Promise<{ status: boolean; data: { id: string; status: string; expectedTime: string } }> =>
  api.put(`/parts-manager/parts/${partId}/mark-unavailable`, { expectedTime }).then((res) => res.data);

export const markPartDispatched = (partId: string): Promise<{ status: boolean; data: { id: string; status: string } }> =>
  api.put(`/parts-manager/parts/${partId}/mark-dispatched`).then((res) => res.data);
