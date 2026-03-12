import apiClient from "./apiClient";
import {
  SlotResponse,
  CreateSlotRequest,
  UpdateSlotRequest,
  GroupProgressResponse,
  ApiResponse,
} from "./types";

export const slotService = {
  async listSlots(groupId: number): Promise<SlotResponse[]> {
    const { data } = await apiClient.get<ApiResponse<SlotResponse[]>>(
      `/api/v1/groups/${groupId}/slots`
    );
    return data.data;
  },

  async createSlot(groupId: number, body: CreateSlotRequest): Promise<SlotResponse> {
    const { data } = await apiClient.post<ApiResponse<SlotResponse>>(
      `/api/v1/groups/${groupId}/slots`,
      body
    );
    return data.data;
  },

  async updateSlot(
    groupId: number,
    slotId: number,
    body: UpdateSlotRequest
  ): Promise<SlotResponse> {
    const { data } = await apiClient.put<ApiResponse<SlotResponse>>(
      `/api/v1/groups/${groupId}/slots/${slotId}`,
      body
    );
    return data.data;
  },

  async deleteSlot(groupId: number, slotId: number): Promise<void> {
    await apiClient.delete(`/api/v1/groups/${groupId}/slots/${slotId}`);
  },

  async reorderSlots(groupId: number, slotIds: number[]): Promise<void> {
    await apiClient.put(`/api/v1/groups/${groupId}/slots/reorder`, { slotIds });
  },

  async bindUpload(groupId: number, slotId: number, assetId: number): Promise<void> {
    await apiClient.put(`/api/v1/groups/${groupId}/slots/${slotId}/upload`, { assetId });
  },

  async getProgress(groupId: number): Promise<GroupProgressResponse> {
    const { data } = await apiClient.get<ApiResponse<GroupProgressResponse>>(
      `/api/v1/groups/${groupId}/progress`
    );
    return data.data;
  },
};
