import apiClient from "./apiClient";
import { TemplateResponse, ApiResponse } from "./types";

export const templateService = {
  async listTemplates(): Promise<TemplateResponse[]> {
    const { data } = await apiClient.get<ApiResponse<TemplateResponse[]>>("/api/v1/templates");
    return data.data;
  },

  async getTemplate(type: string): Promise<TemplateResponse> {
    const { data } = await apiClient.get<ApiResponse<TemplateResponse>>(
      `/api/v1/templates/${type}`
    );
    return data.data;
  },
};
