import apiClient from "./apiClient";
import { TokenResponse, ApiResponse } from "./types";

export const authService = {
  async refresh(): Promise<TokenResponse> {
    const { data } = await apiClient.post<ApiResponse<TokenResponse>>("/api/v1/auth/refresh");
    return data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post("/api/v1/auth/logout");
  },
};
