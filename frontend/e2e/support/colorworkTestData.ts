import { Page, expect } from "@playwright/test";
import { mockLoggedInSession } from "./auth";
import { ColorworkApiMock } from "./colorworkApi";

/** 컬러워크는 비로그인 상태로도 전체 플로우를 진행할 수 있어, 로그인 여부는 테스트별로 선택한다. */
export async function setupColorwork(page: Page, opts: { loggedIn?: boolean } = {}): Promise<ColorworkApiMock> {
  const mock = new ColorworkApiMock();
  await mock.install(page);
  if (opts.loggedIn ?? true) {
    await mockLoggedInSession(page, { id: 1, name: "민준" });
  }
  return mock;
}

/** 팔레트 선택 화면에서 첫 번째로 보이는 팔레트 카드를 클릭한다 (팔레트 12종 중 랜덤 3개가 뜨므로 이름을 특정할 수 없다). */
export async function selectFirstPalette(page: Page): Promise<void> {
  await page.locator(".grid.grid-cols-3.gap-4 > div").first().click();
}

/** 크롭 모달까지 거쳐서 그리드의 빈 슬롯 하나를 채운다. */
export async function fillOneSlotWithCrop(page: Page, imagePath: string): Promise<void> {
  await page.locator("svg.lucide-camera").first().click();
  await page.locator('input[type="file"]').setInputFiles(imagePath);
  // 크롭 모달 바깥(디자인 패널의 기본 선택된 흰색 프리셋)에도 Check 아이콘 버튼이 있어
  // "체크 아이콘이 있는 버튼"만으로는 특정할 수 없다 — 크롭 모달(전체화면 검은 오버레이) 안으로 좁힌다.
  const cropModal = page.locator("div.fixed.inset-0.flex.flex-col.bg-black");
  const confirmCrop = cropModal.locator("button:has(svg.lucide-check)");
  await expect(confirmCrop).toBeEnabled({ timeout: 10_000 });
  await confirmCrop.click();
  await expect(cropModal).toBeHidden({ timeout: 10_000 });
}
