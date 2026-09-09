import { Page } from "@playwright/test";
import { installSSEShim } from "./sse";
import { mockLoggedInSession } from "./auth";
import { ManittoApiMock } from "./manittoApi";

// lobby/room/deduction/result/cert-feed 시나리오가 공유하는 기본 상태: 로그인된 민준(1),
// ACTIVE 상태 방에 서연(2)까지 참가, 내 마니띠는 서연. page.goto() 이전에 호출할 것.
export async function setupActiveRoomForMe(page: Page): Promise<ManittoApiMock> {
  const mock = new ManittoApiMock();
  mock.status = "ACTIVE";
  mock.hostUserId = 1;
  mock.myUserId = 1;
  mock.addParticipant({ userId: 1, name: "민준", nickname: "민준" });
  mock.addParticipant({ userId: 2, name: "서연", nickname: "서연" });
  mock.myTargetUserId = 2;

  await installSSEShim(page);
  await mockLoggedInSession(page, { id: 1, name: "민준" });
  await mock.install(page);
  return mock;
}
