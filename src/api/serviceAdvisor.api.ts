import api from "./axios";
import type { ApiResponse } from "./types";

// ─── Dashboard ──────────────────────────────────────────────────────────────

export type SAFilterStatus = "ALL" | "INSPECTION_DONE" | "JOB_CARD_DRAFT" | "PENDING_APPROVAL" | "IN_SERVICE" | "READY_FOR_BILLING";

export interface SADashboardParams {
  page?: number;
  limit?: number;
  filter?: SAFilterStatus;
  sortOrder?: "asc" | "desc";
  dateFrom?: string;
  dateTo?: string;
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
  jobCardReference: string | null;
  frontImage: string | null;
}

export interface SAPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SADashboardData {
  stats: SAStats;
  activeVehicles: SAVehicle[];
  pagination: SAPagination;
}

export const getServiceAdvisorDashboard = async (
  params: SADashboardParams = {}
): Promise<ApiResponse<SADashboardData>> => {
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
    imageUrl: string | null;
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

export const getVehicleDetail = async (
  vehicleId: string
): Promise<ApiResponse<SAVehicleDetail>> => {
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

export interface SAQCComponent {
  id: string;
  majorComponent: string | null;
  itemNumber: string | null;
  comment: string | null;
  sortOrder: number;
}

export interface SAQCWorkshopRework {
  majorComponent: string | null;
  technician: string | null;
  itemNumber: string | null;
  comments: string | null;
}

export interface SAQCAppointment {
  bookingRef: string;
  serviceType: string;
  complaints: string[];
  appointmentDate: string;
  appointmentTime: string;
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
  components: SAQCComponent[];
  workshopRework: SAQCWorkshopRework | null;
  appointment: SAQCAppointment | null;
}

export const getVehicleQCReport = async (
  vehicleId: string
): Promise<ApiResponse<SAQCReport>> => {
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

export const getVehicleHistory = async (
  vehicleId: string
): Promise<ApiResponse<{ history: SAHistoryItem[] }>> => {
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
  currencyCode: string;
  sharedAt: string | null;
  approvedAt: string | null;
  approvalToken: string | null;
  modificationNote: string | null;
  createdAt: string;
  updatedAt: string;
  serviceType: string | null;
  jobType: string | null;
  description: string | null;
  // Evolve RO sync status (surfaced on the job-card detail page).
  evolveSyncStatus: string | null;
  evolveRoNumber: string | null;
  evolveLastError: string | null;
  evolveSyncedAt: string | null;
}

export const getVehicleJobCards = async (
  vehicleId: string
): Promise<ApiResponse<{ jobCards: SAJobCard[] }>> => {
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

export const getSuggestedJobs = async (
  vehicleId: string
): Promise<ApiResponse<{ suggestedJobs: SASuggestedJob[] }>> => {
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
  isWarrantyClaim?: boolean;
  warrantyClaimNo?: string | null;
  warrantyOem?: string | null;
}

export interface CreateJobCardJob {
  serviceType?: string | null;
  serviceCategory?: string | null;
  items: CreateJobCardItem[];
}

export interface CreateJobCardPayload {
  inspectionId?: string | null;
  jobs: CreateJobCardJob[];
  taxLabel?: string;
  taxPercentage?: number;
  currencyCode?: string;
  // Evolve RO Job Type code (AI-1). Optional — omitted → backend stores NULL →
  // 'INT' default at RO push. Value comes from the job-types lookup.
  jobType?: string | null;
}

export const createJobCard = async (
  vehicleId: string,
  payload: CreateJobCardPayload
): Promise<ApiResponse<{ jobCard: SAJobCard; items: any[] }>> => {
  const { data } = await api.post(`/service-advisor/vehicles/${vehicleId}/job-cards`, payload);
  return data;
};

// ─── Get Job Card Detail ───────────────────────────────────────────────────

export interface SAJobCardItem {
  id: string;
  jobCardId: string;
  jobDescription: string;
  partsRequired: string | null;
  serviceType: string | null;
  serviceCategory: string | null;
  partsCost: string;
  labourCost: string;
  quantity: number;
  lineTotal: string;
  sortOrder: number;
  isApprovedByCustomer: boolean | null;
  partStatus: 'pending' | 'available' | 'unavailable' | 'dispatched' | null;
  partExpectedTime: string | null;
  assignedTechnicianId: string | null;
  estimatedHours: string | null;
  priority: AssignTechnicianPriority | null;
  assignedAt: string | null;
  completedAt: string | null;
  isWarrantyClaim?: boolean;
  // Costing-only labour line (no part + no parts cost). Shown in costing,
  // excluded from technician assignment and parts confirmation.
  isLabourOnly?: boolean;
}

export interface SAJobCardDetailData {
  jobCard: SAJobCard;
  items: SAJobCardItem[];
  vehicle: {
    registrationNumber: string;
    brand: string;
    model: string;
    customerName: string | null;
    imageUrl: string | null;
  } | null;
}

export const getJobCardDetail = async (
  jobCardId: string
): Promise<ApiResponse<SAJobCardDetailData>> => {
  const { data } = await api.get(`/service-advisor/job-cards/${jobCardId}`);
  return data;
};

// ─── Update Job Card ───────────────────────────────────────────────────────

export interface UpdateJobCardPayload {
  jobs: CreateJobCardJob[];
  taxLabel?: string;
  taxPercentage?: number;
  currencyCode?: string;
  // Evolve RO Job Type code (AI-1). Optional; omitted → existing value preserved.
  jobType?: string | null;
}

export const updateJobCard = async (
  jobCardId: string,
  payload: UpdateJobCardPayload
): Promise<ApiResponse<{ jobCard: SAJobCard; items: any[] }>> => {
  const { data } = await api.put(`/service-advisor/job-cards/${jobCardId}`, payload);
  return data;
};

// ─── Share Estimate ────────────────────────────────────────────────────────

export interface ShareEstimateData {
  jobCardId: string;
  status: string;
  sharedAt: string;
  vehicleStatus: string;
  whatsappSent: boolean;
  emailSent: boolean;
  emailFailReason?: string;
  approvalUrl: string;
}

export const shareEstimate = async (
  jobCardId: string,
  currencyCode?: string,
): Promise<ApiResponse<ShareEstimateData>> => {
  const { data } = await api.post(`/service-advisor/job-cards/${jobCardId}/share`, { currencyCode });
  return data;
};

// ─── Approve Job Card ──────────────────────────────────────────────────────

export const approveJobCard = async (
  jobCardId: string
): Promise<ApiResponse<{ jobCardId: string; status: string; approvedAt: string; vehicleStatus: string }>> => {
  const { data } = await api.post(`/service-advisor/job-cards/${jobCardId}/approve`);
  return data;
};

// ─── Request Parts Confirmation ────────────────────────────────────────────

export const requestPartsConfirmation = async (
  jobCardId: string
): Promise<ApiResponse<{ jobCardId: string; status: string; partsRequestsCreated: number }>> => {
  const { data } = await api.post(`/service-advisor/job-cards/${jobCardId}/request-parts`);
  return data;
};

// ─── Technician Assignment ────────────────────────────────────────────────

export interface Technician {
  id: string;
  username: string;
  email: string;
  // Phase 3 — skills + workload, used by the Assign modal for "Match" chip
  // and "N active · N done" workload display. Optional for backward compat.
  skills?: string[];
  activeItemCount?: number;
  completedItemCount?: number;
}

export type AssignTechnicianPriority = "LOW" | "MEDIUM" | "HIGH";

export const listTechnicians = async (): Promise<ApiResponse<Technician[]>> => {
  const { data } = await api.get(`/service-advisor/technicians`);
  return data;
};

export interface AssignTechnicianItem {
  itemId: string;
  technicianId: string;
  estimatedHours: number;
  // Evolve labour hours (decimal). Optional: when omitted the backend defaults
  // hoursWorked ← estimatedHours and hoursSold ← hoursWorked.
  hoursWorked?: number;
  hoursSold?: number;
  priority: AssignTechnicianPriority;
}

export const assignTechnician = async (
  jobCardId: string,
  assignments: AssignTechnicianItem[],
): Promise<ApiResponse<{
  jobCardId: string;
  status: string;
  vehicleStatus: string;
  assignedCount: number;
  assignedAt: string;
}>> => {
  const { data } = await api.post(
    `/service-advisor/job-cards/${jobCardId}/assign-technician`,
    { assignments },
  );
  return data;
};

export interface ReassignItemPayload {
  technicianId: string;
  reason?: string;
  overrideSkillWarning?: boolean;
}

export interface ReassignItemResult {
  ok: true;
  itemId: string;
  fromTech: { id: string; username: string } | null;
  toTech: { id: string; username: string };
  priorSeconds: number;
  wasTimerPaused: boolean;
}

export const reassignItemTechnician = async (
  itemId: string,
  payload: ReassignItemPayload,
): Promise<ApiResponse<ReassignItemResult>> => {
  const { data } = await api.patch(
    `/service-advisor/items/${itemId}/reassign`,
    payload,
  );
  return data;
};

// ─── My Technician Jobs ────────────────────────────────────────────────────

// One row per assigned item — flat, item-level shape.
export interface TechnicianItem {
  itemId: string;
  jobCardId: string;
  vehicleId: string;
  vehicleNumber: string;
  vehicleModel: string;
  jobDescription: string;
  estimatedHours: string | null;
  priority: AssignTechnicianPriority | null;
  assignedAt: string | null;
  completedAt: string | null;
  totalSeconds: number;
  isRunning: boolean;
  status: 'pending' | 'progress' | 'completed';
}

export interface MyTechnicianJobsData {
  items: TechnicianItem[];
  stats: { pending: number; inProgress: number; completed: number };
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

export const getMyTechnicianJobs = async (
  params?: { page?: number; limit?: number; status?: 'pending' | 'progress' | 'completed' },
): Promise<ApiResponse<MyTechnicianJobsData>> => {
  const { data } = await api.get(`/service-advisor/technician/my-jobs`, { params });
  return data;
};

export const startTechnicianWork = async (
  jobCardId: string,
): Promise<ApiResponse<{ jobCardId: string; status: string; vehicleStatus: string; startedAt?: string }>> => {
  const { data } = await api.post(`/service-advisor/technician/jobs/${jobCardId}/start`);
  return data;
};

// Technician-scoped variant of getJobCardDetail. Same shape, different perm
// gate (TECHNICIAN:view instead of JOB_CARD:view) so technicians can view the
// jobs they're assigned to without holding the broader job-card permission.
// Enriched with per-item time logs and totals.
export interface ItemTimeLog {
  id: string;
  startedAt: string;
  pausedAt: string | null;
  durationSeconds: number;
}

export interface ItemPhoto {
  id: string;
  imageUrl: string | null;
  takenAt: string;
}

export interface TechnicianJobCardItem extends SAJobCardItem {
  completedAt: string | null;
  completionNotes: string | null;
  timeLogs: ItemTimeLog[];
  totalSeconds: number;
  isRunning: boolean;
  // Phase 3 — diagnosis, photos, signature
  diagnosisNotes: string | null;
  diagnosedAt: string | null;
  signatureImageUrl: string | null;
  diagnosisPhotos: ItemPhoto[];
  repairPhotos: ItemPhoto[];
  oldPartPhotos: ItemPhoto[];
  newPartPhotos: ItemPhoto[];
  newPartFittedPhotos: ItemPhoto[];
  reassignment: {
    fromTechUsername: string | null;
    reassignedByUsername: string | null;
    reassignedAt: string;
    reason: string | null;
    priorSeconds: number;
  } | null;
  partRequests: Array<{
    id: string;
    partName: string;
    partNumber: string | null;
    quantity: number;
    status: "pending" | "available" | "unavailable" | "dispatched";
    expectedTime: string | null;
    customerApprovalStatus: "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";
  }>;
}

export interface TechnicianJobCardDetailData extends Omit<SAJobCardDetailData, 'items'> {
  items: TechnicianJobCardItem[];
  totalSeconds: number;
  // Whether a workshop bay is allocated for the active visit. Work can't start
  // until this is true.
  bayAllocated: boolean;
  bayNo: string | null;
}

export const getTechnicianJobDetail = async (
  jobCardId: string,
): Promise<ApiResponse<TechnicianJobCardDetailData>> => {
  const { data } = await api.get(`/service-advisor/technician/jobs/${jobCardId}`);
  return data;
};

export const startItemWork = async (
  itemId: string,
): Promise<ApiResponse<{ itemId: string; startedAt: string; warning?: string | null }>> => {
  const { data } = await api.post(`/service-advisor/technician/items/${itemId}/start`);
  return data;
};

export const pauseItemWork = async (
  itemId: string,
): Promise<ApiResponse<{ itemId: string; pausedAt: string }>> => {
  const { data } = await api.post(`/service-advisor/technician/items/${itemId}/pause`);
  return data;
};

export const completeItemWork = async (
  itemId: string,
  notes?: string,
  opts?: { enforce?: boolean },
): Promise<ApiResponse<{ itemId: string; completedAt: string }>> => {
  const { data } = await api.post(
    `/service-advisor/technician/items/${itemId}/complete`,
    { notes: notes ?? "", ...(opts ?? {}) },
  );
  return data;
};

// ─── Phase 3 — Diagnosis, item photos, signature, mid-repair parts ────────

export const saveItemDiagnosis = async (
  itemId: string,
  notes: string,
): Promise<ApiResponse<{ itemId: string; diagnosedAt: string }>> => {
  const { data } = await api.post(
    `/service-advisor/technician/items/${itemId}/diagnosis`,
    { notes },
  );
  return data;
};

export const uploadItemPhoto = async (
  itemId: string,
  file: File,
  photoType: "DIAGNOSIS" | "REPAIR" | "OLD_PART" | "NEW_PART" | "NEW_PART_FITTED",
): Promise<ApiResponse<{ id: string; imageUrl: string }>> => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("photoType", photoType);
  const { data } = await api.post(
    `/service-advisor/technician/items/${itemId}/photos`,
    fd,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
};

export const deleteItemPhoto = async (
  photoId: string,
): Promise<ApiResponse<null>> => {
  const { data } = await api.delete(`/service-advisor/technician/photos/${photoId}`);
  return data;
};

export const uploadItemSignature = async (
  itemId: string,
  dataUrl: string,
): Promise<ApiResponse<{ itemId: string; signatureImageUrl: string }>> => {
  const { data } = await api.post(
    `/service-advisor/technician/items/${itemId}/signature`,
    { dataUrl },
  );
  return data;
};

export const requestExtraParts = async (
  itemId: string,
  payload: { partName: string; partNumber?: string; quantity?: number },
): Promise<ApiResponse<{ id: string }>> => {
  const { data } = await api.post(
    `/service-advisor/technician/items/${itemId}/parts-request`,
    payload,
  );
  return data;
};
