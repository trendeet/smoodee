# Backend 규칙

## 기술 스택
- Node.js + TypeScript
- REST API

## 코드 스타일
- 파일명: camelCase (`authController.ts`)
- 라우트 경로: kebab-case (`/api/template-cards`)
- 에러 응답은 일관된 형식: `{ error: string, code: string }`

## API 규칙
- RESTful 설계 원칙 준수
- 인증이 필요한 엔드포인트는 미들웨어로 보호
- 요청 검증(validation)은 컨트롤러 진입 전에 처리
- 페이지네이션: `?page=1&limit=20` 형식

## 환경변수
- `.env` 파일은 커밋 금지
- `.env.example` 에 키 목록만 유지

## 테스트
- 유닛 테스트: Vitest
- API 테스트: supertest
- `npm run test` 로 실행
