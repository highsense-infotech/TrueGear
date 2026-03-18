import axios from 'axios';

// Public API instance — no auth token needed
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EstimateItem {
  id: string;
  jobDescription: string;
  partsRequired: string | null;
  partsCost: string;
  labourCost: string;
  quantity: number;
  lineTotal: string;
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

export interface EstimateResponse {
  status: boolean;
  data: EstimateData;
}

export interface ApprovalActionResponse {
  status: boolean;
  message: string;
  data: {
    jobCardId: string;
    status: string;
    approvedAt?: string;
  };
}

export interface RequestModificationResponse {
  status: boolean;
  message: string;
  data: {
    jobCardId: string;
    status: string;
  };
}

// ─── API Functions ──────────────────────────────────────────────────────────

export const getEstimateByToken = async (
  token: string
): Promise<EstimateResponse> => {
  const { data } = await publicApi.get(`/customer-approval/estimate/${token}`);
  return data;
};

export const approveEstimate = async (
  token: string,
  approvedItems?: string[]
): Promise<ApprovalActionResponse> => {
  const { data } = await publicApi.post(`/customer-approval/estimate/${token}/approve`, {
    approvedItems,
  });
  return data;
};

export const requestModification = async (
  token: string,
  note: string
): Promise<RequestModificationResponse> => {
  const { data } = await publicApi.post(`/customer-approval/estimate/${token}/request-modification`, { note });
  return data;
};

export const rejectEstimate = async (
  token: string
): Promise<ApprovalActionResponse> => {
  const { data } = await publicApi.post(`/customer-approval/estimate/${token}/reject`);
  return data;
};
