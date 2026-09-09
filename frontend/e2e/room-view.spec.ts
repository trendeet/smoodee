import { test, expect, Page } from "./support/fixtures";
import { setupActiveRoomForMe } from "./support/testData";
import { emitSSE } from "./support/sse";
import { clickRoomCard } from "./support/actions";
import { ManittoApiMock, Item } from "./support/manittoApi";

// docs/manitto-world-spec.md §3.4 — RoomView. 반드시 로비를 거쳐 입장해야 한다 —
// ManittoWorld.goToRoom()이 아이템 목록/발자국/presence를 트리거하므로 ?room= 직접 진입은 다르게 동작한다.

const ROOM_BACK_BUTTON = ".absolute.top-4.left-4";
const FLOOR_ITEM = '[class*="hover:scale-110"]';
const FLOOR = '[style*="80px 40px"]';
const GREET_TRIGGER = "button:has(svg.lucide-message-circle)";

function seedItem(overrides: Partial<Item> & { id: number; ownerUserId: number }): Item {
  return {
    type: "GIFT",
    skin: 0,
    content: "메시지",
    posX: 150,
    posY: 400,
    isOpened: false,
    inLocker: false,
    fromName: "익명의 마니또",
    ...overrides,
  };
}

/** 로비에 진입한 뒤 "활성화된 방" 그리드에서 이름으로 방을 찾아 들어간다 (실제 goToRoom 경로). */
async function gotoRoom(page: Page, mock: ManittoApiMock, participantName: string) {
  await page.goto(`/manitto?code=${mock.roomCode}`);
  await expect(page.getByText(/님의 마니또가 되었어요/)).toBeVisible();
  await clickRoomCard(page, participantName);
  await expect(page.locator(FLOOR)).toBeVisible();
}

async function clickFloor(page: Page) {
  const floor = page.locator(FLOOR);
  const box = await floor.boundingBox();
  if (!box) throw new Error("floor not found");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test("마니띠 방 바닥을 클릭하면 아이템 드롭 모달이 뜬다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  await gotoRoom(page, mock, "서연");

  await clickFloor(page);

  await expect(page.getByText("아이템 남기기")).toBeVisible();
});

test("선물 스킨을 골라 드롭하면 모달이 닫히고 아이템 드롭 API가 호출된다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  await gotoRoom(page, mock, "서연");
  await clickFloor(page);

  await page.getByPlaceholder("여기에 마음을 적어주세요...").fill("항상 응원해!");
  // "디자인 선택" 바로 다음 형제 div가 스킨 3종 버튼 row다. 두 번째(index 1) 스킨을 선택한다.
  const skinRow = page.locator('p:has-text("디자인 선택")').locator("xpath=following-sibling::div[1]");
  await skinRow.locator("button").nth(1).click();
  await page.getByRole("button", { name: "살짝 놓고 가기" }).click();

  await expect(page.getByText("아이템 남기기")).toHaveCount(0);
  await expect
    .poll(() => mock.calls.some((c) => c.path === "/ABC123/items" && c.method === "POST"))
    .toBe(true);
  const dropCall = mock.calls.find((c) => c.path === "/ABC123/items" && c.method === "POST")!;
  expect(dropCall.body).toMatchObject({ targetUserId: 2, type: "GIFT", skin: 1, content: "항상 응원해!" });
});

test("마니또도 마니띠도 아닌 남의 방에서는 바닥을 클릭해도 드롭 모달이 뜨지 않는다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  mock.addParticipant({ userId: 3, name: "지훈", nickname: "지훈" });
  await gotoRoom(page, mock, "지훈");

  await expect(page.getByText("바닥을 탭해 이동해보세요!")).toBeVisible();
  await clickFloor(page);
  await expect(page.getByText("아이템 남기기")).toHaveCount(0);
});

test("접근 권한이 없는 방의 바닥 아이템을 클릭하면 접근 제한 모달이 뜬다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  mock.addParticipant({ userId: 3, name: "지훈", nickname: "지훈" });
  mock.itemsByOwner[3] = [seedItem({ id: 101, ownerUserId: 3 })];
  await gotoRoom(page, mock, "지훈");

  await page.locator(FLOOR_ITEM).first().click();

  await expect(page.getByText("접근 제한")).toBeVisible();
  await expect(page.getByText("마니또 · 마니띠만")).toBeVisible();
});

test("마니띠 방에서 마니또인 내가 이미 놓인 아이템을 클릭하면 '선물 전달 완료' 안내가 뜬다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  mock.itemsByOwner[2] = [seedItem({ id: 102, ownerUserId: 2 })];
  await gotoRoom(page, mock, "서연");

  await page.locator(FLOOR_ITEM).first().click();

  await expect(page.getByText("선물 전달 완료")).toBeVisible();
  await expect(page.getByText("이 선물은 마니띠의 것이에요")).toBeVisible();
});

test("내 방의 미열람 아이템을 열람하면 상세 모달이 뜨고 사물함에 담을 수 있다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  mock.itemsByOwner[1] = [seedItem({ id: 103, ownerUserId: 1, content: "생일 축하해!" })];
  await gotoRoom(page, mock, "민준");

  await page.locator(FLOOR_ITEM).first().click();

  await expect(page.getByText("From Your Manitto")).toBeVisible();
  await expect(page.getByText("생일 축하해!")).toBeVisible();

  await page.getByRole("button", { name: /사물함에 담기/ }).click();

  await expect
    .poll(() => mock.calls.some((c) => c.path === "/ABC123/locker/103/store" && c.method === "PATCH"))
    .toBe(true);
});

test("내 방에 들어갈 때만 24시간 이내 발자국(방문 기록)을 조회한다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  mock.visits = [{ posX: 200, posY: 420, createdAt: new Date().toISOString() }];

  await gotoRoom(page, mock, "민준"); // 내 방
  await expect
    .poll(() => mock.calls.some((c) => c.path === "/ABC123/visits" && c.method === "GET"))
    .toBe(true);

  mock.calls = [];
  await gotoRoom(page, mock, "서연"); // 새로 진입 — 남의 방
  await page.waitForTimeout(300);
  expect(mock.calls.some((c) => c.path === "/ABC123/visits")).toBe(false);
});

test("남의 방을 나갈 때 방문 좌표가 서버에 기록된다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  await gotoRoom(page, mock, "서연");

  await page.locator(ROOM_BACK_BUTTON).getByRole("button").click();

  await expect
    .poll(() => mock.calls.some((c) => c.path === "/ABC123/visit" && c.method === "POST"))
    .toBe(true);
  const visitCall = mock.calls.find((c) => c.path === "/ABC123/visit");
  expect(visitCall!.body).toMatchObject({ targetUserId: 2 });
});

test("인사 프리셋을 선택하면 말풍선이 뜨고 서버로 전송된다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  await gotoRoom(page, mock, "서연"); // 마니띠 방 (isMine=false → 인사 아이콘 노출)

  await page.locator(GREET_TRIGGER).click();
  await page.getByRole("button", { name: "안녕하세요! 👋" }).click();

  await expect(page.getByText("안녕하세요! 👋").last()).toBeVisible();
  await expect
    .poll(() => mock.calls.some((c) => c.path === "/ABC123/greet" && c.method === "POST"))
    .toBe(true);
  const greetCall = mock.calls.find((c) => c.path === "/ABC123/greet");
  expect(greetCall!.body).toMatchObject({ text: "안녕하세요! 👋" });
});

test("다른 유저가 보낸 SSE 인사(greet-received)가 내 방에 2.5초간 노출된다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  await gotoRoom(page, mock, "민준"); // 내 방

  await emitSSE(page, "user-entered", { userId: 2 });
  await emitSSE(page, "greet-received", { fromUserId: 2, text: "좋은 하루~! ✨" });

  const bubble = page.getByText("좋은 하루~! ✨");
  await expect(bubble).toBeVisible();
  await expect(bubble).toBeHidden({ timeout: 3500 });
});

test("SSE user-entered/user-left로 방문자 실루엣이 토글된다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  await gotoRoom(page, mock, "민준"); // 내 방

  await expect(page.getByText("???")).toHaveCount(0);

  await emitSSE(page, "user-entered", { userId: 2 });
  await expect(page.getByText("???")).toBeVisible();

  await emitSSE(page, "user-left", { userId: 2 });
  await expect(page.getByText("???")).toHaveCount(0);
});
