import api from "./axios";
import type { ApiResponse } from "./types";

export interface VehicleListParams {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
  status?: string;
  filter?: "ALL" | "INSIDE" | "PENDING_EXIT";
  dateFrom?: string;
  dateTo?: string;
  vin?: string;
  customerId?: string;
  includeAll?: boolean;
}

export type VehicleStatus =
  | "Entry (Draft)"
  | "Vehicle IN"
  | "Inspection (Draft)"
  | "Inspection Done"
  | "Job Card (Draft)"
  | "Job Card (Pending Parts Approval)"
  | "Job Card (Parts Approval Done)"
  | "Job Card (Pending Cust. Approval)"
  | "Job Card (Partial Cust. Approval)"
  | "Job Card (Full Cust. Approval)"
  | "In Service"
  | "Ready for Billing"
  | "Completed"
  | "Cancelled";

export interface VehicleItem {
  id: string;
  vehicleId: string;
  vin: string;
  registrationNumber: string;
  brand: string;
  model: string;
  manufacturingYear: number;
  odometerLast: number;
  status: VehicleStatus;
  entryTime: string | null;
  updatedAt?: string | null;
  customerName: string;
  imageCount: number;
  frontImage: string | null;
  roStatus: string | null;
  receivingNo: string | null;
  driverName: string | null;
  driverPhone: string | null;
  driverLicenceNo: string | null;
  fuelLevel: FuelLevel | null;
  damagesNotes: string | null;
  complaintText: string | null;
  bayNo: string | null;
  allocationPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | null;
  repairCategory: string | null;
}

export interface VehicleListData {
  data: VehicleItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface VehicleStats {
  vehiclesEnteredToday: number;
  vehiclesEnteredYesterday: number;
  currentlyInside: number;
  currentlyInsideYesterday: number;
  pendingInspection: number;
  pendingExitYesterday: number;
  inProgress: number;
  completed: number;
  avgTimeInside: string;
  avgTimeInsideYesterday: string;
}

export interface SearchVehicleItem {
  id: string;
  customerId: string | null;
  vin: string;
  registrationNumber: string | null;
  brand: string;
  model: string;
  manufacturingYear: number;
  odometerLast: number | null;
  status: VehicleStatus;
  entryTime: string | null;
  primaryImageUrl: string | null;
  activeCheckIn: {
    id: string;
    status: string;
    checkInTime: string;
  } | null;
  inWorkshop: boolean;
  pendingJobItems: number;
  hasActiveAppointment: boolean;
  activeAppointment: {
    id: string;
    serviceType: string;
    appointmentDate: string;
    appointmentTime: string;
  } | null;
}

export const listVehicles = async (
  params: VehicleListParams = {}
): Promise<ApiResponse<VehicleListData>> => {
  const { data } = await api.get("/vehicles", { params });
  return data;
};

export const searchVehicles = async (vin: string): Promise<ApiResponse<SearchVehicleItem[]>> => {
  const { data } = await api.get("/vehicles/search", { params: { vin } });
  return data;
};

export interface AddVehiclePayload {
  customerId: string;
  vin: string;
  brand: string;
  model: string;
  manufacturingYear: number;
  registrationNumber?: string;
  odometerLast?: number;
  modelVariant?: string;
  engineNumber?: string;
  extColour?: string;
  intColour?: string;
  fuelType?: string;
  transmissionType?: string;
  bodyType?: string;
  noOfDoors?: number;
  noOfPassengers?: number;
  condition?: string;
  priority?: string;
  serviceType?: string;
  seriesDescription?: string;
  modelDescription?: string;
  modelCode?: string;
  registrationDate?: string;
  registrationYear?: number;
}

export interface AddVehicleData {
  id: string;
  customerId: string;
  vin: string;
  brand: string;
  model: string;
  manufacturingYear: number;
  odometerLast: number;
  registrationNumber: string;
  status: string;
  entryTime: string;
}

export const addVehicle = async (payload: AddVehiclePayload): Promise<ApiResponse<AddVehicleData>> => {
  const { data } = await api.post("/vehicles", payload);
  return data;
};

export type UpdateVehiclePayload = Partial<AddVehiclePayload>;

export const updateVehicle = async (
  vehicleId: string,
  payload: UpdateVehiclePayload,
): Promise<ApiResponse<AddVehicleData>> => {
  const { data } = await api.put(`/vehicles/${vehicleId}`, payload);
  return data;
};

export interface VehicleDetailCustomer {
  id: string;
  crmReferenceNo: string;
  custSequenceId: string;
  customerType: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  primaryEmail: string;
  contactNumber: string | null;
  fullName: string;
}

export interface VehicleDetailData {
  vehicle: {
    id: string;
    vin: string;
    brand: string;
    model: string;
    modelVariant: string | null;
    // Present at runtime (getVehicleDetails returns the full vehicle row); used
    // to prefill the Model Code dropdown when editing a saved vehicle.
    modelCode: string | null;
    modelDescription: string | null;
    manufacturingYear: number;
    registrationNumber: string;
    engineNumber: string | null;
    bodyType: string | null;
    fuelType: string | null;
    transmissionType: string | null;
    odometerLast: number;
    status: string;
    priority: string;
    serviceType: string;
    entryTime: string | null;
    warrantyActive: boolean;
    warrantyStartDate: string | null;
    warrantyNumber: string | null;
    oemWarrantyEnd: string | null;
    certifiedPreOwned: boolean;
    certificationNo: string | null;
    condition: string | null;
  };
  customer: VehicleDetailCustomer;
  images: { id: string; vehicleId: string; imageCategory: string | null; imagePath: string; createdAt: string; capturedAt?: string | null }[];
  imageCount: number;
  // Phase 1 — per-visit fields captured at gate entry. Null if there's no
  // active visit yet (vehicle exists in master but no current check-in).
  activeCheckIn: {
    id: string;
    receivingNo: string | null;
    driverName: string | null;
    driverPhone: string | null;
    driverLicenceNo: string | null;
    fuelLevel: FuelLevel | null;
    damagesNotes: string | null;
    complaintText: string | null;
    // Shop the vehicle was routed to, so the confirm modal can pre-select it
    // when an entry is edited.
    shop: "SERVICE" | "MAJOR" | "PDI" | null;
    roStatus: string | null;
    odometerReading: number | null;
    checkInTime?: string | null;
  } | null;
  // Customer complaint from the open booking (BOOKED/CONFIRMED), so the
  // gate-entry form can auto-fill it. Null when there's no open appointment
  // or it has no complaints.
  appointmentComplaint: string | null;
}

export const getVehicleDetails = async (vehicleId: string): Promise<ApiResponse<VehicleDetailData>> => {
  const { data } = await api.get(`/vehicles/${vehicleId}`);
  return data;
};

// ---- Vehicle Images ----

export interface UploadedImage {
  id: string;
  vehicleId: string;
  imageCategory: string | null;
  imagePath: string;
  createdAt: string;
}

export interface PhotoMeta {
  capturedAt?: string;
  gpsLat?: number | null;
  gpsLng?: number | null;
  gpsAccuracyM?: number | null;
  addressText?: string | null;
  deviceUserAgent?: string;
}

export const uploadVehicleImages = async (
  vehicleId: string,
  files: File[],
  category?: string,
  meta?: PhotoMeta,
): Promise<ApiResponse<{ uploaded: UploadedImage[]; photosCaptured: string }>> => {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  if (category) formData.append("category", category);
  // Phase 8 — compliance metadata (3.3). Server rejects uploads older than
  // 5 minutes to ensure photos are live captures, not gallery selections.
  if (meta?.capturedAt)      formData.append("capturedAt",      meta.capturedAt);
  if (meta?.gpsLat   != null) formData.append("gpsLat",          String(meta.gpsLat));
  if (meta?.gpsLng   != null) formData.append("gpsLng",          String(meta.gpsLng));
  if (meta?.gpsAccuracyM != null) formData.append("gpsAccuracyM", String(meta.gpsAccuracyM));
  if (meta?.addressText)      formData.append("addressText",      meta.addressText);
  if (meta?.deviceUserAgent)  formData.append("deviceUserAgent",  meta.deviceUserAgent);
  const { data } = await api.post(`/vehicles/${vehicleId}/images`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const replaceVehicleImage = async (
  vehicleId: string,
  imageId: string,
  file: File,
  category?: string,
  meta?: PhotoMeta,
): Promise<ApiResponse<UploadedImage>> => {
  const formData = new FormData();
  formData.append("images", file);
  if (category) formData.append("category", category);
  if (meta?.capturedAt)         formData.append("capturedAt",      meta.capturedAt);
  if (meta?.gpsLat   != null)   formData.append("gpsLat",          String(meta.gpsLat));
  if (meta?.gpsLng   != null)   formData.append("gpsLng",          String(meta.gpsLng));
  if (meta?.gpsAccuracyM != null) formData.append("gpsAccuracyM",  String(meta.gpsAccuracyM));
  if (meta?.addressText)        formData.append("addressText",      meta.addressText);
  if (meta?.deviceUserAgent)    formData.append("deviceUserAgent",  meta.deviceUserAgent);
  const { data } = await api.put(`/vehicles/${vehicleId}/images/${imageId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const deleteVehicleImage = async (
  vehicleId: string,
  imageId: string
): Promise<ApiResponse<null>> => {
  const { data } = await api.delete(`/vehicles/${vehicleId}/images/${imageId}`);
  return data;
};

// ---- Vehicle Makes & Models ----

export interface VehicleMake {
  id: string;
  name: string;
}

export interface VehicleModel {
  id: string;
  name: string;
}

export const listMakes = async (): Promise<ApiResponse<VehicleMake[]>> => {
  const { data } = await api.get("/vehicles/makes");
  return data;
};

export const listModelsByMake = async (makeId: string): Promise<ApiResponse<VehicleModel[]>> => {
  const { data } = await api.get(`/vehicles/makes/${makeId}/models`);
  return data;
};

export interface VehicleModelCode {
  id: string;
  modelId: string;
  code: string;
  mandmCode: string | null;
  description: string | null;
  modelYear: number | null;
}

// Third level of the Make → Series → ModelCode cascade. Fetched on demand
// when a model (series) is selected; the backend caches results from Evolve.
export const listModelCodes = async (modelId: string): Promise<ApiResponse<VehicleModelCode[]>> => {
  const { data } = await api.get(`/vehicles/models/${modelId}/codes`);
  return data;
};

// ---- Delete Vehicle ----

export const deleteVehicle = async (vehicleId: string): Promise<ApiResponse<null>> => {
  const { data } = await api.delete(`/vehicles/${vehicleId}`);
  return data;
};

export const hardDeleteVehicle = async (vehicleId: string): Promise<ApiResponse<null>> => {
  const { data } = await api.delete(`/vehicles/${vehicleId}/permanent`);
  return data;
};

// ---- Confirm Entry ----

export type FuelLevel = "EMPTY" | "QUARTER" | "HALF" | "THREE_QUARTER" | "FULL";

export interface ConfirmEntryPayload {
  odometerReading?: number;
  driverName?: string;
  driverPhone?: string;
  driverLicenceNo?: string;
  fuelLevel?: FuelLevel;
  damagesNotes?: string;
  complaintText?: string;
  // Shop the vehicle is routed to at the gate (drives Major/Service scoping).
  shop?: "SERVICE" | "MAJOR" | "PDI";
}

export const confirmVehicleEntry = async (
  vehicleId: string,
  payload?: number | ConfirmEntryPayload,
): Promise<ApiResponse<{
  registration: string;
  owner: string;
  photosCaptured: string;
  entryTime: string;
  checkInId: string;
  receivingNo: string;
  roStatus: string;
}>> => {
  // Backwards-compatible signature: legacy call sites passed just the
  // odometer number. New call sites pass the full payload object.
  const body: ConfirmEntryPayload =
    typeof payload === "number" ? { odometerReading: payload } : payload ?? {};
  const { data } = await api.post(`/vehicles/${vehicleId}/confirm`, body);
  return data;
};

// ---- VIN Lookup (Third-Party) ----
export type VinLookupFields = Record<string, string>;

export interface VinLookupData {
  found: boolean;
  // Whether the result came from Evolve ("evolve") or the local DB fallback
  // ("local"). Local responses include the matched vehicle rows under `vehicles`.
  source?: 'evolve' | 'local';
  // Set on an Evolve hit when the matched customer/vehicle already exists in our
  // local DB. A non-null vehicleId means this is a re-entry of a known vehicle
  // (e.g. a completed prior visit), not a brand-new customer.
  customerId?: string | null;
  vehicleId?: string | null;
  CustomerDetail: VinLookupFields;
  CustomerProfile: VinLookupFields;
  Vehicles: VinLookupFields;
  // Populated when source === 'local'. Bare vehicle records from `vehicles`.
  vehicles?: Array<{
    id: string;
    vin: string | null;
    registrationNumber: string | null;
    brand: string | null;
    model: string | null;
    [key: string]: unknown;
  }>;
}

export const vinLookup = async (
  term: string,
  companyId?: string,
): Promise<ApiResponse<VinLookupData>> => {
  // VINs are ISO 3779 — exactly 17 alphanumeric characters. Anything else is
  // treated as a registration number. BE accepts whichever field is set and
  // routes to the matching Evolve lookup.
  // companyId (optional) makes the lookup company-aware (AI-2); omitted →
  // backend falls back to the default interface code, exactly as before.
  const trimmed = term.trim();
  const isVin = trimmed.length === 17;
  const body: { vin?: string; reg?: string; companyId?: string } = isVin
    ? { vin: trimmed }
    : { reg: trimmed };
  if (companyId) body.companyId = companyId;
  const { data } = await api.post("/vehicles/vin-lookup", body);
  return data;
};

// ─── Re-Entry Vehicle ─────────────────────────────────────────────────────────
export const reEntryVehicle = async (
  vehicleId: string,
): Promise<ApiResponse<{ id: string } & Record<string, unknown>>> => {
  const { data } = await api.post(`/vehicles/${vehicleId}/re-entry`);
  return data;
};

// ─── Visit History ────────────────────────────────────────────────────────────
export interface VisitPhoto {
  id: string;
  photoType: "FRONT" | "REAR" | "LEFT" | "RIGHT" | "DASHBOARD" | "ENGINE" | "OTHER";
  imageUrl: string;
}

export interface VisitInspection {
  id: string;
  overallStatus: "PASS" | "CONDITIONAL" | "FAIL" | null;
  finalRemarks: string | null;
  status: string;
  completedAt: string | null;
}

export interface VisitJobCard {
  id: string;
  serviceType: string | null;
  serviceCategory: string | null;
  totalEstimate: string | null;
  status: string;
  createdAt: string;
}

export interface VisitAppointment {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceType: string | null;
  status: string;
}

export interface VisitEvent {
  type:
    | "ENTRY"
    | "CHECK_IN_CONFIRMED"
    | "QC_STARTED"
    | "QC_COMPLETED"
    | "JOB_CARD_CREATED"
    | "JOB_CARD_SHARED"
    | "JOB_CARD_APPROVED"
    | "TECHNICIAN_ASSIGNED"
    | "WORK_STARTED"
    | "WORK_PAUSED"
    | "WORK_COMPLETED"
    | "GATE_PASS_ISSUED"
    | "EXIT"
    | "VISIT_COMPLETED"
    | "VISIT_CANCELLED";
  label: string;
  at: string;
  byId: string | null;
  by: string | null;
}

export interface VehicleVisit {
  id: string;
  checkInTime: string;
  completedAt: string | null;
  status: "IN_QUEUE" | "IN_SERVICE" | "READY" | "COMPLETED" | "CANCELLED";
  odometerReading: number;
  isCurrentVisit: boolean;
  photos: VisitPhoto[];
  inspection: VisitInspection | null;
  jobCard: VisitJobCard | null;
  appointment: VisitAppointment | null;
  events: VisitEvent[];
}

export const getVehicleVisitHistory = async (vehicleId: string): Promise<ApiResponse<VehicleVisit[]>> => {
  const { data } = await api.get(`/vehicles/${vehicleId}/visit-history`);
  return data;
};
