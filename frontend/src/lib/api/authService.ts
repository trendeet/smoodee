import axios from "axios";
import apiClient from "./apiClient";
import { TokenResponse, ApiResponse } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export const authService = {
  // 인터셉터를 거치지 않도록 axios 직접 사용 (비로그인 시 401 → 강제 redirect 방지)
  async refresh(): Promise<TokenResponse> {
    const { data } = await axios.post<ApiResponse<TokenResponse>>(
      `${BASE_URL}/api/v1/auth/refresh`,
      {},
      { withCredentials: true }
    );
    return data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post("/api/v1/auth/logout");
  },
};
