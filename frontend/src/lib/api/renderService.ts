import apiClient from "./apiClient";
import { RenderJobResponse, ApiResponse } from "./types";

export const renderService = {
  async submitPersonal(projectId: number): Promise<RenderJobResponse> {
    const { data } = await apiClient.post<ApiResponse<RenderJobResponse>>(
      `/api/v1/render/personal/${projectId}`
    );
    return data.data;
  },

  async submitGroup(groupId: number): Promise<RenderJobResponse> {
    const { data } = await apiClient.post<ApiResponse<RenderJobResponse>>(
      `/api/v1/render/group/${groupId}`
    );
    return data.data;
  },

  async getRenderJob(id: number): Promise<RenderJobResponse> {
    const { data } = await apiClient.get<ApiResponse<RenderJobResponse>>(
      `/api/v1/render/jobs/${id}`
    );
    return data.data;
  },

  async retryRenderJob(id: number): Promise<RenderJobResponse> {
    const { data } = await apiClient.post<ApiResponse<RenderJobResponse>>(
      `/api/v1/render/jobs/${id}/retry`
    );
    return data.data;
  },

  async getDownloadUrl(id: number): Promise<string> {
    const { data } = await apiClient.get<ApiResponse<{ url: string }>>(
      `/api/v1/render/jobs/${id}/download-url`
    );
    return data.data.url;
  },
};
