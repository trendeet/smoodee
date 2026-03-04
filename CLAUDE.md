# Trender — 공통 규칙

## 프로젝트 개요
클릭 몇 번이면 끝나는, 가장 부드러운 템플릿 제작 플로우.
모노레포 구조: `frontend/` (React) + `backend/` (API 서버)

## 공통 원칙
- 한국어 커밋 메시지 OK, 코드/변수명은 영어
- 모든 비동기 호출에 Loading / Empty / Error 상태 처리
- 디자인 토큰은 `.claude/skills/design-system/SKILL.md` 참조
- 환경변수(.env)는 절대 커밋하지 않는다

## 브랜치 전략
- `main`: 프로덕션
- `dev`: 개발 통합
- feature 브랜치: `feat/<설명>`, bugfix: `fix/<설명>`

## 커밋 컨벤션
- `feat:` 새 기능 / `fix:` 버그 수정 / `refactor:` 리팩토링 / `docs:` 문서 / `chore:` 기타
- 제목은 50자 이내, 본문은 선택

## 디렉토리 구조
```
/
├── CLAUDE.md                  ← 이 파일 (공통 규칙)
├── frontend/
│   └── CLAUDE.md              ← 프론트엔드 전용 규칙
├── backend/
│   └── CLAUDE.md              ← 백엔드 전용 규칙
├── .claude/
│   ├── commands/
│   │   └── work-on-trender.md ← 작업 시작 명령어
│   └── skills/
│       └── design-system/
│           └── SKILL.md       ← 디자인 시스템 스킬
└── README.md
```
