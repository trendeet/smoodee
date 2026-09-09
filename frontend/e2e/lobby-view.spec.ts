import { test, expect, Page } from "./support/fixtures";
import { setupActiveRoomForMe } from "./support/testData";
import { clickRoomCard } from "./support/actions";
import { ManittoApiMock } from "./support/manittoApi";

/**
 * docs/manitto-world-spec.md §3.3 — LobbyView.
 * 미션은 서버가 아니라 localStorage(`manitto_missions_{roomCode}_{userId}`)에 저장되는
 * 프론트 전용 기능이라는 점(§6)을 별도 테스트로 명시한다.
 */

async function gotoLobby(page: Page, mock: ManittoApiMock) {
  await page.goto(`/manitto?code=${mock.roomCode}`);
  await expect(page.getByText(/님의 마니또가 되었어요/)).toBeVisible();
}

test("카운트다운과 내 마니띠 미션 카드가 노출된다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  await gotoLobby(page, mock);

  await expect(page.getByText("서연 님의 마니또가 되었어요!")).toBeVisible();
  await expect(page.getByText(/\d+시간 \d{2}분 \d{2}초/)).toBeVisible();
  await expect(page.getByRole("button", { name: "서연의 방 가기 →" })).toBeVisible();
});

test("오늘의 미션은 기본 1개만 보이다가 펼치면 3개 모두 보인다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  await gotoLobby(page, mock);

  const missionSection = page.locator("section").filter({ hasText: "오늘의 미션" });
  await expect(missionSection.getByText("0/3")).toBeVisible();
  await expect(missionSection.getByText("마니띠 방 방문하기")).toBeVisible();
  await expect(missionSection.getByText("선물·메시지·힌트 남기기")).toHaveCount(0);

  await missionSection.getByRole("button").click();

  await expect(missionSection.getByText("선물·메시지·힌트 남기기")).toBeVisible();
  await expect(missionSection.getByText("인사 보내기")).toBeVisible();
});

test("미션 완료 상태는 localStorage에 저장되어 새로고침 후에도 유지된다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  // manittoService/서버가 아니라 프론트 로컬 상태이므로, 이전 방문에서 완료된 것처럼 미리 심어둔다.
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: `manitto_missions_${mock.roomCode}_${mock.myUserId}`, value: JSON.stringify(["visit"]) }
  );

  await gotoLobby(page, mock);

  const missionSection = page.locator("section").filter({ hasText: "오늘의 미션" });
  await expect(missionSection.getByText("1/3")).toBeVisible();
});

test("결과보기 버튼을 누르면 결과 화면으로 전환된다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  mock.result = {
    realManittoName: "서연",
    realManittoAvatarColor: "#E9967A",
    guessedUserId: null,
    guessedUserName: null,
    isCorrect: false,
    myGuessReason: null,
    othersGuesses: [],
    allPairs: [],
  };
  await gotoLobby(page, mock);

  await page.getByRole("button", { name: /결과보기/ }).click();

  await expect(page.getByText("마니또 결과 발표일")).toBeVisible();
});

test("승인된 인증 개수가 인증 피드 버튼에 배지로 표시된다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  mock.certPosts = [
    {
      id: 1,
      manittiName: "서연",
      imageUrl: "https://example.com/cert1.jpg",
      comment: "고마워요!",
      createdAt: "5분 전",
      likeCount: 2,
      liked: false,
    },
  ];
  await gotoLobby(page, mock);

  const feedButton = page.getByRole("button", { name: /인증 피드/ });
  await expect(feedButton.getByText("1개의 인증이 올라왔어요")).toBeVisible();
  await expect(feedButton.getByText("1", { exact: true })).toBeVisible();
});

test("미승인 인증 요청은 알림 상단에 노출되고 탭하면 승인 모달이 뜬다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  mock.pendingCerts = [{ postId: 42, imageUrl: "https://example.com/pending.jpg" }];
  await gotoLobby(page, mock);

  await expect(page.getByText("📸 마니또가 인증 게시를 요청했어요")).toBeVisible();
  await page.getByText("📸 마니또가 인증 게시를 요청했어요").click();

  await expect(page.getByText("🎁 마니또 인증 요청")).toBeVisible();
  await expect(page.getByRole("button", { name: "승인하기 ✓" })).toBeVisible();
});

test("활성화된 방 카드를 탭하면 해당 참가자의 방으로 이동한다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  await gotoLobby(page, mock);

  await clickRoomCard(page, "서연");

  // 서연은 나의 마니띠이므로 접근 가능 → 선물을 남길 수 있다는 안내가 뜬다.
  await expect(page.getByText("바닥을 탭해 선물을 남기세요 ✨")).toBeVisible();
});
