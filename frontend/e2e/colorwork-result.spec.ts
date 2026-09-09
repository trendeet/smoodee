import { test, expect } from "./support/fixtures";
import { setupColorwork } from "./support/colorworkTestData";

/**
 * docs/colorwork-spec.md §3.5 — 결과 화면(step 4).
 * 신규 플로우는 전체 업로드를 다 거쳐야만 도달하므로, 여기서는 이미 그리드+프레임이
 * 채워진 프로젝트를 재개 플로우(`?projectId=&step=4`)로 곧장 열어 결과 화면만 검증한다.
 */

const SUNSET_HEXES = ["#FBBF24", "#F97316", "#EF4444", "#DC2626", "#7C3AED"];

function seedCompletedProject(mock: Awaited<ReturnType<typeof setupColorwork>>) {
  return mock.seedProject({
    gridType: "G2",
    paletteSeed: "Sunset",
    selectedPaletteJson: JSON.stringify(SUNSET_HEXES),
    howtoSeen: true,
    frames: [
      { frameIndex: 0, assetId: 101 },
      { frameIndex: 1, assetId: 102 },
      { frameIndex: 2, assetId: 103 },
      { frameIndex: 3, assetId: 104 },
    ],
  });
}

test("결과 화면에 캡션과 다운로드/공유/홈 버튼이 노출된다", async ({ page }) => {
  const mock = await setupColorwork(page, { loggedIn: true });
  const project = seedCompletedProject(mock);

  await page.goto(`/colorwork?projectId=${project.id}&step=4`);

  // 캡션은 팔레트 seed가 아니라 "첫 번째 색상의 이름"을 쓴다 — Sunset 팔레트의 첫 hex(#FBBF24)는 "Amber".
  await expect(page.getByText(/#컬러워크 #Amber #4cuts/)).toBeVisible();
  await expect(page.getByRole("button", { name: "다운로드" })).toBeVisible();
  await expect(page.getByRole("button", { name: "공유" })).toBeVisible();
  await expect(page.getByRole("button", { name: "홈으로" })).toBeVisible();
});

test("로그인 상태면 '보관함에 저장되었습니다' 안내와 보관함 확인 버튼이 뜬다", async ({ page }) => {
  const mock = await setupColorwork(page, { loggedIn: true });
  const project = seedCompletedProject(mock);

  await page.goto(`/colorwork?projectId=${project.id}&step=4`);

  await expect(page.getByText("보관함에 저장되었습니다")).toBeVisible();
  await page.getByRole("button", { name: "보관함 확인하기" }).click();

  await expect(page).toHaveURL(/\/recent/);
});

test("다운로드 버튼을 누르면 실제로 파일 다운로드가 트리거된다", async ({ page }) => {
  const mock = await setupColorwork(page, { loggedIn: true });
  const project = seedCompletedProject(mock);

  await page.goto(`/colorwork?projectId=${project.id}&step=4`);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "다운로드" }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/^colorwork_.*\.png$/);
});

test("홈으로 버튼을 누르면 홈으로 이동한다", async ({ page }) => {
  const mock = await setupColorwork(page, { loggedIn: true });
  const project = seedCompletedProject(mock);
  await page.goto(`/colorwork?projectId=${project.id}&step=4`);

  await page.getByRole("button", { name: "홈으로" }).click();

  await expect(page).toHaveURL("/");
});
