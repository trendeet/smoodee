import apiClient from "./apiClient";
import {
  ProjectResponse,
  PaletteShuffleResponse,
  PaletteSelectRequest,
  ColorworkStateResponse,
  ColorEntry,
  ApiResponse,
} from "./types";
import { randomHexPalettes, hexToColorName } from "@/lib/utils/colors";

// ── Backend raw shapes ────────────────────────────────────────────────────────

interface BackendColorworkState {
  projectId: number;
  gridType: string | null;
  paletteSeed: string | null;
  selectedPaletteJson: string | null; // JSON-serialized string[]
  howtoSeen: boolean;
  frames: { frameIndex: number; assetId: number; assetUrl?: string }[];
}

// ── Helper: parse stored hex JSON back into ColorEntry[] ─────────────────────

function parseStoredColors(json: string | null): ColorEntry[] | undefined {
  if (!json) return undefined;
  try {
    const parsed: unknown = JSON.parse(json);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // New format: [{ hex, name }]
      if (typeof parsed[0] === "object" && parsed[0] !== null && "hex" in parsed[0]) {
        return parsed as ColorEntry[];
      }
      // Old format: ["#hex", ...]
      if (typeof parsed[0] === "string") {
        return (parsed as string[]).map((hex) => ({ hex, name: hexToColorName(hex) }));
      }
    }
  } catch {
    // ignore
  }
  return undefined;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const colorworkService = {
  async createProject(): Promise<ProjectResponse> {
    const { data } = await apiClient.post<ApiResponse<ProjectResponse>>(
      "/api/v1/personal/colorwork/projects"
    );
    return data.data;
  },

  async complete(projectId: number): Promise<void> {
    await apiClient.put(`/api/v1/personal/colorwork/${projectId}/complete`);
  },

  async markHowtoSeen(projectId: number): Promise<void> {
    await apiClient.put(`/api/v1/personal/colorwork/${projectId}/howto-seen`);
  },

  // Palettes are generated client-side — no backend call needed.
  async shufflePalette(_projectId: number): Promise<PaletteShuffleResponse> {
    const picked = randomHexPalettes();
    return {
      seed: picked[0].name,
      palettes: picked.map((p) => ({ seed: p.name, colors: p.colors })),
    };
  },

  async selectPalette(projectId: number, body: PaletteSelectRequest): Promise<void> {
    // Backend PaletteSelectRequest expects List<String> (hex only)
    await apiClient.put(`/api/v1/personal/colorwork/${projectId}/palette/select`, {
      seed: body.seed,
      colors: body.colors.map((c) => c.hex),
    });
  },

  async selectGrid(projectId: number, gridType: "G2" | "G6" | "G3"): Promise<void> {
    await apiClient.put(`/api/v1/personal/colorwork/${projectId}/grid`, { gridType });
  },

  async bindFrame(projectId: number, index: number, assetId: number): Promise<void> {
    await apiClient.put(`/api/v1/personal/colorwork/${projectId}/frames/${index}`, { assetId });
  },

  // Adapts the backend response shape to the frontend's ColorworkStateResponse type.
  async getState(projectId: number): Promise<ColorworkStateResponse> {
    const { data } = await apiClient.get<ApiResponse<BackendColorworkState>>(
      `/api/v1/personal/colorwork/${projectId}`
    );
    const b = data.data;

    // Derive logical step from backend state fields
    let step = "HOWTO";
    if (b.howtoSeen) {
      if (!b.paletteSeed) {
        step = "PALETTE";
      } else if (!b.gridType) {
        step = "GRID";
      } else {
        step = "FRAME";
      }
    }

    const selectedColors = parseStoredColors(b.selectedPaletteJson);

    return {
      projectId: b.projectId,
      step,
      howtoSeen: b.howtoSeen,
      selectedPaletteSeed: b.paletteSeed ?? undefined,
      selectedColors,
      gridType: b.gridType ?? undefined,
      frames: (b.frames ?? []).map((f) => ({
        index: f.frameIndex,
        assetId: f.assetId,
        assetUrl: f.assetUrl,
      })),
    };
  },
};
