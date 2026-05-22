import api from "./axios";
import type { ApiResponse } from "./types";

export type WorkshopPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type RepairCategory =
  | "ENGINE"
  | "TRANSMISSION"
  | "ELECTRICAL"
  | "BRAKES"
  | "BODY"
  | "AC"
  | "OTHER";

export interface BayOccupant {
  allocationId: string;
  checkInId: string;
  vehicleReg: string | null;
  vehicleBrand: string;
  vehicleModel: string;
  priority: WorkshopPriority;
  repairCategory: RepairCategory;
  allocatedAt: string;
}

export interface WorkshopBay {
  id: string;
  bayNo: string;
  location: string | null;
  capabilities: string[];
  isActive: boolean;
  currentAllocationId: string | null;
  occupant: BayOccupant | null;
}

export interface ForemanDashboardItem {
  checkInId: string;
  roStatus: string;
  vehicleId: string;
  registrationNumber: string | null;
  brand: string;
  model: string;
  receivingNo: string | null;
  complaintText: string | null;
  damagesNotes: string | null;
  customerName: string | null;
  checkInTime: string;
  allocation: {
    checkInId: string;
    bayId: string;
    bayNo: string;
    priority: WorkshopPriority;
    repairCategory: RepairCategory;
    notes: string | null;
    allocatedAt: string;
    allocatedBy: string | null;
    allocatedByName: string | null;
  } | null;
}

export interface ForemanDashboardData {
  items: ForemanDashboardItem[];
  stats: { awaiting: number; inWorkshop: number };
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

export const getForemanDashboard = async (
  params?: { page?: number; limit?: number; tab?: 'awaiting' | 'inWorkshop' | 'rework' },
): Promise<ApiResponse<ForemanDashboardData>> => {
  const { data } = await api.get(`/workshop/dashboard`, { params });
  return data;
};

// ─── Bay CRUD ─────────────────────────────────────────────────────────────

export const listBays = async (): Promise<ApiResponse<WorkshopBay[]>> => {
  const { data } = await api.get(`/workshop/bays`);
  return data;
};

export const createBay = async (
  payload: { bayNo: string; location?: string; capabilities?: string[]; isActive?: boolean },
): Promise<ApiResponse<WorkshopBay>> => {
  const { data } = await api.post(`/workshop/bays`, payload);
  return data;
};

export const updateBay = async (
  id: string,
  payload: Partial<{ bayNo: string; location: string | null; capabilities: string[]; isActive: boolean }>,
): Promise<ApiResponse<WorkshopBay>> => {
  const { data } = await api.put(`/workshop/bays/${id}`, payload);
  return data;
};

export const deleteBay = async (id: string): Promise<ApiResponse<null>> => {
  const { data } = await api.delete(`/workshop/bays/${id}`);
  return data;
};

// ─── Allocation actions ──────────────────────────────────────────────────

export interface ReworkAssignment {
  jobCardItemId: string;
  technicianId: string;
  reworkNotes?: string;
}

export interface AllocatePayload {
  bayId: string;
  priority: WorkshopPriority;
  repairCategory: RepairCategory;
  notes?: string;
  reworkAssignments?: ReworkAssignment[];
}

export const allocateToBay = async (
  checkInId: string,
  payload: AllocatePayload,
): Promise<ApiResponse<unknown>> => {
  const { data } = await api.post(`/workshop/check-ins/${checkInId}/allocate`, payload);
  return data;
};

export const reallocateBay = async (
  checkInId: string,
  payload: AllocatePayload,
): Promise<ApiResponse<unknown>> => {
  const { data } = await api.post(`/workshop/check-ins/${checkInId}/reallocate`, payload);
  return data;
};

export const releaseAllocation = async (
  checkInId: string,
): Promise<ApiResponse<null>> => {
  const { data } = await api.post(`/workshop/check-ins/${checkInId}/release`);
  return data;
};

export const REPAIR_CATEGORIES: { value: RepairCategory; label: string }[] = [
  { value: "ENGINE", label: "Engine" },
  { value: "TRANSMISSION", label: "Transmission" },
  { value: "ELECTRICAL", label: "Electrical" },
  { value: "BRAKES", label: "Brakes" },
  { value: "BODY", label: "Body" },
  { value: "AC", label: "A/C" },
  { value: "OTHER", label: "Other" },
];

export const PRIORITIES: { value: WorkshopPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];
