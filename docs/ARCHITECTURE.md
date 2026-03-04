# Architecture

## 설계 원칙

라우팅은 `app/`, 재사용 UI는 `components/`, 도메인 로직은 `features/`로 나눈다.

## Frontend 디렉토리 구조

```
src/
  app/
    (public)/
      page.tsx
    (auth)/
      login/page.tsx
      callback/page.tsx
    (main)/
      page.tsx
      projects/page.tsx
      library/page.tsx
      settings/page.tsx
    api/                     # Route Handlers (선택)
    layout.tsx
    loading.tsx
    error.tsx
    not-found.tsx
    globals.css

  components/
    ui/                      # Button, Input, Card, Modal, Toast, Spinner...
    layout/                  # Header, BottomNav, Drawer...
    icons/

  features/                  # 도메인 단위
    templates/
      components/
      hooks/
      api.ts
      types.ts
      utils.ts
    projects/
      components/
      hooks/
      api.ts
      types.ts
      utils.ts
    groups/
      components/
      hooks/
      api.ts
      types.ts
      utils.ts
    upload/
      components/
      hooks/
      api.ts
      types.ts
      utils.ts

  lib/
    api/                     # fetcher, axios 인스턴스, interceptors
    auth/                    # session helpers, guards
    query/                   # react-query client, keys
    storage/                 # localStorage, indexedDB wrappers
    utils/                   # formatters, validators
    constants/
    env.ts                   # zod로 env 검증

  styles/
    tokens.css               # (선택) CSS variables
    tailwind.css

  types/
    index.ts                 # 글로벌 타입 (정말 공통만)

  public/
```

## Routing

```
(public)/*               → 랜딩/소개 (비로그인)
(auth)/login             → 로그인
(auth)/callback          → OAuth 콜백
(main)/*                 → 메인 앱 (로그인 필요)
  /                      → 홈
  /projects              → 프로젝트 목록
  /library               → 라이브러리
  /settings              → 설정
```

## Component Pattern

```
Page (라우트 레벨)
 └─ Container (데이터 fetch + 상태 관리)
     └─ View (프레젠테이션, Tailwind 스타일링)
```

- **Page**: Next.js App Router의 `page.tsx`. 라우트 진입점
- **Container**: 데이터 fetching, 상태 조합, 이벤트 핸들러 정의
- **View**: props만 받아 렌더링. 비즈니스 로직 없음

## State Management

| 영역 | 도구 | 용도 |
|------|------|------|
| Server State | TanStack Query v5 | API 캐싱, 자동 refetch |
| Auth State | React Context + localStorage | 토큰, 사용자 정보 |
| Form State | React Hook Form + Zod | 폼 유효성 검사 |
| Client State | useState / useContext | 단순 UI 상태 |

## API Client (`lib/api/`)

```
client.ts        → Axios 인스턴스 (getRaw, postRaw, putRaw, patchRaw, delRaw)
endpoints.ts     → API_ENDPOINTS (URL 상수) + QUERY_KEYS (캐시 키 팩토리)
tokenManager.ts  → Auth 토큰 관리 (localStorage)
```

### 규칙
- API 호출은 `features/*/api.ts`에서 `client.ts`를 import하여 사용
- URL 상수는 `endpoints.ts`에 집중 관리
- React Query 캐시 키는 `QUERY_KEYS` 팩토리로 통일
