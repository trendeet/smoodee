import { Page } from "@playwright/test";

export interface MockUser {
  id: number;
  name: string;
  email?: string;
}

const SESSION_KEY = "smoodee_has_session";

// AuthContext가 마운트 시 부르는 refresh/me 두 엔드포인트만 모킹해서 로그인된 상태로 시작한다.
// page.goto() 이전에 호출할 것.
export async function mockLoggedInSession(
  page: Page,
  user: MockUser,
  accessToken = "mock-access-token"
): Promise<void> {
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "1");
  }, SESSION_KEY);

  await page.route("**/api/v1/auth/refresh", (route) =>
    route.fulfill({ json: { data: { accessToken } } })
  );

  await page.route("**/api/v1/me", (route) =>
    route.fulfill({
      json: {
        data: {
          id: user.id,
          name: user.name,
          email: user.email ?? `${user.name.toLowerCase()}@test.local`,
        },
      },
    })
  );
}

/** refresh 쿠키가 만료/부재한 상황(비로그인 상태 유지)을 흉내낸다. */
export async function mockLoggedOutSession(page: Page): Promise<void> {
  await page.route("**/api/v1/auth/refresh", (route) =>
    route.fulfill({
      status: 401,
      json: { error: { code: "INVALID_REFRESH_TOKEN", message: "invalid refresh token" } },
    })
  );
}
