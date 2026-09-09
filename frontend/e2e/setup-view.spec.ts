import { test, expect } from "./support/fixtures";
import { installSSEShim, emitSSE } from "./support/sse";
import { mockLoggedInSession } from "./support/auth";
import { ManittoApiMock } from "./support/manittoApi";

/**
 * PRD 3.1 / docs/manitto-world-spec.md §3.2 — 대기실(SetupView).
 * 방 상태는 항상 SETUP으로 시작한다.
 */

async function gotoSetup(page: import("@playwright/test").Page, mock: ManittoApiMock) {
  await installSSEShim(page);
  await mockLoggedInSession(page, { id: mock.myUserId, name: "민준" });
  await mock.install(page);
  await page.goto(`/manitto?code=${mock.roomCode}`);
  await expect(page.getByText("매칭 대기실")).toBeVisible();
}

test("참가자가 2명 미만이면 매칭 시작 버튼이 비활성화된다", async ({ page }) => {
  const mock = new ManittoApiMock();
  mock.addParticipant({ userId: 1, name: "민준", nickname: "민준" });
  await gotoSetup(page, mock);

  await expect(page.getByRole("button", { name: "매칭 시작하기" })).toBeDisabled();
});

test("호스트가 닉네임을 저장하지 않으면 매칭 시작이 막히고 안내 문구가 보인다", async ({ page }) => {
  const mock = new ManittoApiMock();
  mock.addParticipant({ userId: 1, name: "민준", nickname: null });
  mock.addParticipant({ userId: 2, name: "서연", nickname: "서연" });
  await gotoSetup(page, mock);

  await expect(page.getByRole("button", { name: "매칭 시작하기" })).toBeDisabled();
  await expect(page.getByText("별칭을 먼저 저장해주세요")).toBeVisible();
});

test("닉네임 저장 후 참가자 2명이면 매칭을 시작해 로비로 전환된다", async ({ page }) => {
  const mock = new ManittoApiMock();
  mock.addParticipant({ userId: 1, name: "민준", nickname: null });
  mock.addParticipant({ userId: 2, name: "서연", nickname: "서연" });
  mock.myTargetUserId = 2;
  await gotoSetup(page, mock);

  await page.getByPlaceholder("예: 안경 쓴 사람, 키 큰 민준").fill("안경 쓴 사람");
  await page.getByRole("button", { name: "저장" }).click();

  await expect.poll(() => mock.calls.some((c) => c.path === "/ABC123/nickname")).toBe(true);
  await expect(page.getByRole("button", { name: "매칭 시작하기" })).toBeEnabled();

  await page.getByRole("button", { name: "매칭 시작하기" }).click();

  await expect
    .poll(() => mock.calls.some((c) => c.path === "/ABC123/start" && c.method === "PATCH"))
    .toBe(true);
  // startMatching 성공 후 바로 로비 데이터를 불러오므로 로비 전용 UI가 뜬다.
  await expect(page.getByRole("button", { name: /결과보기/ })).toBeVisible();
});

test("호스트가 아니면 매칭 시작 버튼 대신 대기 문구가 보인다", async ({ page }) => {
  const mock = new ManittoApiMock();
  mock.hostUserId = 2;
  mock.myUserId = 1;
  mock.addParticipant({ userId: 2, name: "서연", nickname: "서연" });
  mock.addParticipant({ userId: 1, name: "민준", nickname: "민준" });
  await gotoSetup(page, mock);

  await expect(page.getByText("방장이 매칭을 시작할 때까지 대기 중...")).toBeVisible();
  await expect(page.getByRole("button", { name: "매칭 시작하기" })).toHaveCount(0);
});

test("초대 버튼을 누르면 방 코드가 클립보드에 복사되고 안내가 뜬다", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const mock = new ManittoApiMock();
  mock.addParticipant({ userId: 1, name: "민준", nickname: "민준" });
  await gotoSetup(page, mock);

  await page.getByRole("button", { name: /초대/ }).click();

  await expect(page.getByText("초대 코드 복사 완료! 📋")).toBeVisible();
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toBe(mock.roomCode);
});

test("다른 참가자가 합류하면(SSE room-updated) 참가자 목록이 실시간으로 갱신된다", async ({ page }) => {
  const mock = new ManittoApiMock();
  mock.addParticipant({ userId: 1, name: "민준", nickname: "민준" });
  await gotoSetup(page, mock);

  await expect(page.getByText("참가자 (1)")).toBeVisible();

  mock.addParticipant({ userId: 2, name: "서연", nickname: "서연" });
  await emitSSE(page, "room-updated", {});

  await expect(page.getByText("참가자 (2)")).toBeVisible();
  await expect(page.getByText("서연")).toBeVisible();
});
