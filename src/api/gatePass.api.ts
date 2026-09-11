import api from "./axios";
import type { ApiResponse } from "./types";

export type GatePassStatus = "ACTIVE" | "REDEEMED" | "VOIDED";

export interface GatePass {
  id: string;
  code: string;
  invoiceId: string;
  checkInId: string | null;
  vehicleId: string | null;
  status: GatePassStatus;
  generatedAt: string;
  redeemedAt: string | null;
  odometerOut: number | null;
  driverOutName: string | null;
  driverOutLicenceImageUrl: string | null;
  driverOutSignatureUrl: string | null;
  notes: string | null;
  invoice:
    | {
        id: string;
        invoiceNo: string;
        status: string;
        totalAmount: string;
        paidAmount: string;
        currencyCode: string;
      }
    | null;
  vehicle: { registrationNumber: string | null; brand: string | null; model: string | null };
  customer: { name: string | null; email: string | null };
}

export interface GatePassListItem {
  id: string;
  code: string;
  status: GatePassStatus;
  generatedAt: string;
  vehicle: { registrationNumber: string | null; brand: string | null; model: string | null };
  customerName: string | null;
  invoiceNo: string | null;
}

export const listActiveGatePasses = async (): Promise<ApiResponse<GatePassListItem[]>> => {
  const { data } = await api.get(`/gate-pass/active`);
  return data;
};

export interface ActiveGatePassesPaginated {
  data: GatePassListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const listActiveGatePassesPaginated = async (
  params: { page: number; limit: number },
): Promise<ApiResponse<ActiveGatePassesPaginated>> => {
  const { data } = await api.get(`/gate-pass/active`, { params });
  return data;
};

export const lookupGatePass = async (code: string): Promise<ApiResponse<GatePass>> => {
  const { data } = await api.get(`/gate-pass/${encodeURIComponent(code)}`);
  return data;
};

export interface RedeemGatePassPayload {
  odometerOut?: number;
  driverOutName?: string;
  driverOutLicenceImageUrl?: string;
  driverOutSignatureUrl?: string;
  notes?: string;
}

// Uploads the driver's-licence photo captured at the gate. Returns the stored
// path (sent back in redeem as driverOutLicenceImageUrl) and a signed preview URL.
export const uploadGatePassLicencePhoto = async (
  file: File,
): Promise<ApiResponse<{ path: string; url: string }>> => {
  const formData = new FormData();
  formData.append("image", file);
  const { data } = await api.post(`/gate-pass/licence-photo`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const redeemGatePass = async (
  code: string,
  payload: RedeemGatePassPayload,
): Promise<ApiResponse<{ code: string; status: GatePassStatus }>> => {
  const { data } = await api.post(`/gate-pass/${encodeURIComponent(code)}/redeem`, payload);
  return data;
};
