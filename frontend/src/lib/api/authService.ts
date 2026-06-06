import axios from "axios";
import apiClient from "./apiClient";
import { TokenResponse, ApiResponse } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

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

  // OAuth 콜백에서 일회용 코드를 Access Token + Refresh 쿠키로 교환
  async exchange(code: string): Promise<TokenResponse> {
    const { data } = await axios.post<ApiResponse<TokenResponse>>(
      `${BASE_URL}/api/v1/auth/exchange?code=${encodeURIComponent(code)}`,
      {},
      { withCredentials: true }
    );
    return data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post("/api/v1/auth/logout");
  },
};
