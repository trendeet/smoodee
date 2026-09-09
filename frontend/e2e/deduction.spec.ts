import { test, expect, Page } from "./support/fixtures";
import { setupActiveRoomForMe } from "./support/testData";

// docs/manitto-world-spec.md §3.5 / §6 — DeductionModal.
// F-502: 제출해도 정답 여부는 절대 알려주지 않는다(서버가 204만 응답).

// DeductionModal 카드는 max-w-sm이 유일하다(다른 모달은 모두 max-w-xs, CreateOrJoinScreen과는
// 동시에 렌더링되지 않음) — 배경 로비의 "서연" 텍스트와 겹치지 않도록 이 안에서만 조회한다.
function deductionModal(page: Page) {
  return page.locator("div.max-w-sm");
}

test.beforeEach(async ({ page }) => {
  await setupActiveRoomForMe(page);
  await page.goto("/manitto?code=ABC123");
  await expect(page.getByText(/님의 마니또가 되었어요/)).toBeVisible();
  await page.getByRole("button", { name: "추리하기" }).click();
  await expect(page.getByText("누가 내 마니또일까?")).toBeVisible();
});

test("지목 없이는 다음 단계로 진행할 수 없다", async ({ page }) => {
  const modal = deductionModal(page);
  await expect(modal.getByRole("button", { name: "지목하기" })).toBeDisabled();

  await modal.getByRole("button", { name: "서연", exact: true }).click();

  await expect(modal.getByRole("button", { name: "지목하기" })).toBeEnabled();
});

test("사유 없이는 최종 제출할 수 없다", async ({ page }) => {
  const modal = deductionModal(page);
  await modal.getByRole("button", { name: "서연", exact: true }).click();
  await modal.getByRole("button", { name: "지목하기" }).click();

  await expect(modal.getByText("서연 님을 지목하시겠어요?")).toBeVisible();
  await expect(modal.getByRole("button", { name: "최종 제출하기" })).toBeDisabled();

  await modal.getByPlaceholder("예: 오늘 사물함에 우유 두고 가신 분 맞죠?!").fill("우유를 두고 가서요!");

  await expect(modal.getByRole("button", { name: "최종 제출하기" })).toBeEnabled();
});

test("제출하면 결과 판정 없이 보류 안내만 노출되고, 재입장 시에도 완료 화면이 유지된다", async ({ page }) => {
  const modal = deductionModal(page);
  await modal.getByRole("button", { name: "서연", exact: true }).click();
  await modal.getByRole("button", { name: "지목하기" }).click();
  await modal.getByPlaceholder("예: 오늘 사물함에 우유 두고 가신 분 맞죠?!").fill("우유를 두고 가서요!");
  await modal.getByRole("button", { name: "최종 제출하기" }).click();

  await expect(modal.getByText("제출 완료!")).toBeVisible();
  await expect(modal.getByText("추리한 내용은 마니또 결과날에 함께 공유됩니다.")).toBeVisible();
  // 정답/오답에 대한 어떤 언급도 없어야 한다 — 은닉 정책(F-502).
  await expect(modal.getByText(/정답|오답/)).toHaveCount(0);

  await modal.getByRole("button", { name: "닫기" }).click();
  await page.getByRole("button", { name: "추리하기" }).click();

  await expect(deductionModal(page).getByText("제출 완료!")).toBeVisible();
});
