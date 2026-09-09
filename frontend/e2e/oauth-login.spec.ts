import { test, expect } from "./support/fixtures";
import { mockLoggedInSession, mockLoggedOutSession } from "./support/auth";

// 네이버 동의 화면은 제3자 사이트라 자동화 대상이 아니다. 여기서는 우리 코드가 담당하는
// 두 경계만 검증한다: 로그인 버튼 클릭 시 authorize URL로 리다이렉트를 "시도"하는지,
// 그리고 콜백에 code가 실려 왔다고 가정했을 때 세션 복원이 올바르게 동작하는지.

test.describe("비로그인 상태", () => {
  test("방 만들기/입장 버튼이 비활성화되고 안내 문구가 보인다", async ({ page }) => {
    await mockLoggedOutSession(page);
    await page.goto("/manitto");

    await expect(page.getByRole("button", { name: "로그인 후 이용 가능" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "입장하기" })).toBeDisabled();
  });
});

test.describe("로그인 시작 (네이버 OAuth 리다이렉트)", () => {
  test("'네이버로 로그인' 클릭 시 백엔드 authorize 엔드포인트로 이동을 시도한다", async ({ page }) => {
    // 실제 네이버 동의 화면 대신, 목적지 URL로의 네비게이션 자체만 가로채서 확인한다.
    let requested = false;
    await page.route("http://localhost:8080/oauth2/authorization/naver", async (route) => {
      requested = true;
      await route.fulfill({ status: 200, contentType: "text/html", body: "<html>naver stub</html>" });
    });

    await page.goto("/login");
    await page.getByRole("button", { name: "네이버로 로그인" }).click();

    await expect.poll(() => requested).toBe(true);
    expect(page.url()).toBe("http://localhost:8080/oauth2/authorization/naver");
  });
});

test.describe("OAuth 콜백 처리", () => {
  test("code 파라미터가 없으면 /login?error=oauth_failed로 리다이렉트된다", async ({ page }) => {
    await page.goto("/oauth2/callback");
    await expect(page).toHaveURL(/\/login\?error=oauth_failed/);
  });

  test("코드 교환에 성공하면 세션이 저장되고 홈(\"/\")으로 리다이렉트된다", async ({ page }) => {
    await page.route("**/api/v1/auth/exchange**", (route) =>
      route.fulfill({ json: { data: { accessToken: "issued-access-token" } } })
    );
    await page.route("**/api/v1/me", (route) =>
      route.fulfill({ json: { data: { id: 1, name: "민준", email: "minjun@test.local" } } })
    );

    await page.goto("/oauth2/callback?code=one-time-code-123");

    await expect(page).toHaveURL("/");
    const sessionHint = await page.evaluate(() => localStorage.getItem("smoodee_has_session"));
    expect(sessionHint).toBe("1");
  });

  test("코드 교환이 실패하면 /login?error=oauth_failed로 리다이렉트된다", async ({ page }) => {
    await page.route("**/api/v1/auth/exchange**", (route) =>
      route.fulfill({
        status: 400,
        json: { error: { code: "INVALID_REFRESH_TOKEN", message: "invalid code" } },
      })
    );

    await page.goto("/oauth2/callback?code=expired-or-reused-code");

    await expect(page).toHaveURL(/\/login\?error=oauth_failed/);
  });
});

test.describe("세션 복원 (refresh 쿠키 기반)", () => {
  test("세션 힌트가 있으면 재방문 시 refresh로 로그인 상태가 복원된다", async ({ page }) => {
    await mockLoggedInSession(page, { id: 1, name: "민준" });
    // 방 목록 조회(GET /rooms)까지 정상 응답해야 create 화면이 로그인 상태로 렌더링된다.
    await page.route("**/api/v1/manitto/rooms**", (route) => route.fulfill({ json: { data: [] } }));

    await page.goto("/manitto");

    await expect(page.getByRole("button", { name: "방 만들기" })).toBeEnabled();
  });

  test("refresh 쿠키가 만료되어 있으면 세션 힌트가 제거되고 비로그인 상태로 남는다", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("smoodee_has_session", "1"));
    await mockLoggedOutSession(page);

    await page.goto("/manitto");

    await expect(page.getByRole("button", { name: "로그인 후 이용 가능" })).toBeVisible();
    const sessionHint = await page.evaluate(() => localStorage.getItem("smoodee_has_session"));
    expect(sessionHint).toBeNull();
  });
});
