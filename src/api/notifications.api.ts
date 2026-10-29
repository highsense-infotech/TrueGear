import api from "./axios";
import type { ApiResponse } from "./types";

export interface InAppNotification {
  id: string;
  level: "INFO" | "WARN" | "CRIT";
  title: string;
  body: string;
  refType: string | null;
  refId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  items: InAppNotification[];
  unread: number;
}

export const listMyNotifications = async (): Promise<ApiResponse<NotificationsResponse>> => {
  const { data } = await api.get(`/notifications`);
  return data;
};

export const markNotificationRead = async (id: string): Promise<ApiResponse<null>> => {
  const { data } = await api.post(`/notifications/${id}/read`);
  return data;
};

export const markAllNotificationsRead = async (): Promise<ApiResponse<null>> => {
  const { data } = await api.post(`/notifications/mark-all-read`);
  return data;
};
