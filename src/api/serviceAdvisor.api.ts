import api from "./axios";

// ─── Dashboard ──────────────────────────────────────────────────────────────

export type SAFilterStatus = "ALL" | "INSPECTION_DONE" | "JOB_CARD_DRAFT" | "PENDING_APPROVAL" | "IN_SERVICE" | "READY_FOR_BILLING";

export interface SADashboardParams {
  page?: number;
  limit?: number;
  filter?: SAFilterStatus;
  sortOrder?: "asc" | "desc";
}

export interface SAStats {
  inspectionDone: number;
  inspectionDoneYesterday: number;
  jobCardDraft: number;
  jobCardDraftYesterday: number;
  pendingApproval: number;
  pendingApprovalYesterday: number;
  totalActive: number;
  inService: number;
  inServiceYesterday: number;
  readyForBilling: number;
  readyForBillingYesterday: number;
}

export interface SAVehicle {
  vehicleId: string;
  registrationNumber: string;
  brand: string;
  model: string;
  customerName: string | null;
  serviceType: string | null;
  waitingTime: string;
  status: string;
  hasJobCard: boolean;
  frontImage: string | null;
}

export interface SAPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SADashboardResponse {
  status: boolean;
  message: string;
  data: {
    stats: SAStats;
    activeVehicles: SAVehicle[];
    pagination: SAPagination;
  };
}

export const getServiceAdvisorDashboard = async (
  params: SADashboardParams = {}
): Promise<SADashboardResponse> => {
  const { data } = await api.get("/service-advisor/dashboard", { params });
  return data;
};

// ─── Vehicle Detail ─────────────────────────────────────────────────────────

export interface SAServiceProgress {
  entry: { status: string };
  qc: { status: string };
  approval: { status: string };
  service: { status: string };
  billing: { status: string };
}

export interface SAVehicleDetail {
  vehicle: {
    id: string;
    registrationNumber: string;
    brand: string;
    model: string;
    modelVariant: string | null;
    vin: string;
    status: string;
  };
  customer: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  serviceProgress: SAServiceProgress;
  latestInspection: {
    id: string;
    overallStatus: string;
    completedAt: string;
  } | null;
  latestJobCard: {
    id: string;
    status: string;
    totalEstimate: string;
    createdAt: string;
  } | null;
}

export interface SAVehicleDetailResponse {
  status: boolean;
  message: string;
  data: SAVehicleDetail;
}

export const getVehicleDetail = async (
  vehicleId: string
): Promise<SAVehicleDetailResponse> => {
  const { data } = await api.get(`/service-advisor/vehicles/${vehicleId}`);
  return data;
};

// ─── QC Report ──────────────────────────────────────────────────────────────

export interface SAQCItem {
  id: string;
  itemCode: string;
  itemLabel: string;
  result: string;
  comment: string | null;
}

export interface SAQCReport {
  inspectionId: string;
  overallStatus: string;
  completedAt: string;
  brakeTestSummary: {
    performance: string | null;
    noise: string | null;
    vibration: string | null;
  };
  finalRemarks: string | null;
  categories: {
    EXTERIOR: SAQCItem[];
    INTERIOR: SAQCItem[];
    BRAKE: SAQCItem[];
  };
  summary: {
    totalItems: number;
    passCount: number;
    failCount: number;
    warningCount: number;
  };
  failedItems: SAQCItem[];
}

export interface SAQCReportResponse {
  status: boolean;
  message: string;
  data: SAQCReport;
}

export const getVehicleQCReport = async (
  vehicleId: string
): Promise<SAQCReportResponse> => {
  const { data } = await api.get(`/service-advisor/vehicles/${vehicleId}/qc-report`);
  return data;
};

// ─── Vehicle History ────────────────────────────────────────────────────────

export interface SAHistoryItem {
  id: string;
  vehicleId: string;
  serviceType: string;
  serviceDate: string;
  technicianName: string | null;
  totalCost: string | null;
  duration: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SAVehicleHistoryResponse {
  status: boolean;
  message: string;
  data: {
    history: SAHistoryItem[];
  };
}

export const getVehicleHistory = async (
  vehicleId: string
): Promise<SAVehicleHistoryResponse> => {
  const { data } = await api.get(`/service-advisor/vehicles/${vehicleId}/history`);
  return data;
};

// ─── Job Cards ──────────────────────────────────────────────────────────────

export interface SAJobCard {
  id: string;
  vehicleId: string;
  inspectionId: string | null;
  status: string;
  subtotal: string;
  taxLabel: string;
  taxPercentage: string;
  taxAmount: string;
  totalEstimate: string;
  sharedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SAJobCardsResponse {
  status: boolean;
  message: string;
  data: {
    jobCards: SAJobCard[];
  };
}

export const getVehicleJobCards = async (
  vehicleId: string
): Promise<SAJobCardsResponse> => {
  const { data } = await api.get(`/service-advisor/vehicles/${vehicleId}/job-cards`);
  return data;
};

// ─── Suggested Jobs ────────────────────────────────────────────────────────

export interface SASuggestedJob {
  itemCode: string;
  itemLabel: string;
  category: string;
  result: string;
  comment: string | null;
  suggestedDescription: string;
}

export interface SASuggestedJobsResponse {
  status: boolean;
  message: string;
  data: {
    suggestedJobs: SASuggestedJob[];
  };
}

export const getSuggestedJobs = async (
  vehicleId: string
): Promise<SASuggestedJobsResponse> => {
  const { data } = await api.get(`/service-advisor/vehicles/${vehicleId}/suggested-jobs`);
  return data;
};

// ─── Create Job Card ───────────────────────────────────────────────────────

export interface CreateJobCardItem {
  jobDescription: string;
  partsRequired?: string | null;
  partsCost: number;
  labourCost: number;
  quantity: number;
}

export interface CreateJobCardPayload {
  inspectionId?: string | null;
  items: CreateJobCardItem[];
  taxLabel?: string;
  taxPercentage?: number;
}

export interface CreateJobCardResponse {
  status: boolean;
  message: string;
  data: {
    jobCard: SAJobCard;
    items: any[];
  };
}

export const createJobCard = async (
  vehicleId: string,
  payload: CreateJobCardPayload
): Promise<CreateJobCardResponse> => {
  const { data } = await api.post(`/service-advisor/vehicles/${vehicleId}/job-cards`, payload);
  return data;
};

// ─── Get Job Card Detail ───────────────────────────────────────────────────

export interface SAJobCardDetailResponse {
  status: boolean;
  message: string;
  data: {
    jobCard: SAJobCard;
    items: {
      id: string;
      jobCardId: string;
      jobDescription: string;
      partsRequired: string | null;
      partsCost: string;
      labourCost: string;
      quantity: number;
      lineTotal: string;
      sortOrder: number;
    }[];
    vehicle: {
      registrationNumber: string;
      brand: string;
      model: string;
      customerName: string | null;
    } | null;
  };
}

export const getJobCardDetail = async (
  jobCardId: string
): Promise<SAJobCardDetailResponse> => {
  const { data } = await api.get(`/service-advisor/job-cards/${jobCardId}`);
  return data;
};

// ─── Update Job Card ───────────────────────────────────────────────────────

export interface UpdateJobCardPayload {
  items: CreateJobCardItem[];
  taxLabel?: string;
  taxPercentage?: number;
}

export const updateJobCard = async (
  jobCardId: string,
  payload: UpdateJobCardPayload
): Promise<CreateJobCardResponse> => {
  const { data } = await api.put(`/service-advisor/job-cards/${jobCardId}`, payload);
  return data;
};

// ─── Share Estimate ────────────────────────────────────────────────────────

export interface ShareEstimateResponse {
  status: boolean;
  message: string;
  data: {
    jobCardId: string;
    status: string;
    sharedAt: string;
    vehicleStatus: string;
    whatsappSent: boolean;
  };
}

export const shareEstimate = async (
  jobCardId: string
): Promise<ShareEstimateResponse> => {
  const { data } = await api.post(`/service-advisor/job-cards/${jobCardId}/share`);
  return data;
};

// ─── Approve Job Card ──────────────────────────────────────────────────────

export interface ApproveJobCardResponse {
  status: boolean;
  message: string;
  data: {
    jobCardId: string;
    status: string;
    approvedAt: string;
    vehicleStatus: string;
  };
}

export const approveJobCard = async (
  jobCardId: string
): Promise<ApproveJobCardResponse> => {
  const { data } = await api.post(`/service-advisor/job-cards/${jobCardId}/approve`);
  return data;
};
