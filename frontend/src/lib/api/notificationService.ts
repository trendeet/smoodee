import apiClient from "./apiClient";
import { NotificationResponse, ApiResponse } from "./types";

export const notificationService = {
  async listNotifications(cursor?: number): Promise<NotificationResponse[]> {
    const { data } = await apiClient.get<ApiResponse<NotificationResponse[]>>(
      "/api/v1/notifications",
      { params: cursor ? { cursor } : undefined }
    );
    return data.data;
  },

  async markRead(id: number): Promise<void> {
    await apiClient.put(`/api/v1/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await apiClient.put("/api/v1/notifications/read-all");
  },
};
