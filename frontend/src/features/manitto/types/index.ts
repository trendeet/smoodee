export type ManittoRoomStatus = "SETUP" | "ACTIVE" | "FINISHED";
export type ManittoItemType = "GIFT" | "MESSAGE" | "HINT";

export interface ManittoParticipantInfo {
  userId: number;
  name: string;
  nickname: string | null;
  avatarColor: string;
  wallColor: string;
  isReady: boolean;
}

export interface ManittoItemResponse {
  id: number;
  type: ManittoItemType;
  skin: number;
  content: string;
  posX: number;
  posY: number;
  isOpened: boolean;
  inLocker: boolean;
  fromName: string;
}

export interface ManittoRoomResponse {
  roomCode: string;
  roomName: string | null;
  hostUserId: number;
  status: ManittoRoomStatus;
  endDate: string;
  participants: ManittoParticipantInfo[];
}

export interface ManittoLobbyResponse {
  roomCode: string;
  endDate: string;
  myTargetName: string;
  myTargetUserId: number;
  participants: ManittoParticipantInfo[];
  myLockerItems: ManittoItemResponse[];
}

export interface ManittoGuessInfo {
  guesserName: string;
  reason: string;
}

export interface ManittoPairResult {
  manittoName: string;
  manittiName: string;
  manittoAvatarColor: string;
  manittiAvatarColor: string;
  itemCount: number;
  visitCount: number;
}

export interface ManittoResultResponse {
  realManittoName: string;
  realManittoAvatarColor: string;
  guessedUserId: number | null;
  guessedUserName: string | null;
  isCorrect: boolean;
  myGuessReason: string | null;
  othersGuesses: ManittoGuessInfo[];
  allPairs: ManittoPairResult[];
}

export interface CreateRoomRequest {
  endDate: string;
  roomName?: string;
}

export interface DropItemRequest {
  targetUserId: number;
  type: ManittoItemType;
  skin: number;
  content: string;
  posX: number;
  posY: number;
}

export interface SubmitDeductionRequest {
  guessedUserId: number;
  reason: string;
}

// Local room object for Room view (includes position on floor)
export interface RoomObject extends ManittoItemResponse {
  // inherits all ManittoItemResponse fields
}

export interface ManittoVisitResponse {
  posX: number;
  posY: number;
  createdAt: string;
}

export interface ManittoNotificationResponse {
  id: number;
  text: string;
  time: string;
}

export interface RecordVisitRequest {
  targetUserId: number;
  posX: number;
  posY: number;
}
