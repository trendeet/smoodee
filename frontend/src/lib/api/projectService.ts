import apiClient from "./apiClient";
import { ProjectResponse, ApiResponse } from "./types";

export interface ListProjectsParams {
  type?: "PERSONAL" | "GROUP";
  tab?: "IN_PROGRESS" | "RECENT";
}

export const projectService = {
  async listProjects(params?: ListProjectsParams): Promise<ProjectResponse[]> {
    const { data } = await apiClient.get<ApiResponse<ProjectResponse[]>>("/api/v1/projects", {
      params,
    });
    return data.data;
  },

  async getProject(id: number): Promise<ProjectResponse> {
    const { data } = await apiClient.get<ApiResponse<ProjectResponse>>(`/api/v1/projects/${id}`);
    return data.data;
  },

  async updateTitle(id: number, title: string): Promise<ProjectResponse> {
    const { data } = await apiClient.patch<ApiResponse<ProjectResponse>>(
      `/api/v1/projects/${id}/title`,
      { title }
    );
    return data.data;
  },

  async deleteProject(id: number): Promise<void> {
    await apiClient.delete(`/api/v1/projects/${id}`);
  },
};
