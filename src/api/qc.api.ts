import api from "./axios";
import type { ApiResponse } from "./types";

// --- Dashboard API ---

export interface QCDashboardParams {
  page?: number;
  limit?: number;
  filter?: "ALL" | "PENDING" | "COMPLETED";
  sortOrder?: "asc" | "desc";
  dateFrom?: string;
  dateTo?: string;
}

export interface QCStats {
  pendingInspection: number;
  pendingInspectionYesterday: number;
  inProgress: number;
  inProgressYesterday: number;
  completed: number;
  completedYesterday: number;
  avgTimeInside: string;
  avgTimeInsideYesterday: string;
}

export interface QCQueueItem {
  vehicleId: string;
  vehicleCheckInId: string;
  inspectionId: string | null;
  registrationNumber: string;
  brand: string;
  model: string;
  serviceType: string | null;
  waitingTime: string;
  status: string;
  priority: string;
  checkInTime: string;
  frontImage: string | null;
}

export interface QCPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface QCDashboardData {
  stats: QCStats;
  queue: QCQueueItem[];
  pagination: QCPagination;
}

export const getQCDashboard = async (
  params: QCDashboardParams = {}
): Promise<ApiResponse<QCDashboardData>> => {
  const { data } = await api.get("/qc-inspections/dashboard", { params });
  return data;
};

// --- Start Inspection API ---

export interface StartInspectionPayload {
  vehicleId: string;
  serviceType?: string;
  priority?: string;
}

export interface StartInspectionData {
  inspection: {
    id: string;
    vehicleCheckInId: string;
    serviceType: string;
    priority: string;
    status: string;
    currentStep: number;
    startedAt: string;
  };
  items: {
    id: string;
    inspectionId: string;
    category: string;
    itemCode: string;
    itemLabel: string;
    sortOrder: number;
    result: string | null;
    comment: string | null;
  }[];
}

export const startInspection = async (
  payload: StartInspectionPayload
): Promise<ApiResponse<StartInspectionData>> => {
  const { data } = await api.post("/qc-inspections", payload);
  return data;
};

// --- Get Inspection Details API ---

export interface InspectionItem {
  id: string;
  itemCode: string;
  itemLabel: string;
  subCategory: string | null;
  sortOrder: number;
  result: "PASS" | "FAIL" | "NA" | null;
  comment: string | null;
  photos: { id: string; imageUrl: string }[];
}

export interface InspectionVehicle {
  registrationNumber: string;
  brand: string;
  model: string;
  vin: string;
  customerName: string;
  imageUrl?: string | null;
}

export interface InspectionSummary {
  totalItems: number;
  passCount: number;
  failCount: number;
  naCount: number;
  pendingCount: number;
}

export interface FailedItem {
  itemCode: string;
  itemLabel: string;
  category: string;
  comment: string | null;
}

export interface InspectionFindings {
  overallStatus: string | null;
  overrideJustification: string | null;
  finalRemarks: string | null;
  brakeTestSummary: {
    performance: string | null;
    noise: string | null;
    vibration: string | null;
  };
  failedItems: FailedItem[];
  criticalIssuesDetected: boolean;
}

export interface InspectionDetailsData {
  inspection: {
    id: string;
    vehicleCheckInId: string;
    status: string;
    currentStep: number;
    serviceType: string;
    priority: string;
    // Report fields — when the inspection ran and who signed it off.
    overallStatus: string | null;
    startedAt: string | null;
    completedAt: string | null;
    timeIn: string | null;
    timeOut: string | null;
    signatureUrl: string | null;
    createdByName: string | null;
    completedByName: string | null;
  };
  vehicle: InspectionVehicle;
  appointment: {
    id: string;
    bookingRef: string;
    serviceType: string;
    complaints: string[];
    appointmentDate: string;
    appointmentTime: string;
  } | null;
  // Dynamic since the truck checklist (migration 0060): keys are whatever
  // categories the inspection's items carry (Engine, Cooling System, …).
  // The three legacy car keys are always present, so older reads stay safe.
  categories: Record<string, InspectionItem[]>;
  summary: InspectionSummary;
  findings: InspectionFindings;
}

export const getInspectionDetails = async (
  inspectionId: string
): Promise<ApiResponse<InspectionDetailsData>> => {
  const { data } = await api.get(`/qc-inspections/${inspectionId}`);
  return data;
};

// --- Save Step Items API ---

export interface SaveStepItemsPayload {
  category: "EXTERIOR" | "INTERIOR" | "BRAKE";
  items: {
    itemId: string;
    result: "PASS" | "FAIL" | "NA";
    comment?: string | null;
  }[];
}

export interface SaveStepItemsData {
  currentStep: number;
  categories: Record<string, InspectionItem[]>;
  summary: InspectionSummary;
}

export const saveStepItems = async (
  inspectionId: string,
  payload: SaveStepItemsPayload
): Promise<ApiResponse<SaveStepItemsData>> => {
  const { data } = await api.put(`/qc-inspections/${inspectionId}/items`, payload);
  return data;
};

// --- Upload Item Photo API ---

export const uploadItemPhoto = async (
  inspectionId: string,
  itemId: string,
  file: File
): Promise<ApiResponse<{ photo: { id: string; imageUrl: string }; photoCount: number }>> => {
  const formData = new FormData();
  formData.append("photo", file);
  const { data } = await api.post(
    `/qc-inspections/${inspectionId}/items/${itemId}/photos`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

// --- Delete Item Photo API ---

export const deleteItemPhoto = async (
  inspectionId: string,
  itemId: string,
  photoId: string
): Promise<ApiResponse<null>> => {
  const { data } = await api.delete(
    `/qc-inspections/${inspectionId}/items/${itemId}/photos/${photoId}`
  );
  return data;
};

// --- Save Final Confirmation API ---

export interface ConfirmationComponent {
  majorComponent?: string;
  itemNumber?: string;
  comment?: string;
}

export interface ConfirmationRework {
  majorComponent?: string;
  technician?: string;
  itemNumber?: string;
  comments?: string;
}

export interface SaveConfirmationPayload {
  components?: ConfirmationComponent[];
  rework?: ConfirmationRework;
  timeIn?: string;
  timeOut?: string;
}

export const saveConfirmation = async (
  inspectionId: string,
  payload: SaveConfirmationPayload
): Promise<ApiResponse<null>> => {
  const { data } = await api.put(`/qc-inspections/${inspectionId}/confirmation`, payload);
  return data;
};

// --- Upload Signature API ---

export const uploadSignature = async (
  inspectionId: string,
  file: Blob
): Promise<ApiResponse<{ signatureUrl: string }>> => {
  const formData = new FormData();
  formData.append("file", file, "signature.png");
  const { data } = await api.post(
    `/qc-inspections/${inspectionId}/signature`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

// --- Save Findings API ---

export interface SaveFindingsPayload {
  brakePerformance?: string | null;
  brakeNoise?: string | null;
  brakeVibration?: string | null;
  overallStatus: string;
  overrideJustification?: string | null;
  finalRemarks?: string | null;
}

export const saveFindings = async (
  inspectionId: string,
  payload: SaveFindingsPayload
): Promise<ApiResponse<{ inspection: Record<string, unknown>; currentStep: number }>> => {
  const { data } = await api.put(`/qc-inspections/${inspectionId}/findings`, payload);
  return data;
};

// --- Submit Inspection API ---

export interface SubmitInspectionData {
  inspectionId: string;
  vehicleCheckInId: string;
  registrationNumber: string;
  vehicleModel: string;
  overallStatus: string;
  completedAt: string;
  vehicleStatus: string;
}

export const submitInspection = async (
  inspectionId: string
): Promise<ApiResponse<SubmitInspectionData>> => {
  const { data } = await api.post(`/qc-inspections/${inspectionId}/submit`);
  return data;
};
