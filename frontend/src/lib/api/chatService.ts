import apiClient from "./apiClient";
import { ChatMessageResponse, SendMessageRequest, ApiResponse } from "./types";

export const chatService = {
  async listMessages(
    groupId: number,
    cursor?: number
  ): Promise<ChatMessageResponse[]> {
    const { data } = await apiClient.get<ApiResponse<ChatMessageResponse[]>>(
      `/api/v1/groups/${groupId}/chat`,
      { params: cursor ? { cursor } : undefined }
    );
    return data.data;
  },

  async sendMessage(groupId: number, body: SendMessageRequest): Promise<ChatMessageResponse> {
    const { data } = await apiClient.post<ApiResponse<ChatMessageResponse>>(
      `/api/v1/groups/${groupId}/chat`,
      body
    );
    return data.data;
  },
};
