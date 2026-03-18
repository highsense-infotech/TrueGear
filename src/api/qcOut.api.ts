import api from "./axios";
import type { VehicleItem, VehiclePagination } from "./vehicle.api";

export interface QCOutDashboardParams {
  page?: number;
  limit?: number;
  filter?: "ALL" | "READY_FOR_BILLING" | "COMPLETED";
  sortOrder?: "asc" | "desc";
  dateFrom?: string;
  dateTo?: string;
}

export interface QCOutStats {
  readyForBilling: number;
  readyForBillingYesterday: number;
  completedToday: number;
  completedYesterday: number;
  totalExits: number;
  totalExitsYesterday: number;
  avgTimeInWorkshop: string;
  avgTimeInWorkshopYesterday: string;
}

export interface QCOutVehicleItem extends VehicleItem {
  updatedAt?: string;
}

export interface QCOutDashboardResponse {
  status: boolean;
  message: string;
  data: QCOutVehicleItem[];
  stats: QCOutStats;
  pagination: VehiclePagination;
}

const FILTER_STATUS_MAP: Record<"ALL" | "READY_FOR_BILLING" | "COMPLETED", string | undefined> = {
  ALL: undefined,
  READY_FOR_BILLING: "Ready for Billing",
  COMPLETED: "Completed",
};

export const getQCOutDashboard = async (
  params: QCOutDashboardParams = {}
): Promise<QCOutDashboardResponse> => {
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
): Promise<{ status: boolean; message: string; data: { id: string; status: string } }> => {
  const { data } = await api.put(`/service-advisor/vehicles/${vehicleId}/status`, {
    status: "Completed",
  });
  return data;
};
