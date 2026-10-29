import api from "./axios";
import type { ApiResponse } from "./types";
import type { VehicleItem } from "./vehicle.api";

export interface QCOutDashboardParams {
  page?: number;
  limit?: number;
  filter?: "ALL" | "READY_FOR_BILLING" | "COMPLETED";
  sortOrder?: "asc" | "desc";
  dateFrom?: string;
  dateTo?: string;
}

export interface QCOutVehicleItem extends VehicleItem {
  updatedAt?: string;
}

export interface QCOutListData {
  data: QCOutVehicleItem[];
  total: number;
  page: number;
  limit: number;
}

const FILTER_STATUS_MAP: Record<"ALL" | "READY_FOR_BILLING" | "COMPLETED", string | undefined> = {
  ALL: undefined,
  READY_FOR_BILLING: "Ready for Billing",
  COMPLETED: "Completed",
};

export const getQCOutDashboard = async (
  params: QCOutDashboardParams = {}
): Promise<ApiResponse<QCOutListData>> => {
  const { filter = "ALL", ...rest } = params;
  const status = FILTER_STATUS_MAP[filter];
  const { data } = await api.get("/vehicles", {
    params: {
      ...rest,
      ...(status ? { status } : { filter: "PENDING_EXIT" }),
    },
  });
  return data;
};

export const markVehicleCompleted = async (
  vehicleId: string
): Promise<ApiResponse<{ id: string; status: string }>> => {
  const { data } = await api.put(`/service-advisor/vehicles/${vehicleId}/status`, {
    status: "Completed",
  });
  return data;
};
