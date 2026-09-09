import { test as base, expect } from "@playwright/test";

// app/(main)/layout.tsx가 세션당 첫 방문을 /guide로 강제 리다이렉트시켜서, 매 테스트
// 시작 전에 sessionStorage 플래그를 미리 심어 우회한다.
export const test = base.extend<{ skipOnboardingGuide: void }>({
  skipOnboardingGuide: [
    async ({ page }, use) => {
      await page.addInitScript(() => {
        try {
          window.sessionStorage.setItem("smoodee_guide_seen", "true");
        } catch {
          /* ignore */
        }
      });
      await use();
    },
    { auto: true },
  ],
});

export { expect };
export type { Page } from "@playwright/test";
