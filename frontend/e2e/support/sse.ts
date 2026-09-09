import { Page } from "@playwright/test";

// page.route().fulfill()은 커넥션을 즉시 닫아버려서 SSE를 흉내낼 수 없다 —
// EventSource 생성자 자체를 가짜로 치환한다. page.goto() 이전에 호출할 것.
export async function installSSEShim(page: Page): Promise<void> {
  await page.addInitScript(() => {
    class FakeEventSource {
      static instances: FakeEventSource[] = [];
      private listeners: Record<string, Array<(e: MessageEvent) => void>> = {};
      onerror: (() => void) | null = null;
      onopen: (() => void) | null = null;
      readonly url: string;

      constructor(url: string) {
        this.url = url;
        FakeEventSource.instances.push(this);
      }

      addEventListener(type: string, cb: (e: MessageEvent) => void) {
        (this.listeners[type] ??= []).push(cb);
      }

      removeEventListener(type: string, cb: (e: MessageEvent) => void) {
        this.listeners[type] = (this.listeners[type] ?? []).filter((f) => f !== cb);
      }

      close() {
        const idx = FakeEventSource.instances.indexOf(this);
        if (idx >= 0) FakeEventSource.instances.splice(idx, 1);
      }

      // 테스트 헬퍼가 호출하는 내부 디스패치
      __dispatch(type: string, data: unknown) {
        const event = { data: JSON.stringify(data) } as MessageEvent;
        for (const cb of this.listeners[type] ?? []) cb(event);
      }
    }

    // @ts-expect-error 테스트 전용 전역 교체
    window.EventSource = FakeEventSource;

    // @ts-expect-error 테스트 훅: 현재 열려 있는 모든 EventSource 구독자에게 이벤트 발화
    window.__emitSSE = (type: string, data: unknown) => {
      for (const es of FakeEventSource.instances) {
        (es as unknown as { __dispatch: (t: string, d: unknown) => void }).__dispatch(type, data);
      }
    };

    // @ts-expect-error 테스트 훅: 현재 열려있는 EventSource 구독 수(대상 URL 검증용)
    window.__sseConnectionCount = () => FakeEventSource.instances.length;
  });
}

/** 현재 열려 있는 모든 SSE 구독자에게 이벤트를 발화한다 (ManittoController가 브로드캐스트하는 상황을 흉내냄). */
export async function emitSSE(page: Page, type: string, data: unknown): Promise<void> {
  await page.evaluate(
    ({ type, data }) => (window as unknown as { __emitSSE: (t: string, d: unknown) => void }).__emitSSE(type, data),
    { type, data }
  );
}
