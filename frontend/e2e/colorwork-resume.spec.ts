import { test, expect } from "./support/fixtures";
import { setupColorwork } from "./support/colorworkTestData";

/**
 * docs/colorwork-spec.md §3.6~§3.7 — 재개 플로우(ColorWorkResumeFlow.tsx)와
 * 진행중(개인) 탭 진입점. 재개 플로우는 가이드가 없고, 서버에 저장된 상태에 따라
 * 곧장 이어질 스텝으로 진입한다.
 */

test("그리드까지 선택된 프로젝트는 업로드 화면으로 바로 진입한다", async ({ page }) => {
  const mock = await setupColorwork(page, { loggedIn: true });
  const project = mock.seedProject({
    gridType: "G2",
    paletteSeed: "Sunset",
    selectedPaletteJson: JSON.stringify(["#FBBF24", "#F97316", "#EF4444", "#DC2626", "#7C3AED"]),
    frames: [{ frameIndex: 0, assetId: 1 }],
  });

  await page.goto(`/colorwork?projectId=${project.id}`);

  await expect(page.getByText("각 프레임을 눌러 사진을 채워주세요!")).toBeVisible();
  await expect(page.getByText("1 / 4 채움")).toBeVisible();
});

test("팔레트만 선택된 프로젝트는 레이아웃 선택 화면으로 진입한다", async ({ page }) => {
  const mock = await setupColorwork(page, { loggedIn: true });
  const project = mock.seedProject({
    paletteSeed: "Sunset",
    selectedPaletteJson: JSON.stringify(["#FBBF24", "#F97316", "#EF4444", "#DC2626", "#7C3AED"]),
  });

  await page.goto(`/colorwork?projectId=${project.id}`);

  await expect(page.getByText("몇 장의 사진을")).toBeVisible();
});

test("아무것도 선택되지 않은 프로젝트는 팔레트 선택 화면부터 시작한다", async ({ page }) => {
  const mock = await setupColorwork(page, { loggedIn: true });
  const project = mock.seedProject({});

  await page.goto(`/colorwork?projectId=${project.id}`);

  await expect(page.getByText("가장 끌리는 팔레트를 선택해주세요.")).toBeVisible();
});

test("존재하지 않는 프로젝트로 접근하면 에러 없이 진행중 탭으로 돌아간다", async ({ page }) => {
  await setupColorwork(page, { loggedIn: true });

  await page.goto("/colorwork?projectId=99999");

  await expect(page).toHaveURL(/\/inprogress/);
});

test("재개 화면의 뒤로가기는 어느 단계에 있든 항상 진행중 탭으로 이동한다", async ({ page }) => {
  const mock = await setupColorwork(page, { loggedIn: true });
  const project = mock.seedProject({});
  await page.goto(`/colorwork?projectId=${project.id}`);
  await expect(page.getByText("가장 끌리는 팔레트를 선택해주세요.")).toBeVisible();

  await page.locator("button:has(svg.lucide-chevron-left)").click();

  await expect(page).toHaveURL(/\/inprogress/);
});

test("진행중 탭에서 컬러워크 카드를 탭하면 재개 URL로 이동하고 진행률이 표시된다", async ({ page }) => {
  const mock = await setupColorwork(page, { loggedIn: true });
  const project = mock.seedProject({
    gridType: "G2",
    frames: [
      { frameIndex: 0, assetId: 1 },
      { frameIndex: 1, assetId: 2 },
    ],
  });

  await page.goto("/inprogress?tab=personal");

  await expect(page.getByText("컬러워크")).toBeVisible();
  await expect(page.getByText("2/4")).toBeVisible();

  await page.getByText("컬러워크").click();

  await expect(page).toHaveURL(new RegExp(`/colorwork\\?projectId=${project.id}`));
});

test("진행중인 개인 활동이 없으면 빈 상태 문구가 보인다", async ({ page }) => {
  await setupColorwork(page, { loggedIn: true });

  await page.goto("/inprogress?tab=personal");

  await expect(page.getByText("진행 중인 활동이 없어요.")).toBeVisible();
  await expect(page.getByText("새로운 활동을 시작해보세요!")).toBeVisible();
});
