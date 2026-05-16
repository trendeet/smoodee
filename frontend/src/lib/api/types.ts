// Generic API wrapper
export interface ApiResponse<T> {
  data: T;
}

// Auth
export interface TokenResponse {
  accessToken: string;
}

// User
export interface UserProfileResponse {
  id: number;
  name: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
}

export interface UpdateProfileRequest {
  name: string;
  bio?: string;
}

// Template
export interface TemplateResponse {
  id: number;
  type: string; // "COLORWORK" | "DAY_SHARE"
  title: string;
  description?: string;
  thumbnailUrl?: string;
  tags: string[];
}

// Project
export interface ProjectResponse {
  id: number;
  templateType: string;
  title: string;
  status: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  groupId?: number;
  memberCount?: number;
  thumbnailUrl?: string;
  filledFrames?: number;
  totalFrames?: number;
  paletteColor?: string;
  ownerId?: number;
  frameUrls?: (string | null)[];
  gridType?: string; // "G2" | "G6" | "G3"
  frameColor?: string;
  latestRenderJobId?: number | null;
}

// Colorwork
export interface ColorEntry {
  hex: string;
  name: string;
}

export interface ColorworkStateResponse {
  projectId: number;
  step: string; // "HOWTO" | "PALETTE" | "GRID" | "FRAME" | "DONE"
  howtoSeen: boolean;
  selectedPaletteSeed?: string;
  selectedColors?: ColorEntry[];
  gridType?: string; // "G2" | "G3"
  frames: (FrameEntry | null)[];
  frameColor?: string;
  frameThickness?: string;
  cornerStyle?: string;
}

export interface FrameEntry {
  index: number;
  assetId: number;
  assetUrl?: string;
}

export interface PaletteShuffleResponse {
  seed: string;
  palettes: ColorPalette[];
}

export interface ColorPalette {
  seed: string;
  colors: ColorEntry[];
}

export interface PaletteSelectRequest {
  seed: string;
  colors: ColorEntry[];
}

export interface GridSelectRequest {
  gridType: string; // "G2" | "G3"
}

export interface FrameBindRequest {
  assetId: number;
}

// Group
export interface CreateGroupRequest {
  name: string;
}

export interface JoinGroupRequest {
  inviteCode: string;
}

export interface GroupResponse {
  id: number;
  name: string;
  inviteCode: string;
  memberCount: number;
  currentMemberCount: number;
  status: string; // "WAITING" | "ACTIVE" | "COMPLETED"
  projectId?: number;
  coverImageUrl?: string;
  latestRenderJobId?: number | null;
}

export interface GroupMemberResponse {
  userId: number;
  name: string;
  avatarUrl?: string;
  role: string; // "OWNER" | "MEMBER"
}

// Slot
export interface SlotResponse {
  id: number;
  groupId?: number;
  orderIndex: number;
  timeLabel: string;
  dueAt?: string;
  status?: string; // "EMPTY" | "FILLED"
  userName?: string;
  assetId?: number;
  assetUrl?: string;
  assetMime?: string;
  caption?: string;
}

export interface CreateSlotRequest {
  timeLabel: string;
}

export interface UpdateSlotRequest {
  timeLabel?: string;
}

export interface GroupProgressResponse {
  slots: { id: number; timeLabel: string; orderIndex: number }[];
  memberUserIds: number[];
  // slotId(string) → userId(string) → "UPLOADED" | "MISSING"
  matrix: Record<string, Record<string, string>>;
}

// Chat
export interface ChatMessageResponse {
  id: number;
  groupId?: number;
  userId: number;
  userName: string;
  body: string;
  createdAt: string;
  isSystem?: boolean;
}

export interface SendMessageRequest {
  body: string;
}

export interface CursorPageResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

// Asset
export interface AssetResponse {
  id: number;
  url?: string;
  projectId: number;
  type: string;
  mime: string;
  sizeBytes: number;
  width?: number;
  height?: number;
}

// Scrap
export interface ScrapResponse {
  templateType: string;
  scrappedAt: string;
}

// Notification
export interface NotificationResponse {
  id: number;
  type: string;
  body: string;
  read: boolean;
  createdAt: string;
  referenceId?: number;
}

// Render
export interface RenderJobResponse {
  id: number;
  projectId: number;
  status: string; // "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED"
  resultUrl?: string;
  createdAt: string;
}
