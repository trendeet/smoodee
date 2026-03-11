import apiClient from "./apiClient";
import { AssetResponse, ApiResponse } from "./types";

export const assetService = {
  async uploadAsset(projectId: number, file: File): Promise<AssetResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await apiClient.post<ApiResponse<AssetResponse>>(
      `/api/v1/projects/${projectId}/assets`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data.data;
  },

  async getAsset(id: number): Promise<AssetResponse> {
    const { data } = await apiClient.get<ApiResponse<AssetResponse>>(`/api/v1/assets/${id}`);
    return data.data;
  },

  async getDownloadUrl(id: number): Promise<string> {
    const { data } = await apiClient.get<ApiResponse<{ url: string }>>(
      `/api/v1/assets/${id}/download-url`
    );
    return data.data.url;
  },
};
