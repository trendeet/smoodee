import apiClient from "./apiClient";
import {
  GroupResponse,
  GroupMemberResponse,
  CreateGroupRequest,
  JoinGroupRequest,
  ApiResponse,
} from "./types";

export const groupService = {
  async createGroup(body: CreateGroupRequest): Promise<GroupResponse> {
    const { data } = await apiClient.post<ApiResponse<GroupResponse>>("/api/v1/groups", body);
    return data.data;
  },

  async joinGroup(body: JoinGroupRequest): Promise<GroupResponse> {
    const { data } = await apiClient.post<ApiResponse<GroupResponse>>("/api/v1/groups/join", body);
    return data.data;
  },

  async getGroup(groupId: number): Promise<GroupResponse> {
    const { data } = await apiClient.get<ApiResponse<GroupResponse>>(`/api/v1/groups/${groupId}`);
    return data.data;
  },

  async getGroupByInviteCode(inviteCode: string): Promise<GroupResponse> {
    const { data } = await apiClient.get<ApiResponse<GroupResponse>>(
      `/api/v1/groups/invite/${inviteCode}`
    );
    return data.data;
  },

  async getMembers(groupId: number): Promise<GroupMemberResponse[]> {
    const { data } = await apiClient.get<ApiResponse<GroupMemberResponse[]>>(
      `/api/v1/groups/${groupId}/members`
    );
    return data.data;
  },

  async startGroup(groupId: number): Promise<void> {
    await apiClient.post(`/api/v1/groups/${groupId}/start`);
  },

  async leaveGroup(groupId: number): Promise<void> {
    await apiClient.delete(`/api/v1/groups/${groupId}/members/me`);
  },

  async getPreview(groupId: number): Promise<unknown> {
    const { data } = await apiClient.get(`/api/v1/groups/${groupId}/preview`);
    return data;
  },

  async uploadCoverImage(groupId: number, file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const { data } = await apiClient.post<ApiResponse<string>>(
      `/api/v1/groups/${groupId}/cover`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data.data;
  },
};
