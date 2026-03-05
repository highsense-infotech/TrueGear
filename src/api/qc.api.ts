import api from "./axios";

// --- Dashboard API ---

export interface QCDashboardParams {
  page?: number;
  limit?: number;
  filter?: "ALL" | "URGENT" | "DELAYED" | "COMPLETED";
  sortOrder?: "asc" | "desc";
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

export interface QCDashboardResponse {
  status: boolean;
  message: string;
  data: {
    stats: QCStats;
    queue: QCQueueItem[];
    pagination: QCPagination;
  };
}

export const getQCDashboard = async (
  params: QCDashboardParams = {}
): Promise<QCDashboardResponse> => {
  const { data } = await api.get("/qc-inspections/dashboard", { params });
  return data;
};

// --- Start Inspection API ---

export interface StartInspectionPayload {
  vehicleId: string;
  serviceType?: string;
  priority?: string;
}

export interface StartInspectionResponse {
  status: boolean;
  message: string;
  data: {
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
  };
}

export const startInspection = async (
  payload: StartInspectionPayload
): Promise<StartInspectionResponse> => {
  const { data } = await api.post("/qc-inspections", payload);
  return data;
};

// --- Get Inspection Details API ---

export interface InspectionItem {
  id: string;
  itemCode: string;
  itemLabel: string;
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

export interface InspectionDetailsResponse {
  status: boolean;
  message: string;
  data: {
    inspection: {
      id: string;
      vehicleCheckInId: string;
      status: string;
      currentStep: number;
      serviceType: string;
      priority: string;
    };
    vehicle: InspectionVehicle;
    categories: {
      EXTERIOR: InspectionItem[];
      INTERIOR: InspectionItem[];
      BRAKE: InspectionItem[];
    };
    summary: InspectionSummary;
    findings: InspectionFindings;
  };
}

export const getInspectionDetails = async (
  inspectionId: string
): Promise<InspectionDetailsResponse> => {
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

export interface SaveStepItemsResponse {
  status: boolean;
  message: string;
  data: {
    currentStep: number;
    categories: {
      EXTERIOR: InspectionItem[];
      INTERIOR: InspectionItem[];
      BRAKE: InspectionItem[];
    };
    summary: InspectionSummary;
  };
}

export const saveStepItems = async (
  inspectionId: string,
  payload: SaveStepItemsPayload
): Promise<SaveStepItemsResponse> => {
  const { data } = await api.put(
    `/qc-inspections/${inspectionId}/items`,
    payload
  );
  return data;
};

// --- Upload Item Photo API ---

export interface UploadItemPhotoResponse {
  status: boolean;
  message: string;
  data: {
    photo: {
      id: string;
      imageUrl: string;
    };
    photoCount: number;
  };
}

export const uploadItemPhoto = async (
  inspectionId: string,
  itemId: string,
  file: File
): Promise<UploadItemPhotoResponse> => {
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
): Promise<{ status: boolean; message: string }> => {
  const { data } = await api.delete(
    `/qc-inspections/${inspectionId}/items/${itemId}/photos/${photoId}`
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

export interface SaveFindingsResponse {
  status: boolean;
  message: string;
  data: {
    inspection: Record<string, unknown>;
    currentStep: number;
  };
}

export const saveFindings = async (
  inspectionId: string,
  payload: SaveFindingsPayload
): Promise<SaveFindingsResponse> => {
  const { data } = await api.put(
    `/qc-inspections/${inspectionId}/findings`,
    payload
  );
  return data;
};

// --- Submit Inspection API ---

export interface SubmitInspectionResponse {
  status: boolean;
  message: string;
  data: {
    inspectionId: string;
    vehicleCheckInId: string;
    registrationNumber: string;
    vehicleModel: string;
    overallStatus: string;
    completedAt: string;
    vehicleStatus: string;
  };
}

export const submitInspection = async (
  inspectionId: string
): Promise<SubmitInspectionResponse> => {
  const { data } = await api.post(
    `/qc-inspections/${inspectionId}/submit`
  );
  return data;
};
