import { Page, Route } from "@playwright/test";

// 컬러워크 백엔드를 흉내내는 인메모리 목 서버 (docs/colorwork-spec.md API 명세 기반).
// /api/v1/personal/colorwork/**뿐 아니라 /api/v1/projects/**, /api/v1/assets/**도 함께 처리한다.

export type GridType = "G2" | "G2_GRID" | "G6" | "G6_GRID" | "G3" | "G3_GRID";
export type ProjectStatus = "INIT" | "UPLOADING" | "DONE";

export interface ColorworkFrame {
  frameIndex: number;
  assetId: number;
  assetUrl?: string;
}

export interface ColorworkProject {
  id: number;
  title: string;
  status: ProjectStatus;
  gridType: GridType | null;
  paletteSeed: string | null;
  selectedPaletteJson: string | null;
  howtoSeen: boolean;
  frames: ColorworkFrame[];
  frameColor: string | null;
  frameThickness: string | null;
  cornerStyle: string | null;
  createdAt: string;
}

export interface RecordedCall {
  method: string;
  path: string;
  body: unknown;
}

const SLOT_COUNT: Record<GridType, number> = {
  G2: 4,
  G2_GRID: 4,
  G6: 6,
  G6_GRID: 6,
  G3: 9,
  G3_GRID: 9,
};

// 실제 서버가 익명(userId=null) 요청에서는 소유자 검증을 건너뛰는 것으로 보이는 점을
// docs/colorwork-spec.md §6-1에 이슈로 남겨뒀다. 이 목은 "정상 동작 가정"만 흉내내고
// 그 인가 누락 자체를 재현하지는 않는다 — 모킹으로는 실제 서버 취약점을 검증할 수 없기 때문이다.

export class ColorworkApiMock {
  projects: Record<number, ColorworkProject> = {};
  assets: Record<number, { id: number; url: string }> = {};
  calls: RecordedCall[] = [];

  private nextProjectId = 1;
  private nextAssetId = 1;

  createProject(): ColorworkProject {
    const project: ColorworkProject = {
      id: this.nextProjectId++,
      title: "컬러워크",
      status: "INIT",
      gridType: null,
      paletteSeed: null,
      selectedPaletteJson: null,
      howtoSeen: false,
      frames: [],
      frameColor: null,
      frameThickness: null,
      cornerStyle: null,
      createdAt: new Date().toISOString(),
    };
    this.projects[project.id] = project;
    return project;
  }

  /** 테스트에서 "이미 이만큼 진행된 프로젝트"를 미리 세팅할 때 쓰는 헬퍼. */
  seedProject(overrides: Partial<ColorworkProject> = {}): ColorworkProject {
    const base = this.createProject();
    Object.assign(base, overrides);
    return base;
  }

  async install(page: Page): Promise<void> {
    await page.route("**/api/v1/personal/colorwork/**", (route) => this.handleColorwork(route));
    await page.route("**/api/v1/projects**", (route) => this.handleProjects(route));
    await page.route("**/api/v1/assets/**", (route) => this.handleAssets(route));
  }

  private json(route: Route, data: unknown, status = 200) {
    return route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ data }) });
  }
  private noContent(route: Route) {
    return route.fulfill({ status: 204 });
  }
  private notFound(route: Route, message = "프로젝트를 찾을 수 없습니다.") {
    return route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "PROJECT_NOT_FOUND", message } }),
    });
  }

  private record(route: Route, path: string) {
    const request = route.request();
    let body: unknown;
    const postData = request.postData();
    if (postData) {
      try {
        body = JSON.parse(postData);
      } catch {
        body = postData;
      }
    }
    this.calls.push({ method: request.method(), path, body });
    return body;
  }

  // ── /api/v1/personal/colorwork/** ─────────────────────────────────────────
  private async handleColorwork(route: Route): Promise<void> {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const prefix = "/api/v1/personal/colorwork";
    const rest = url.pathname.slice(prefix.length).replace(/^\/+/, "");
    const segments = rest.length ? rest.split("/") : [];
    const body = this.record(route, `/${rest}`);

    if (segments[0] === "projects" && method === "POST") {
      return this.json(route, this.createProject());
    }

    const projectId = Number(segments[0]);
    const project = this.projects[projectId];
    if (!project) return this.notFound(route);
    const tail = segments.slice(1);

    if (tail.length === 0 && method === "GET") {
      return this.json(route, {
        projectId: project.id,
        gridType: project.gridType,
        paletteSeed: project.paletteSeed,
        selectedPaletteJson: project.selectedPaletteJson,
        howtoSeen: project.howtoSeen,
        frames: project.frames,
        frameColor: project.frameColor,
        frameThickness: project.frameThickness,
        cornerStyle: project.cornerStyle,
      });
    }
    if (tail[0] === "complete" && method === "PUT") {
      project.status = "DONE";
      return this.noContent(route);
    }
    if (tail[0] === "howto-seen" && method === "PUT") {
      project.howtoSeen = true;
      return this.noContent(route);
    }
    if (tail[0] === "palette" && tail[1] === "select" && method === "PUT") {
      const b = body as { seed: string; colors: string[] };
      project.paletteSeed = b.seed;
      project.selectedPaletteJson = JSON.stringify(b.colors);
      return this.noContent(route);
    }
    if (tail[0] === "grid" && method === "PUT") {
      const b = body as { gridType: string };
      project.gridType = b.gridType.toUpperCase() as GridType;
      project.frames = []; // 실제 서버와 동일하게 그리드 변경 시 프레임 전체 삭제
      project.status = "UPLOADING";
      return this.noContent(route);
    }
    if (tail[0] === "frames" && method === "PUT") {
      const index = Number(tail[1]);
      const b = body as { assetId: number };
      const maxIndex = project.gridType ? SLOT_COUNT[project.gridType] - 1 : -1;
      if (!project.gridType) {
        return route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: { code: "GRID_TYPE_NOT_SELECTED", message: "그리드 타입을 먼저 선택해야 합니다." } }),
        });
      }
      if (index < 0 || index > maxIndex) {
        return route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: { code: "INVALID_FRAME_INDEX", message: "유효하지 않은 프레임 인덱스입니다." } }),
        });
      }
      const asset = this.assets[b.assetId];
      const existing = project.frames.find((f) => f.frameIndex === index);
      if (existing) existing.assetId = b.assetId;
      else project.frames.push({ frameIndex: index, assetId: b.assetId, assetUrl: asset?.url });
      return this.noContent(route);
    }
    if (tail[0] === "frame-style" && method === "PUT") {
      const b = body as { frameColor: string; frameThickness: string; cornerStyle: string };
      project.frameColor = b.frameColor;
      project.frameThickness = b.frameThickness;
      project.cornerStyle = b.cornerStyle;
      return this.noContent(route);
    }
    if (tail[0] === "thumbnail" && method === "PUT") {
      return this.noContent(route);
    }
    if (tail[0] === "palette" && tail[1] === "shuffle" && method === "POST") {
      return this.json(route, { seed: "SEED-0", palettes: [] });
    }

    return route.fulfill({ status: 501, body: `unmocked colorwork: ${method} ${url.pathname}` });
  }

  // ── /api/v1/projects** ───────────────────────────────────────────────────
  private async handleProjects(route: Route): Promise<void> {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const rest = url.pathname.replace("/api/v1/projects", "").replace(/^\/+/, "");
    const segments = rest.length ? rest.split("/") : [];
    const body = this.record(route, `/projects/${rest}`);

    if (segments.length === 0 && method === "GET") {
      const list = Object.values(this.projects).map((p) => this.toProjectResponse(p));
      return this.json(route, list);
    }
    const projectId = Number(segments[0]);
    const project = this.projects[projectId];
    if (!project) return this.notFound(route);

    if (segments[1] === "title" && method === "PATCH") {
      project.title = (body as { title: string }).title;
      return this.noContent(route);
    }
    if (segments[1] === "assets" && method === "POST") {
      const asset = { id: this.nextAssetId++, url: "https://example.com/fake-asset.jpg" };
      this.assets[asset.id] = asset;
      return this.json(route, { id: asset.id, url: asset.url });
    }
    if (segments.length === 1 && method === "GET") {
      return this.json(route, this.toProjectResponse(project));
    }
    if (segments.length === 1 && method === "DELETE") {
      delete this.projects[projectId];
      return this.noContent(route);
    }

    return route.fulfill({ status: 501, body: `unmocked project: ${method} ${url.pathname}` });
  }

  // ── /api/v1/assets/** ────────────────────────────────────────────────────
  private async handleAssets(route: Route): Promise<void> {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const rest = url.pathname.replace("/api/v1/assets/", "");
    const [assetIdStr, action] = rest.split("/");
    const assetId = Number(assetIdStr);
    this.record(route, `/assets/${rest}`);

    if (action === "download-url" && method === "GET") {
      return this.json(route, { url: this.assets[assetId]?.url ?? "https://example.com/fake-asset.jpg" });
    }
    if (action === "stream" && method === "GET") {
      // 재개 플로우가 기존 업로드 이미지를 blob으로 복원할 때 fetch하는 엔드포인트 — 진짜 이미지 바이트를 내려준다.
      const RED_PIXEL_PNG = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64"
      );
      return route.fulfill({ status: 200, contentType: "image/png", body: RED_PIXEL_PNG });
    }
    if (method === "GET") {
      return this.json(route, { id: assetId, url: this.assets[assetId]?.url ?? "https://example.com/fake-asset.jpg" });
    }
    return route.fulfill({ status: 501, body: `unmocked asset: ${method} ${url.pathname}` });
  }

  private toProjectResponse(p: ColorworkProject) {
    return {
      id: p.id,
      templateType: "COLORWORK",
      title: p.title,
      status: p.status,
      type: "PERSONAL",
      createdAt: p.createdAt,
      updatedAt: p.createdAt,
      thumbnailUrl: undefined,
      filledFrames: p.frames.length,
      totalFrames: p.gridType ? SLOT_COUNT[p.gridType] : 0,
      gridType: p.gridType ?? undefined,
      frameColor: p.frameColor ?? undefined,
      frameUrls: p.frames.map((f) => f.assetUrl ?? null),
    };
  }
}
