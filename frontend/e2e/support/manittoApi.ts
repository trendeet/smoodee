import { Page, Route } from "@playwright/test";

// 마니또 월드 백엔드(/api/v1/manitto/rooms/**)를 흉내내는 인메모리 목 서버.
// docs/manitto-world-spec.md의 API 명세를 그대로 구현한다. calls 배열에 호출 인자를 기록해
// 테스트에서 어떤 API가 어떤 값으로 불렸는지 검증할 수 있다.

export type RoomStatus = "SETUP" | "ACTIVE" | "FINISHED";
export type ItemType = "GIFT" | "MESSAGE" | "HINT";

export interface Participant {
  userId: number;
  name: string;
  nickname: string | null;
  avatarColor: string;
  wallColor: string;
  isReady: boolean;
}

export interface Item {
  id: number;
  type: ItemType;
  skin: number;
  content: string;
  posX: number;
  posY: number;
  isOpened: boolean;
  inLocker: boolean;
  fromName: string;
  imageUrl?: string;
  ownerUserId: number;
}

export interface CertPost {
  id: number;
  manittiName: string;
  imageUrl: string;
  comment: string | null;
  createdAt: string;
  likeCount: number;
  liked: boolean;
}

export interface ResultPayload {
  realManittoName: string | null;
  realManittoAvatarColor: string | null;
  guessedUserId: number | null;
  guessedUserName: string | null;
  isCorrect: boolean;
  myGuessReason: string | null;
  othersGuesses: { guesserName: string; reason: string }[];
  allPairs: {
    manittoName: string;
    manittiName: string;
    manittoAvatarColor: string;
    manittiAvatarColor: string;
    itemCount: number;
    visitCount: number;
  }[];
}

export interface RecordedCall {
  method: string;
  path: string;
  body: unknown;
}

const AVATAR_COLORS = ["#E9967A", "#FFDAB9", "#DA70D6", "#66CDAA", "#F08080"];
const WALL_COLORS = ["#F5E6D3", "#E0F2F1", "#F3E5F5", "#E8F5E9", "#FFF3E0"];

export class ManittoApiMock {
  roomCode = "ABC123";
  status: RoomStatus = "SETUP";
  hostUserId = 1;
  /** 이 목이 응답을 내려주는 "나"(로그인 사용자)의 id. mockLoggedInSession()에 넘긴 id와 일치시켜야 한다. */
  myUserId = 1;
  roomName: string | null = null;
  endDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  participants: Participant[] = [];
  myTargetUserId: number | null = null;
  itemsByOwner: Record<number, Item[]> = {};
  visits: { posX: number; posY: number; createdAt: string }[] = [];
  notifications: { id: number; text: string; time: string }[] = [];
  certPosts: CertPost[] = [];
  pendingCerts: { postId: number; imageUrl: string }[] = [];
  result: ResultPayload | null = null;
  deductionSubmittedBy = new Set<number>();

  private nextItemId = 1;
  calls: RecordedCall[] = [];

  targetOf(): number | null {
    return this.myTargetUserId;
  }

  addParticipant(p: Partial<Participant> & { userId: number; name: string }): Participant {
    const i = this.participants.length;
    const participant: Participant = {
      nickname: null,
      avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
      wallColor: WALL_COLORS[i % WALL_COLORS.length],
      isReady: true,
      ...p,
    };
    this.participants.push(participant);
    return participant;
  }

  private room() {
    return {
      roomCode: this.roomCode,
      roomName: this.roomName,
      hostUserId: this.hostUserId,
      status: this.status,
      endDate: this.endDate,
      participants: this.participants,
    };
  }

  private lobby(userId: number) {
    const targetName =
      this.myTargetUserId != null
        ? this.participants.find((p) => p.userId === this.myTargetUserId)?.nickname ??
          this.participants.find((p) => p.userId === this.myTargetUserId)?.name ??
          null
        : null;
    return {
      roomCode: this.roomCode,
      endDate: this.endDate,
      myTargetName: targetName,
      myTargetUserId: this.myTargetUserId,
      participants: this.participants,
      myLockerItems: this.itemsByOwner[userId] ?? [],
    };
  }

  private dropItem(fromUserId: number, body: Record<string, unknown>): Item {
    const item: Item = {
      id: this.nextItemId++,
      type: body.type as ItemType,
      skin: Number(body.skin ?? 0),
      content: String(body.content ?? ""),
      posX: Number(body.posX ?? 0),
      posY: Number(body.posY ?? 0),
      isOpened: false,
      inLocker: false,
      fromName: "익명의 마니또",
      ownerUserId: Number(body.targetUserId),
    };
    const owner = item.ownerUserId;
    this.itemsByOwner[owner] = [...(this.itemsByOwner[owner] ?? []), item];
    return item;
  }

  private findItem(itemId: number): Item | undefined {
    for (const list of Object.values(this.itemsByOwner)) {
      const found = list.find((i) => i.id === itemId);
      if (found) return found;
    }
    return undefined;
  }

  async install(page: Page): Promise<void> {
    // "rooms**"로 끝나야 "/rooms"(목록/생성)와 "/rooms/{code}/..." 양쪽을 한 핸들러로 잡는다.
    await page.route("**/api/v1/manitto/rooms**", (route) => this.handle(route));
  }

  private async handle(route: Route): Promise<void> {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const prefix = "/api/v1/manitto/rooms";
    let rest = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : url.pathname;
    rest = rest.replace(/^\/+/, ""); // leading slash 제거
    const segments = rest.length ? rest.split("/") : [];

    let body: unknown = undefined;
    const postData = request.postData();
    if (postData) {
      try {
        body = JSON.parse(postData);
      } catch {
        body = postData; // multipart 등
      }
    }
    this.calls.push({ method, path: `/${rest}`, body });

    const json = (data: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ data }) });
    const noContent = () => route.fulfill({ status: 204 });

    // ── /rooms, /rooms (list/create) ──────────────────────────────
    if (segments.length === 0) {
      if (method === "GET") return json([this.room()]);
      if (method === "POST") {
        this.roomName = (body as { roomName?: string })?.roomName ?? null;
        this.endDate = (body as { endDate?: string })?.endDate ?? this.endDate;
        return json(this.room());
      }
    }

    const [roomCode, ...tail] = segments;
    if (roomCode !== this.roomCode) {
      return route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "RESOURCE_NOT_FOUND", message: "room not found" } }),
      });
    }

    // ── /rooms/{code} ──────────────────────────────
    if (tail.length === 0) {
      if (method === "GET") return json(this.room());
      if (method === "DELETE") return noContent();
    }

    if (tail[0] === "nickname" && method === "PATCH") {
      // 실제 서비스에서는 principal(JWT)로 유저를 식별한다. 목에서는 myUserId를 "나"로 간주해 갱신한다.
      const nickname = (body as { nickname?: string })?.nickname ?? null;
      const me = this.participants.find((p) => p.userId === this.myUserId);
      if (me) me.nickname = nickname;
      return noContent();
    }
    if (tail[0] === "join" && method === "POST") return noContent();
    if (tail[0] === "start" && method === "PATCH") {
      this.status = "ACTIVE";
      return noContent();
    }
    if (tail[0] === "lobby" && method === "GET") return json(this.lobby(this.myUserId));
    if (tail[0] === "items" && tail.length === 1 && method === "POST") {
      const item = this.dropItem(this.myUserId, body as Record<string, unknown>);
      return json(item);
    }
    if (tail[0] === "items" && tail[2] === "certify" && method === "POST") return noContent();
    if (tail[0] === "locker" && tail.length === 1 && method === "GET") {
      return json(this.itemsByOwner[this.myUserId] ?? []);
    }
    if (tail[0] === "locker" && tail[2] === "store" && method === "PATCH") {
      const item = this.findItem(Number(tail[1]));
      if (item) {
        item.inLocker = true;
        item.isOpened = true;
      }
      return noContent();
    }
    if (tail[0] === "locker" && tail[2] === "open" && method === "PATCH") {
      const item = this.findItem(Number(tail[1]));
      if (item) item.isOpened = true;
      return noContent();
    }
    if (tail[0] === "users" && tail[2] === "items" && method === "GET") {
      return json(this.itemsByOwner[Number(tail[1])] ?? []);
    }
    if (tail[0] === "deduction" && method === "POST") {
      if (this.deductionSubmittedBy.has(this.myUserId)) {
        return route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: { code: "INVALID_INPUT", message: "already submitted" } }),
        });
      }
      this.deductionSubmittedBy.add(this.myUserId);
      return noContent();
    }
    if (tail[0] === "result" && method === "GET") {
      return json(
        this.result ?? {
          realManittoName: null,
          realManittoAvatarColor: null,
          guessedUserId: null,
          guessedUserName: null,
          isCorrect: false,
          myGuessReason: null,
          othersGuesses: [],
          allPairs: [],
        }
      );
    }
    if (tail[0] === "presence" && (method === "PUT" || method === "DELETE")) return noContent();
    if (tail[0] === "greet" && method === "POST") return noContent();
    if (tail[0] === "visit" && method === "POST") return noContent();
    if (tail[0] === "visits" && method === "GET") return json(this.visits);
    if (tail[0] === "move" && method === "POST") return noContent();
    if (tail[0] === "notifications" && method === "GET") return json(this.notifications);
    if (tail[0] === "cert-posts" && tail[1] === "pending" && method === "GET") {
      return json(this.pendingCerts);
    }
    if (tail[0] === "cert-posts" && tail.length === 1 && method === "GET") return json(this.certPosts);
    if (tail[0] === "cert-posts" && tail[2] === "approve" && method === "POST") {
      this.pendingCerts = this.pendingCerts.filter((c) => c.postId !== Number(tail[1]));
      return noContent();
    }
    if (tail[0] === "cert-posts" && tail[2] === "reject" && method === "POST") {
      this.pendingCerts = this.pendingCerts.filter((c) => c.postId !== Number(tail[1]));
      return noContent();
    }
    if (tail[0] === "cert-posts" && tail[2] === "like" && method === "POST") {
      const post = this.certPosts.find((p) => p.id === Number(tail[1]));
      if (post) {
        post.liked = !post.liked;
        post.likeCount += post.liked ? 1 : -1;
        return json({ likeCount: post.likeCount, liked: post.liked });
      }
      return json({ likeCount: 0, liked: true });
    }

    return route.fulfill({ status: 501, body: `unmocked: ${method} ${url.pathname}` });
  }
}
