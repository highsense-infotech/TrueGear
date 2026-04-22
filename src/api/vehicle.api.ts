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
}

export interface VehicleListData {
  data: VehicleItem[];
  total: number;
  page: number;
  limit: number;
}

export interface SearchVehicleItem {
  vehicle: {
    id: string;
    vin: string;
    registrationNumber: string | null;
    brand: string;
    model: string;
    manufacturingYear: number;
    odometerLast: number | null;
    status: VehicleStatus;
    entryTime: string | null;
  };
  customer: {
    id: string;
    fullName: string;
    primaryEmail: string;
  };
  images: { id: string; vehicleId: string; imageCategory: string | null; imagePath: string; createdAt: string }[];
  imageCount: number;
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
  images: { id: string; vehicleId: string; imageCategory: string | null; imagePath: string; createdAt: string }[];
  imageCount: number;
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

export const uploadVehicleImages = async (
  vehicleId: string,
  files: File[],
  category?: string
): Promise<ApiResponse<{ uploaded: UploadedImage[]; photosCaptured: string }>> => {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  if (category) formData.append("category", category);
  const { data } = await api.post(`/vehicles/${vehicleId}/images`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const replaceVehicleImage = async (
  vehicleId: string,
  imageId: string,
  file: File,
  category?: string
): Promise<ApiResponse<UploadedImage>> => {
  const formData = new FormData();
  formData.append("images", file);
  if (category) formData.append("category", category);
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

export const confirmVehicleEntry = async (
  vehicleId: string,
  odometerReading?: number
): Promise<ApiResponse<{ registration: string; owner: string; photosCaptured: string; entryTime: string }>> => {
  const { data } = await api.post(`/vehicles/${vehicleId}/confirm`, { odometerReading });
  return data;
};

// ---- VIN Lookup (Third-Party) ----
export type VinLookupFields = Record<string, string>;

export interface VinLookupData {
  found: boolean;
  CustomerDetail: VinLookupFields;
  CustomerProfile: VinLookupFields;
  Vehicles: VinLookupFields;
}

export const vinLookup = async (vin: string): Promise<ApiResponse<VinLookupData>> => {
  const { data } = await api.post("/vehicles/vin-lookup", { vin });
  return data;
};

// ─── Re-Entry Vehicle ─────────────────────────────────────────────────────────
export const reEntryVehicle = async (
  vehicleId: string,
): Promise<{ status: boolean; message: string; data: { id: string } & Record<string, unknown> }> => {
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
