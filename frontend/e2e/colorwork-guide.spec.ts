import { test, expect } from "./support/fixtures";
import { setupColorwork } from "./support/colorworkTestData";

/**
 * docs/colorwork-spec.md §3.1 — 가이드 모드.
 * 실제 UI를 복제해 어둡게 오버레이한 "인터랙티브 미리보기"이며, 클릭은 막혀있고
 * (pointer-events-none) 상단 "건너뛰기"와 하단 내비게이션으로만 진행한다.
 */

test("인트로에서 건너뛰기를 누르면 곧장 팔레트 선택 화면으로 진입한다", async ({ page }) => {
  await setupColorwork(page);
  await page.goto("/colorwork");

  await expect(page.getByRole("button", { name: "건너뛰기" })).toBeVisible();
  await page.getByRole("button", { name: "건너뛰기" }).click();

  await expect(page.getByText("오늘 당신의")).toBeVisible();
  await expect(page.getByText("가장 끌리는 팔레트를 선택해주세요.")).toBeVisible();
});

test("사용법 알아보기를 누르면 가이드 슬라이드가 시작되고 각 단계마다 건너뛰기가 가능하다", async ({ page }) => {
  await setupColorwork(page);
  await page.goto("/colorwork");

  await page.getByRole("button", { name: "사용법 알아보기" }).click();
  await expect(page.getByText("색상을 골라주세요")).toBeVisible();
  await expect(page.getByRole("button", { name: "건너뛰기" })).toBeVisible();

  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByText("몇 장의 사진을")).toBeVisible();

  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByText("이미지를 채워주세요!")).toBeVisible();

  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByText("결과가 완성되었습니다.")).toBeVisible();
});

test("가이드 마지막 단계에서 '직접 만들기'를 누르면 실제 플로우로 진입한다", async ({ page }) => {
  await setupColorwork(page);
  await page.goto("/colorwork");

  await page.getByRole("button", { name: "사용법 알아보기" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByRole("button", { name: "직접 만들기" })).toBeVisible();

  await page.getByRole("button", { name: "직접 만들기" }).click();

  await expect(page.getByText("가장 끌리는 팔레트를 선택해주세요.")).toBeVisible();
});
