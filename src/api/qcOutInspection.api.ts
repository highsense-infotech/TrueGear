import api from "./axios";
import type { ApiResponse } from "./types";

// Phase 5 — QC Out inspection (PASS/FAIL final-gate). Distinct from the
// older `qcOut.api.ts` which lists Ready-for-Billing vehicles for the
// Vehicle-Out screen (legacy naming).

export interface QcOutQueueItem {
  checkInId: string;
  roStatus: string;
  roStatusAt: string | null;
  vehicleId: string;
  registrationNumber: string | null;
  brand: string;
  model: string;
  receivingNo: string | null;
  customerName: string | null;
}

export interface QcOutRecent {
  id: string;
  checkInId: string;
  overallStatus: "PASS" | "FAIL";
  finalRemarks: string | null;
  completedAt: string;
  inspectorId: string | null;
  inspectorName: string | null;
  registrationNumber: string | null;
  brand: string;
  model: string;
}

export interface QcOutDashboardData {
  awaiting: QcOutQueueItem[];
  recent: QcOutRecent[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
  recentPagination?: { page: number; limit: number; total: number; totalPages: number };
}

export interface QcOutChecklistItem {
  id: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
}

export type QcOutItemStatus = "PASS" | "FAIL" | "NA";

export interface SubmitInspectionItem {
  itemLabel: string;
  status: QcOutItemStatus;
  notes?: string;
  sortOrder?: number;
  photoUrls?: string[];
  // Phase 9 — 3.10. Optional but recommended so comparison endpoint can
  // join QC In ↔ QC Out row-by-row.
  category?: string;
  subCategory?: string;
  itemCode?: string;
  qcInItemId?: string;
}

export interface SubmitWorkVerification {
  jobCardItemId: string;
  result: QcOutItemStatus;
  notes?: string;
}

export interface SubmitInspectionPayload {
  overallStatus: "PASS" | "FAIL";
  finalRemarks?: string;
  signatureImageUrl?: string;
  items: SubmitInspectionItem[];
  works?: SubmitWorkVerification[];
}

export interface QcOutCompletedWork {
  id: string;
  jobCardId: string;
  jobDescription: string;
  partsRequired: string | null;
  completedAt: string | null;
  completedBy: string | null;
  completionNotes: string | null;
  isWarrantyClaim: boolean;
  warrantyClaimNo: string | null;
  technicianName: string | null;
  repairPhotos: string[];
}

export const getCompletedWorks = async (
  checkInId: string,
): Promise<ApiResponse<QcOutCompletedWork[]>> => {
  const { data } = await api.get(`/qc-out/check-ins/${checkInId}/works`);
  return data;
};

export interface QcOutFailedWork {
  id: string;
  jobCardItemId: string;
  notes: string | null;
  verifiedAt: string | null;
  jobDescription: string;
  partsRequired: string | null;
  technicianName: string | null;
}

export interface QcOutFailedWorksResult {
  inspectionId: string | null;
  status: "PASS" | "FAIL" | null;
  completedAt?: string;
  failedWorks: QcOutFailedWork[];
}

export const getFailedWorks = async (
  checkInId: string,
): Promise<ApiResponse<QcOutFailedWorksResult>> => {
  const { data } = await api.get(`/qc-out/check-ins/${checkInId}/failed-works`);
  return data;
};

export const getQcOutDashboard = async (
  params?: { page?: number; limit?: number; recentPage?: number; recentLimit?: number },
): Promise<ApiResponse<QcOutDashboardData>> => {
  const { data } = await api.get(`/qc-out/dashboard`, { params });
  return data;
};

export const getQcOutChecklist = async (): Promise<ApiResponse<QcOutChecklistItem[]>> => {
  const { data } = await api.get(`/qc-out/checklist`);
  return data;
};

export const uploadQcOutPhoto = async (
  file: File,
): Promise<ApiResponse<{ imageUrl: string }>> => {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post(`/qc-out/photos`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const submitQcOut = async (
  checkInId: string,
  payload: SubmitInspectionPayload,
): Promise<ApiResponse<{ inspectionId: string; overallStatus: "PASS" | "FAIL" }>> => {
  const { data } = await api.post(`/qc-out/check-ins/${checkInId}/submit`, payload);
  return data;
};

// ─── Phase 9 — 3.10 QC In ↔ QC Out parity ────────────────────────────────────
export interface QcInItemForReuse {
  id:           string;
  category:     string;
  subCategory:  string | null;
  itemCode:     string;
  itemLabel:    string;
  sortOrder:    number;
  qcInResult:   "PASS" | "FAIL" | "NA" | null;
  qcInComment:  string | null;
}

export interface QcComparisonRow {
  category:     string | null;
  subCategory:  string | null;
  itemCode:     string | null;
  itemLabel:    string;
  qcInItemId:   string | null;
  qcInResult:   "PASS" | "FAIL" | "NA" | null;
  qcInComment:  string | null;
  qcOutItemId:  string | null;
  qcOutResult:  "PASS" | "FAIL" | "NA" | null;
  qcOutNotes:   string | null;
  damage:       boolean;
  fixed:        boolean;
  missingAtOut: boolean;
}

export interface QcComparison {
  qcInInspectionId:  string | null;
  qcOutInspectionId: string | null;
  overallStatus?:    "PASS" | "FAIL";
  summary: {
    total:              number;
    damageCount:        number;
    fixedCount:         number;
    missingAtOutCount:  number;
  };
  rows: QcComparisonRow[];
}

export const getQcInItemsForCheckIn = async (
  checkInId: string,
): Promise<ApiResponse<{ qcInInspectionId: string; items: QcInItemForReuse[] }>> => {
  const { data } = await api.get(`/qc-out/check-ins/${checkInId}/qc-in-items`);
  return data;
};

export const getQcComparison = async (
  checkInId: string,
): Promise<ApiResponse<QcComparison>> => {
  const { data } = await api.get(`/qc-out/check-ins/${checkInId}/comparison`);
  return data;
};
