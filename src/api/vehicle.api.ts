import api from "./axios";

export interface VehicleListParams {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
  status?: string;
  filter?: "ALL" | "INSIDE" | "PENDING_EXIT";
  dateFrom?: string;
  dateTo?: string;
  vin?: string;
  includeAll?: boolean;
}

export type VehicleStatus = "Entry (Draft)" | "Vehicle IN" | "Inspection (Draft)" | "Inspection Done" | "Job Card (Draft)" | "Job Card (Pending Parts Approval)" | "Job Card (Parts Approval Done)" | "Job Card (Pending Cust. Approval)" | "Job Card (Partial Cust. Approval)" | "Job Card (Full Cust. Approval)" | "In Service" | "Ready for Billing" | "Completed" | "Cancelled";

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

export interface VehiclePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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

export interface VehicleListResponse {
  status: boolean;
  message: string;
  data: VehicleItem[];
  stats: VehicleStats;
  pagination: VehiclePagination;
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

export interface SearchVehicleResponse {
  status: boolean;
  message: string;
  data: SearchVehicleItem[];
}

export const listVehicles = async (
  params: VehicleListParams = {}
): Promise<VehicleListResponse> => {
  const { data } = await api.get("/vehicles", { params });
  return data;
};

export const searchVehicles = async (
  vin: string
): Promise<SearchVehicleResponse> => {
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

export interface AddVehicleResponse {
  status: boolean;
  message: string;
  data: {
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
  };
}

export const addVehicle = async (
  payload: AddVehiclePayload
): Promise<AddVehicleResponse> => {
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
    // warranty & insurance
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

export interface VehicleDetailResponse {
  status: boolean;
  message: string;
  data: VehicleDetailData;
}

export const getVehicleDetails = async (
  vehicleId: string
): Promise<VehicleDetailResponse> => {
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

export interface UploadImagesResponse {
  status: boolean;
  message: string;
  data: {
    uploaded: UploadedImage[];
    photosCaptured: string;
  };
}

export const uploadVehicleImages = async (
  vehicleId: string,
  files: File[],
  category?: string
): Promise<UploadImagesResponse> => {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  if (category) formData.append("category", category);
  const { data } = await api.post(`/vehicles/${vehicleId}/images`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export interface ReplaceImageResponse {
  status: boolean;
  message: string;
  data: UploadedImage;
}

export const replaceVehicleImage = async (
  vehicleId: string,
  imageId: string,
  file: File,
  category?: string
): Promise<ReplaceImageResponse> => {
  const formData = new FormData();
  formData.append("images", file);
  if (category) formData.append("category", category);
  const { data } = await api.put(
    `/vehicles/${vehicleId}/images/${imageId}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

export const deleteVehicleImage = async (
  vehicleId: string,
  imageId: string
): Promise<{ status: boolean; message: string }> => {
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

export const listMakes = async (): Promise<{
  status: boolean;
  message: string;
  data: VehicleMake[];
}> => {
  const { data } = await api.get("/vehicles/makes");
  return data;
};

export const listModelsByMake = async (
  makeId: string
): Promise<{
  status: boolean;
  message: string;
  data: VehicleModel[];
}> => {
  const { data } = await api.get(`/vehicles/makes/${makeId}/models`);
  return data;
};

// ---- Delete Vehicle ----

export const deleteVehicle = async (
  vehicleId: string
): Promise<{ status: boolean; message: string }> => {
  const { data } = await api.delete(`/vehicles/${vehicleId}`);
  return data;
};

export const hardDeleteVehicle = async (
  vehicleId: string
): Promise<{ status: boolean; message: string }> => {
  const { data } = await api.delete(`/vehicles/${vehicleId}/permanent`);
  return data;
};

// ---- Confirm Entry ----

export interface ConfirmEntryResponse {
  status: boolean;
  message: string;
  data: {
    registration: string;
    owner: string;
    photosCaptured: string;
    entryTime: string;
  };
}

export const confirmVehicleEntry = async (
  vehicleId: string,
  odometerReading?: number
): Promise<ConfirmEntryResponse> => {
  const { data } = await api.post(`/vehicles/${vehicleId}/confirm`, { odometerReading });
  return data;
};

// ---- VIN Lookup (Third-Party) ----
export type VinLookupFields = Record<string, string>;

export interface VinLookupResponse {
  status: boolean;
  found: boolean;
  message: string;
  data: {
    CustomerDetail: VinLookupFields;
    CustomerProfile: VinLookupFields;
    Vehicles: VinLookupFields;
  };
}

export const vinLookup = async (
  vin: string
): Promise<VinLookupResponse> => {
  const { data } = await api.post("/vehicles/vin-lookup", { vin });
  return data;
};

// ─── Re-Entry Vehicle ─────────────────────────────────────────────────────────
export const reEntryVehicle = async (vehicleId: string): Promise<{ status: boolean; message: string }> => {
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
}

export const getVehicleVisitHistory = async (vehicleId: string): Promise<{ status: boolean; data: VehicleVisit[] }> => {
  const { data } = await api.get(`/vehicles/${vehicleId}/visit-history`);
  return data;
};
