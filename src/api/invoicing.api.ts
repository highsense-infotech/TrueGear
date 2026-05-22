import api from "./axios";
import type { ApiResponse } from "./types";

export type InvoiceStatus = "DRAFT" | "GENERATED" | "PARTIALLY_PAID" | "PAID" | "VOID";
export type PaymentMode = "CASH" | "CARD" | "UPI" | "BANK" | "CHEQUE";
export type InvoiceLineSource = "JOB_CARD_ITEM" | "ADJUSTMENT";

export interface ReadyForBillingRow {
  checkInId: string;
  roStatusAt: string | null;
  vehicleId: string | null;
  receivingNo: string | null;
  registrationNumber: string | null;
  brand: string | null;
  model: string | null;
  customerName: string | null;
  customerId: string | null;
  jobCard: { id: string; totalEstimate: string | null } | null;
  invoice:
    | {
        id: string;
        invoiceNo: string;
        status: InvoiceStatus;
        totalAmount: string;
        paidAmount: string;
      }
    | null;
}

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  source: InvoiceLineSource;
  refId: string | null;
  description: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  isWarranty: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: string;
  mode: PaymentMode;
  referenceNo: string | null;
  paidAt: string;
  capturedBy: string | null;
  notes: string | null;
  createdAt: string;
}

export interface GatePassLite {
  id: string;
  code: string;
  status: "ACTIVE" | "REDEEMED" | "VOIDED";
  generatedAt: string;
  redeemedAt: string | null;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  jobCardId: string;
  checkInId: string | null;
  vehicleId: string | null;
  customerId: string | null;
  status: InvoiceStatus;
  subtotal: string;
  taxLabel: string;
  taxPercentage: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  paidAmount: string;
  currencyCode: string;
  notes: string | null;
  generatedAt: string | null;
  generatedBy: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  vehicle: { registrationNumber: string | null; brand: string | null; model: string | null };
  customerName: string | null;
  lines: InvoiceLine[];
  payments: InvoicePayment[];
  gatePass: GatePassLite | null;
}

export interface InvoicePreview {
  jobCardId: string;
  taxLabel: string;
  taxPercentage: number;
  currencyCode: string;
  subtotal: string;
  taxAmount: string;
  total: string;
  lines: Omit<InvoiceLine, "id" | "invoiceId" | "createdAt">[];
}

export interface ReadyForBillingPaginated {
  data: ReadyForBillingRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  stats: { pending: number; generated: number; collected: number; avg: number };
}

export const listReadyForBilling = async (): Promise<ApiResponse<ReadyForBillingRow[]>> => {
  const { data } = await api.get(`/invoicing/ready-for-billing`);
  return data;
};

export const listReadyForBillingPaginated = async (
  params: { page: number; limit: number },
): Promise<ApiResponse<ReadyForBillingPaginated>> => {
  const { data } = await api.get(`/invoicing/ready-for-billing`, { params });
  return data;
};

export const previewInvoice = async (
  jobCardId: string,
): Promise<ApiResponse<InvoicePreview>> => {
  const { data } = await api.get(`/invoicing/job-cards/${jobCardId}/preview`);
  return data;
};

export interface GenerateInvoicePayload {
  adjustments?: { description: string; amount: number }[];
  discountAmount?: number;
  notes?: string;
}

export const generateInvoice = async (
  jobCardId: string,
  payload: GenerateInvoicePayload = {},
): Promise<ApiResponse<Invoice>> => {
  const { data } = await api.post(`/invoicing/job-cards/${jobCardId}/generate`, payload);
  return data;
};

export const getInvoice = async (id: string): Promise<ApiResponse<Invoice>> => {
  const { data } = await api.get(`/invoicing/${id}`);
  return data;
};

export interface RecordPaymentPayload {
  amount: number;
  mode: PaymentMode;
  referenceNo?: string;
  notes?: string;
}

export const recordPayment = async (
  id: string,
  payload: RecordPaymentPayload,
): Promise<ApiResponse<{ invoiceId: string; status: InvoiceStatus; paidAmount: string; gatePass: GatePassLite | null }>> => {
  const { data } = await api.post(`/invoicing/${id}/payments`, payload);
  return data;
};

export const voidInvoice = async (
  id: string,
  reason?: string,
): Promise<ApiResponse<{ id: string }>> => {
  const { data } = await api.post(`/invoicing/${id}/void`, { reason });
  return data;
};

export const getInvoicePrintUrl = (id: string): string => {
  const base = api.defaults.baseURL?.replace(/\/$/, "") ?? "";
  return `${base}/invoicing/${id}/print.html`;
};
