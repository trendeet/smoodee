import apiClient from "./apiClient";
import { UserProfileResponse, UpdateProfileRequest, ApiResponse } from "./types";

export const userService = {
  async getProfile(): Promise<UserProfileResponse> {
    const { data } = await apiClient.get<ApiResponse<UserProfileResponse>>("/api/v1/me");
    return data.data;
  },

  async updateProfile(body: UpdateProfileRequest): Promise<UserProfileResponse> {
    const { data } = await apiClient.put<ApiResponse<UserProfileResponse>>("/api/v1/me", body);
    return data.data;
  },

  async uploadAvatar(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await apiClient.post<ApiResponse<string>>("/api/v1/me/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data;
  },

  async deleteAccount(): Promise<void> {
    await apiClient.delete("/api/v1/me");
  },
};
