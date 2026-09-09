import { test, expect, Page } from "./support/fixtures";
import { setupActiveRoomForMe } from "./support/testData";
import { createTestImageFile } from "./support/testImage";
import { clickRoomCard } from "./support/actions";
import { ManittoApiMock } from "./support/manittoApi";

/**
 * docs/manitto-world-spec.md §3.7 — 인증샷 첨부 → 승인/거절 → 피드/좋아요.
 * PRD에는 없던 신규 서브플로우 전체를 다룬다.
 */

async function gotoManittiRoomAndOpenDrop(page: Page, mock: ManittoApiMock) {
  await page.goto(`/manitto?code=${mock.roomCode}`);
  await expect(page.getByText(/님의 마니또가 되었어요/)).toBeVisible();
  await clickRoomCard(page, "서연");
  const floor = page.locator('[style*="80px 40px"]');
  await expect(floor).toBeVisible();
  const box = (await floor.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByText("아이템 남기기")).toBeVisible();
}

async function attachAndCropImage(page: Page) {
  await page.locator('input[type="file"]').setInputFiles(createTestImageFile());
  const confirmCrop = page.locator("button:has(svg.lucide-check)");
  await expect(confirmCrop).toBeEnabled({ timeout: 10_000 });
  await confirmCrop.click();
  await expect(page.getByAltText("인증 미리보기")).toBeVisible();
}

test("인증샷을 첨부하고 '자랑해줘'를 켜면 드롭과 동시에 인증 업로드가 호출된다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  await gotoManittiRoomAndOpenDrop(page, mock);

  await page.getByPlaceholder("여기에 마음을 적어주세요...").fill("몰래 놓고 갑니다");
  await attachAndCropImage(page);
  await page.getByRole("button", { name: /자랑해줘! 🎉/ }).click();
  await expect(page.getByText("✓ 마니띠에게 자랑할게요! 🎉")).toBeVisible();

  await page.getByRole("button", { name: "살짝 놓고 가기" }).click();

  await expect
    .poll(() => mock.calls.some((c) => c.path === "/ABC123/items" && c.method === "POST"))
    .toBe(true);
  await expect
    .poll(() => mock.calls.some((c) => /\/items\/\d+\/certify$/.test(c.path) && c.method === "POST"))
    .toBe(true);
});

test("인증샷을 첨부해도 '자랑해줘'를 켜지 않으면 인증 업로드가 호출되지 않는다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  await gotoManittiRoomAndOpenDrop(page, mock);

  await page.getByPlaceholder("여기에 마음을 적어주세요...").fill("조용히 놓고 갑니다");
  await attachAndCropImage(page);
  // 자랑해줘 토글을 켜지 않는다.
  await page.getByRole("button", { name: "살짝 놓고 가기" }).click();

  await expect
    .poll(() => mock.calls.some((c) => c.path === "/ABC123/items" && c.method === "POST"))
    .toBe(true);
  expect(mock.calls.some((c) => /\/items\/\d+\/certify$/.test(c.path))).toBe(false);
});

test("미승인 인증 요청을 코멘트와 함께 승인하면 대기 목록에서 사라진다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  mock.pendingCerts = [{ postId: 42, imageUrl: "https://example.com/pending.jpg" }];
  await page.goto(`/manitto?code=${mock.roomCode}`);
  await expect(page.getByText(/님의 마니또가 되었어요/)).toBeVisible();

  await page.getByText("📸 마니또가 인증 게시를 요청했어요").click();
  await page.getByPlaceholder("한마디 코멘트를 남겨주세요 (선택)").fill("고마워요 :)");
  await page.getByRole("button", { name: "승인하기 ✓" }).click();

  await expect
    .poll(() => mock.calls.some((c) => c.path === "/ABC123/cert-posts/42/approve" && c.method === "POST"))
    .toBe(true);
  const approveCall = mock.calls.find((c) => c.path === "/ABC123/cert-posts/42/approve");
  expect(approveCall!.body).toMatchObject({ comment: "고마워요 :)" });
  await expect(page.getByText("📸 마니또가 인증 게시를 요청했어요")).toHaveCount(0);
});

test("미승인 인증 요청을 거절하면 대기 목록에서 사라지고 승인 API는 호출되지 않는다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  mock.pendingCerts = [{ postId: 43, imageUrl: "https://example.com/pending2.jpg" }];
  await page.goto(`/manitto?code=${mock.roomCode}`);
  await expect(page.getByText(/님의 마니또가 되었어요/)).toBeVisible();

  await page.getByText("📸 마니또가 인증 게시를 요청했어요").click();
  await page.getByRole("button", { name: "거절" }).click();

  await expect
    .poll(() => mock.calls.some((c) => c.path === "/ABC123/cert-posts/43/reject" && c.method === "POST"))
    .toBe(true);
  expect(mock.calls.some((c) => c.path.includes("/approve"))).toBe(false);
  await expect(page.getByText("📸 마니또가 인증 게시를 요청했어요")).toHaveCount(0);
});

test("피드에서 좋아요를 누르면 카운트가 올라간다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  mock.certPosts = [
    {
      id: 7,
      manittiName: "서연",
      imageUrl: "https://example.com/cert7.jpg",
      comment: "감동이에요",
      createdAt: "10분 전",
      likeCount: 0,
      liked: false,
    },
  ];
  await page.goto(`/manitto?code=${mock.roomCode}`);
  await expect(page.getByText(/님의 마니또가 되었어요/)).toBeVisible();
  await page.getByRole("button", { name: /인증 피드/ }).click();

  const likeButton = page.getByRole("button", { name: "좋아요" });
  await likeButton.click();

  await expect(page.getByRole("button", { name: "1", exact: true })).toBeVisible();
});

test("좋아요 API가 실패하면 낙관적 업데이트가 롤백된다", async ({ page }) => {
  const mock = await setupActiveRoomForMe(page);
  mock.certPosts = [
    {
      id: 8,
      manittiName: "서연",
      imageUrl: "https://example.com/cert8.jpg",
      comment: null,
      createdAt: "1분 전",
      likeCount: 0,
      liked: false,
    },
  ];
  await page.goto(`/manitto?code=${mock.roomCode}`);
  await expect(page.getByText(/님의 마니또가 되었어요/)).toBeVisible();
  await page.getByRole("button", { name: /인증 피드/ }).click();

  // 좋아요 엔드포인트만 실패하도록 별도 라우트로 덮어쓴다 (page.route는 마지막 등록이 우선한다).
  await page.route("**/api/v1/manitto/rooms/**/cert-posts/8/like", (route) =>
    route.fulfill({ status: 500, json: { error: { code: "INTERNAL", message: "boom" } } })
  );

  await page.getByRole("button", { name: "좋아요" }).click();

  await expect(page.getByRole("button", { name: "좋아요" })).toBeVisible();
});
