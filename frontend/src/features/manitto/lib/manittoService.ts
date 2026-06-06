import apiClient from "@/lib/api/apiClient";
import {
  CreateRoomRequest,
  DropItemRequest,
  ManittoItemResponse,
  ManittoLobbyResponse,
  ManittoNotificationResponse,
  ManittoResultResponse,
  ManittoRoomResponse,
  ManittoVisitResponse,
  RecordVisitRequest,
  SubmitDeductionRequest,
} from "../types";

const BASE = "/api/v1/manitto/rooms";

export const manittoService = {
  setNickname: async (roomCode: string, nickname: string): Promise<void> => {
    await apiClient.patch(`${BASE}/${roomCode}/nickname`, { nickname });
  },

  leaveRoom: async (roomCode: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${roomCode}`);
  },

  getMyRooms: async (): Promise<ManittoRoomResponse[]> => {
    const { data } = await apiClient.get(BASE);
    return data.data;
  },

  createRoom: async (req: CreateRoomRequest): Promise<ManittoRoomResponse> => {
    const { data } = await apiClient.post(BASE, req);
    return data.data;
  },

  getRoom: async (roomCode: string): Promise<ManittoRoomResponse> => {
    const { data } = await apiClient.get(`${BASE}/${roomCode}`);
    return data.data;
  },

  joinRoom: async (roomCode: string): Promise<void> => {
    await apiClient.post(`${BASE}/${roomCode}/join`);
  },

  startMatching: async (roomCode: string): Promise<void> => {
    await apiClient.patch(`${BASE}/${roomCode}/start`);
  },

  getLobby: async (roomCode: string): Promise<ManittoLobbyResponse> => {
    const { data } = await apiClient.get(`${BASE}/${roomCode}/lobby`);
    return data.data;
  },

  dropItem: async (roomCode: string, req: DropItemRequest): Promise<ManittoItemResponse> => {
    const { data } = await apiClient.post(`${BASE}/${roomCode}/items`, req);
    return data.data;
  },

  getLocker: async (roomCode: string): Promise<ManittoItemResponse[]> => {
    const { data } = await apiClient.get(`${BASE}/${roomCode}/locker`);
    return data.data;
  },

  getUserItems: async (roomCode: string, targetUserId: number): Promise<ManittoItemResponse[]> => {
    const { data } = await apiClient.get(`${BASE}/${roomCode}/users/${targetUserId}/items`);
    return data.data;
  },

  storeInLocker: async (roomCode: string, itemId: number): Promise<void> => {
    await apiClient.patch(`${BASE}/${roomCode}/locker/${itemId}/store`);
  },

  openItem: async (roomCode: string, itemId: number): Promise<void> => {
    await apiClient.patch(`${BASE}/${roomCode}/locker/${itemId}/open`);
  },

  submitDeduction: async (roomCode: string, req: SubmitDeductionRequest): Promise<void> => {
    await apiClient.post(`${BASE}/${roomCode}/deduction`, req);
  },

  getResult: async (roomCode: string): Promise<ManittoResultResponse> => {
    const { data } = await apiClient.get(`${BASE}/${roomCode}/result`);
    return data.data;
  },

  enterPresence: async (roomCode: string): Promise<void> => {
    await apiClient.put(`${BASE}/${roomCode}/presence`);
  },

  leavePresence: async (roomCode: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${roomCode}/presence`);
  },

  sendGreet: async (roomCode: string, text: string): Promise<void> => {
    await apiClient.post(`${BASE}/${roomCode}/greet`, { text });
  },

  recordVisit: async (roomCode: string, req: RecordVisitRequest): Promise<void> => {
    await apiClient.post(`${BASE}/${roomCode}/visit`, req);
  },

  getVisits: async (roomCode: string): Promise<ManittoVisitResponse[]> => {
    const { data } = await apiClient.get(`${BASE}/${roomCode}/visits`);
    return data.data;
  },

  getNotifications: async (roomCode: string): Promise<ManittoNotificationResponse[]> => {
    const { data } = await apiClient.get(`${BASE}/${roomCode}/notifications`);
    return data.data;
  },

  move: async (roomCode: string, x: number, y: number): Promise<void> => {
    await apiClient.post(`${BASE}/${roomCode}/move`, { x, y });
  },
};
