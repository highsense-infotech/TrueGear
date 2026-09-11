import api from "./axios";
import type { ApiResponse } from "./types";

export interface WashbayItem {
  checkInId: string;
  roStatusAt: string | null;
  vehicleId: string;
  registrationNumber: string | null;
  brand: string;
  model: string;
  receivingNo: string | null;
  customerName: string | null;
}

export const getWashbayQueue = async (): Promise<ApiResponse<WashbayItem[]>> => {
  const { data } = await api.get(`/washbay/queue`);
  return data;
};

export const markReadyForRelease = async (
  checkInId: string,
): Promise<ApiResponse<null>> => {
  const { data } = await api.post(`/washbay/check-ins/${checkInId}/ready`);
  return data;
};
