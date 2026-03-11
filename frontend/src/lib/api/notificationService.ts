import apiClient from "./apiClient";
import { NotificationResponse, CursorPageResponse, ApiResponse } from "./types";

export const notificationService = {
  async listNotifications(cursor?: string): Promise<CursorPageResponse<NotificationResponse>> {
    const { data } = await apiClient.get<
      ApiResponse<CursorPageResponse<NotificationResponse>>
    >("/api/v1/notifications", { params: cursor ? { cursor } : undefined });
    return data.data;
  },

  async markRead(id: number): Promise<void> {
    await apiClient.put(`/api/v1/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await apiClient.put("/api/v1/notifications/read-all");
  },
};
