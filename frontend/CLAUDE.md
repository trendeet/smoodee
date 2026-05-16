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

## 환경변수

- `NEXT_PUBLIC_API_BASE_URL`: 백엔드 API 주소 (빌드 타임 인라인)
  - 로컬: `.env.local` 에 `http://localhost:8080` (git 미포함)
  - 프로덕션: Dockerfile ARG 기본값 `https://smoodee.p-e.kr`

## 배포 절차

ECR + Docker Compose 방식. 배포 서버: `ec2-user@smoodee.p-e.kr` (키: `~/.ssh/smoodee`)

```bash
# 1. ECR 로그인
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin 759416136224.dkr.ecr.ap-northeast-2.amazonaws.com

# 2. 프론트엔드 빌드 & 푸시 (NEXT_PUBLIC_API_BASE_URL 기본값이 Dockerfile에 있음)
docker build --platform linux/amd64 -t 759416136224.dkr.ecr.ap-northeast-2.amazonaws.com/smoodee-frontend:latest .
docker push 759416136224.dkr.ecr.ap-northeast-2.amazonaws.com/smoodee-frontend:latest

# 3. 백엔드 빌드 & 푸시
cd ../backend
docker build --platform linux/amd64 -t 759416136224.dkr.ecr.ap-northeast-2.amazonaws.com/smoodee-backend:latest .
docker push 759416136224.dkr.ecr.ap-northeast-2.amazonaws.com/smoodee-backend:latest

# 4. EC2에서 pull & 재시작
ssh -i ~/.ssh/smoodee ec2-user@smoodee.p-e.kr \
  "cd ~ && aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin 759416136224.dkr.ecr.ap-northeast-2.amazonaws.com && docker compose pull && docker compose up -d"
```
