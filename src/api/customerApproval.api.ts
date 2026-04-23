import axios from 'axios';

interface ApiResponse<T> {
  success: {
    status: boolean;
    code: number;
    message?: string;
  };
  data: T;
  error: unknown;
}

// Public API instance — no auth token needed
const publicApi = axios.create({
  baseURL: 'https://workshopbackend-fjvw.onrender.com/api',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Types ──────────────────────────────────────────────────────────────────

export type PartStatus = 'pending' | 'available' | 'unavailable' | 'dispatched';

export interface EstimatePart {
  partName: string;
  partNumber: string | null;
  quantity: number;
  status: PartStatus;
  expectedTime: string | null;
}

export interface EstimateItem {
  id: string;
  jobDescription: string;
  partsRequired: string | null;
  partsCost: string;
  labourCost: string;
  quantity: number;
  lineTotal: string;
  partStatus: PartStatus | null;
  partExpectedTime: string | null;
  parts: EstimatePart[];
}

export interface EstimateData {
  jobCard: {
    id: string;
    status: string;
    subtotal: string;
    taxLabel: string;
    taxPercentage: string;
    taxAmount: string;
    totalEstimate: string;
    sharedAt: string | null;
    approvedAt: string | null;
    currencyCode: string;
  };
  items: EstimateItem[];
  vehicle: {
    brand: string;
    model: string;
    registrationNumber: string;
  } | null;
  customerName: string;
  customerPhone: string;
}

export interface ApprovalActionData {
  jobCardId: string;
  status: string;
  approvedAt?: string;
}

// ─── API Functions ──────────────────────────────────────────────────────────

export const getEstimateByToken = async (token: string): Promise<ApiResponse<EstimateData>> => {
  const { data } = await publicApi.get(`/customer-approval/estimate/${token}`);
  return data;
};

export const approveEstimate = async (
  token: string,
  approvedItems?: string[],
): Promise<ApiResponse<ApprovalActionData>> => {
  const { data } = await publicApi.post(`/customer-approval/estimate/${token}/approve`, {
    approvedItems,
  });
  return data;
};

export const requestModification = async (
  token: string,
  note: string,
): Promise<ApiResponse<{ jobCardId: string; status: string }>> => {
  const { data } = await publicApi.post(`/customer-approval/estimate/${token}/request-modification`, { note });
  return data;
};

export const rejectEstimate = async (token: string): Promise<ApiResponse<ApprovalActionData>> => {
  const { data } = await publicApi.post(`/customer-approval/estimate/${token}/reject`);
  return data;
};
