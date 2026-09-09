import { Page } from "@playwright/test";

// scrollIntoViewIfNeeded()는 겨우 보이는 지점까지만 스크롤해서, 하단 고정 HUD와 겹쳐
// 클릭이 가로채이는 flake가 있었다 — 클릭 전에 스크롤 컨테이너를 바닥까지 내린다.
export async function scrollLobbyToBottom(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelector("main.overflow-y-auto")?.scrollTo(0, 999_999);
  });
}

/** 로비의 "활성화된 방" 그리드에서 참가자 이름으로 카드를 찾아 클릭한다. */
export async function clickRoomCard(page: Page, participantName: string): Promise<void> {
  await scrollLobbyToBottom(page);
  await page
    .locator("section", { hasText: "활성화된 방" })
    .getByRole("button", { name: new RegExp(participantName) })
    .click();
}
