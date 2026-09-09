import { test, expect, Page } from "./support/fixtures";
import { setupColorwork, selectFirstPalette, fillOneSlotWithCrop } from "./support/colorworkTestData";
import { createTestImageFile } from "./support/testImage";

// docs/colorwork-spec.md §3.2~§3.4 — 신규 시작 플로우: 팔레트 → 레이아웃 → 업로드+디자인 → 완성하기.
// 레이아웃은 항상 "와이드 콜라주"(G2, 4슬롯) 사용 — "격자" 라벨은 3곳에서 겹쳐서 단독으로 특정 불가.

async function skipToPalette(page: Page) {
  await page.goto("/colorwork");
  await page.getByRole("button", { name: "건너뛰기" }).click();
  await expect(page.getByText("가장 끌리는 팔레트를 선택해주세요.")).toBeVisible();
}

async function gotoUploadStep(page: Page) {
  await skipToPalette(page);
  await selectFirstPalette(page);
  await page.getByRole("button", { name: "선택 완료" }).click();
  await page.getByRole("button", { name: "와이드 콜라주" }).click();
  await page.getByRole("button", { name: "시작하기" }).click();
  await expect(page.getByText("각 프레임을 눌러 사진을 채워주세요!")).toBeVisible();
}

test("팔레트를 선택해야 다음 단계로 진행할 수 있다", async ({ page }) => {
  await setupColorwork(page);
  await skipToPalette(page);

  await expect(page.getByRole("button", { name: "색상을 선택해주세요" })).toBeDisabled();

  await selectFirstPalette(page);

  await expect(page.getByRole("button", { name: "선택 완료" })).toBeEnabled();
});

test("새로고침을 누르면 팔레트 선택이 초기화된다", async ({ page }) => {
  await setupColorwork(page);
  await skipToPalette(page);
  await selectFirstPalette(page);
  await expect(page.getByRole("button", { name: "선택 완료" })).toBeEnabled();

  await page.getByRole("button", { name: "새로고침" }).click();

  await expect(page.getByRole("button", { name: "색상을 선택해주세요" })).toBeDisabled();
});

test("레이아웃은 4장/6장/9장 × 매거진형/격자형 6종이 모두 노출된다", async ({ page }) => {
  await setupColorwork(page);
  await skipToPalette(page);
  await selectFirstPalette(page);
  await page.getByRole("button", { name: "선택 완료" }).click();

  await expect(page.getByText("4장", { exact: true })).toBeVisible();
  await expect(page.getByText("6장", { exact: true })).toBeVisible();
  await expect(page.getByText("9장", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "와이드 콜라주" })).toBeVisible();
  await expect(page.getByRole("button", { name: "에디토리얼" })).toBeVisible();
  await expect(page.getByRole("button", { name: "스텝 콜라주" })).toBeVisible();
  await expect(page.getByRole("button", { name: "격자" })).toHaveCount(3);

  await expect(page.getByRole("button", { name: "시작하기" })).toBeDisabled();
  await page.getByRole("button", { name: "와이드 콜라주" }).click();
  await expect(page.getByRole("button", { name: "시작하기" })).toBeEnabled();
});

test("모든 슬롯을 채워야 완성하기 버튼이 활성화된다", async ({ page }) => {
  await setupColorwork(page);
  await gotoUploadStep(page); // G2 = 4슬롯

  const completeButton = page.getByRole("button", { name: "완성하기" });
  await expect(completeButton).toBeDisabled();

  const image = createTestImageFile();
  for (let i = 0; i < 3; i++) {
    await fillOneSlotWithCrop(page, image);
    await expect(completeButton).toBeDisabled();
  }
  await fillOneSlotWithCrop(page, image);

  await expect(completeButton).toBeEnabled();
});

test("완성하기를 누르면 결과 화면으로 이동하고 서버에 저장된다 (로그인 상태)", async ({ page }) => {
  const mock = await setupColorwork(page, { loggedIn: true });
  await gotoUploadStep(page);

  const image = createTestImageFile();
  for (let i = 0; i < 4; i++) await fillOneSlotWithCrop(page, image);

  await page.getByRole("button", { name: "완성하기" }).click();

  await expect(page.getByText(/#컬러워크/)).toBeVisible();
  await expect
    .poll(() => mock.calls.some((c) => c.path.endsWith("/complete") && c.method === "PUT"))
    .toBe(true);
  expect(mock.calls.some((c) => c.path.endsWith("/palette/select"))).toBe(true);
  expect(mock.calls.some((c) => c.path.endsWith("/grid"))).toBe(true);
  expect(mock.calls.filter((c) => c.path.includes("/frames/")).length).toBe(4);
  expect(mock.calls.some((c) => c.path.endsWith("/thumbnail"))).toBe(true);
});

test("로그인하지 않은 상태에서 완성하기를 누르면 결과 화면은 보이지만 서버에는 아무 것도 저장되지 않는다", async ({ page }) => {
  const mock = await setupColorwork(page, { loggedIn: false });
  await gotoUploadStep(page);

  const image = createTestImageFile();
  for (let i = 0; i < 4; i++) await fillOneSlotWithCrop(page, image);

  await page.getByRole("button", { name: "완성하기" }).click();

  await expect(page.getByText(/#컬러워크/)).toBeVisible();
  expect(mock.calls.length).toBe(0);
});

test("임시저장을 누르면 완료 안내가 뜨고 진행중 활동으로 이동할 수 있다", async ({ page }) => {
  const mock = await setupColorwork(page, { loggedIn: true });
  await gotoUploadStep(page);
  await fillOneSlotWithCrop(page, createTestImageFile());

  await page.getByRole("button", { name: "임시저장" }).click();

  await expect(page.getByText("임시저장이 완료되었습니다")).toBeVisible();
  await expect
    .poll(() => mock.calls.some((c) => c.path === "/projects" && c.method === "POST"))
    .toBe(true);

  await page.getByRole("button", { name: "진행중인 활동" }).click();
  await expect(page).toHaveURL(/\/inprogress/);
});

test("업로드 화면에서 뒤로가기를 누르면 사진이 초기화된다는 경고가 뜨고, 확인하면 슬롯이 비워진다", async ({ page }) => {
  await setupColorwork(page);
  await gotoUploadStep(page);
  await fillOneSlotWithCrop(page, createTestImageFile());

  await page.locator("button:has(svg.lucide-chevron-left)").click();

  await expect(page.getByText("레이아웃 선택으로 돌아갈까요?")).toBeVisible();
  await expect(page.getByText("업로드한 사진이 초기화돼요.")).toBeVisible();

  await page.getByRole("button", { name: "뒤로가기" }).click();

  await expect(page.getByRole("button", { name: "시작하기" })).toBeVisible();
});

test("디자인 탭에서 프레임 색상/굵기/모서리를 변경할 수 있다", async ({ page }) => {
  await setupColorwork(page);
  await gotoUploadStep(page);

  await page.getByRole("button", { name: "굵기" }).click();
  await page.getByRole("button", { name: "굵게" }).click();

  await page.getByRole("button", { name: "모서리" }).click();
  await page.getByRole("button", { name: "둥글게" }).click();

  await page.getByRole("button", { name: "색상" }).click();
  // 프리셋 색상 5개 중 아무거나 눌러도 크래시 없이 선택된다는 것만 확인 (아이콘 전용 버튼이라 접근성 이름이 없음)
  await page.locator('button[style*="background-color"]').first().click();
});
