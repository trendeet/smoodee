# Frontend 규칙

## 기술 스택

- Next.js + TypeScript
- Tailwind CSS (토큰은 디자인 시스템 스킬 참조)
- 모바일 퍼스트 반응형

## 코드 스타일

- 함수형 컴포넌트 + hooks 사용
- 컴포넌트 파일명: PascalCase (`TemplateCard.tsx`)
- 유틸/훅 파일명: camelCase (`useAuth.ts`)
- barrel export(index.ts) 지양 — 직접 import

## 컴포넌트 규칙

- props 타입은 컴포넌트 파일 상단에 `interface` 로 정의
- 스타일링은 Tailwind 유틸리티 클래스 우선
- 디자인 토큰: `primary / secondary / accent / bgBase / textBase` 만 사용
- 터치 타겟 최소 44px, 기본 page padding `px-4`

## 상태 관리

- 서버 상태: React Query (TanStack Query)
- 클라이언트 상태: React 내장 (useState / useContext)
- 전역 상태가 필요하면 Context 우선, 복잡해지면 Zustand 검토

## 테스트

- 컴포넌트 테스트: Vitest + Testing Library
- `npm run test` 로 실행
