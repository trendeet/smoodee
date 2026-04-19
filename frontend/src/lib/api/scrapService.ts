import apiClient from "./apiClient";
import { ScrapResponse, ApiResponse } from "./types";

export const scrapService = {
  async listScraps(): Promise<ScrapResponse[]> {
    const { data } = await apiClient.get<ApiResponse<ScrapResponse[]>>("/api/v1/me/scraps");
    return data.data;
  },

  async addScrap(templateType: string): Promise<void> {
    await apiClient.post(`/api/v1/templates/${templateType}/scrap`);
  },

  async removeScrap(templateType: string): Promise<void> {
    await apiClient.delete(`/api/v1/templates/${templateType}/scrap`);
  },
};
