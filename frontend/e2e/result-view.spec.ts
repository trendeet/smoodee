import { test, expect } from "./support/fixtures";
import { setupActiveRoomForMe } from "./support/testData";

/**
 * docs/manitto-world-spec.md §3.6 — ResultView의 3분기(미참여/성공/실패)와
 * 전체 결과 페어 공개 페이지(/manitto/result, PRD에 없던 신규 기능).
 */

async function gotoResult(page: import("@playwright/test").Page) {
  await page.goto("/manitto?code=ABC123");
  await expect(page.getByText(/님의 마니또가 되었어요/)).toBeVisible();
  await page.getByRole("button", { name: /결과보기/ }).click();
  await expect(page.getByText("마니또 결과 발표일")).toBeVisible();
}

test("추리 미참여 상태에서는 미참여 배지와 격려 문구가 보인다", async ({ page }) => {
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
  await gotoResult(page);

  await expect(page.getByText("미참여 🤫")).toBeVisible();
  await expect(page.getByText("이번 게임에는 추리에 참여하지 않았습니다.")).toBeVisible();
});

test("추리 성공 상태에서는 성공 배지와 내가 작성한 사유가 보인다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  mock.result = {
    realManittoName: "서연",
    realManittoAvatarColor: "#E9967A",
    guessedUserId: 2,
    guessedUserName: "서연",
    isCorrect: true,
    myGuessReason: "사물함에 편지를 자주 남겨줘서요",
    othersGuesses: [],
    allPairs: [],
  };
  await gotoResult(page);

  await expect(page.getByText("추리 성공! 🎯")).toBeVisible();
  await expect(page.getByText("정답! '서연' 님이 진짜 마니또가 맞습니다.")).toBeVisible();
  await expect(page.getByText("사물함에 편지를 자주 남겨줘서요")).toBeVisible();
});

test("추리 실패 상태에서는 실패 배지와 오해했던 대상·진짜 정답이 보인다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  mock.addParticipant({ userId: 3, name: "지훈", nickname: "지훈" });
  mock.result = {
    realManittoName: "서연",
    realManittoAvatarColor: "#E9967A",
    guessedUserId: 3,
    guessedUserName: "지훈",
    isCorrect: false,
    myGuessReason: "발자국이 지훈 방 쪽에서 났어요",
    othersGuesses: [],
    allPairs: [],
  };
  await gotoResult(page);

  await expect(page.getByText("추리 실패")).toBeVisible();
  await expect(page.getByText("아쉽게도 오답! 진짜는 '서연' 님이었습니다.")).toBeVisible();
  await expect(page.getByText("'지훈'", { exact: false })).toBeVisible();
});

test("나를 오해했던 사람들의 사유가 롤링페이퍼로 노출된다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  mock.result = {
    realManittoName: "서연",
    realManittoAvatarColor: "#E9967A",
    guessedUserId: null,
    guessedUserName: null,
    isCorrect: false,
    myGuessReason: null,
    othersGuesses: [{ guesserName: "서연", reason: "매일 아침 인사를 남겨서 딱 걸렸어요!" }],
    allPairs: [],
  };
  await gotoResult(page);

  await expect(page.getByText("GUESS BY 서연")).toBeVisible();
  await expect(page.getByText("매일 아침 인사를 남겨서 딱 걸렸어요!")).toBeVisible();
});

test("전체 결과 보러가기를 누르면 모든 마니또-마니띠 쌍이 공개된다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  mock.result = {
    realManittoName: "서연",
    realManittoAvatarColor: "#E9967A",
    guessedUserId: null,
    guessedUserName: null,
    isCorrect: false,
    myGuessReason: null,
    othersGuesses: [],
    allPairs: [
      {
        manittoName: "민준",
        manittiName: "서연",
        manittoAvatarColor: "#E9967A",
        manittiAvatarColor: "#FFDAB9",
        itemCount: 3,
        visitCount: 2,
      },
    ],
  };
  await gotoResult(page);

  await page.getByRole("button", { name: /전체 결과 보러 가기/ }).click();

  await expect(page).toHaveURL(/\/manitto\/result\?code=ABC123/);
  await expect(page.getByText("PAIR #1")).toBeVisible();
  await expect(page.getByText("마니또", { exact: true })).toBeVisible();
  await expect(page.getByText("마니띠", { exact: true })).toBeVisible();
});
