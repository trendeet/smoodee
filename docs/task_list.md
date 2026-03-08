# smoodee MVP(v0) — Backend Task List (Spring Boot 3.x / Java 17 / Gradle)
> 인증: **OAuth2 + JWT(Access) + Refresh 쿠키(DB 해시 저장)**  
> 스토리지: **AWS S3 실사용 + Presigned GET URL**  
> 렌더링: **DB(RenderJob) + @Async 워커 + Java2D(이미지) + FFmpeg(영상)**  
> 문서: **Swagger UI(springdoc-openapi)**  
> DB 스키마: **JPA ddl-auto(update in dev/local, validate in prod 권장)**  
> **PWA/Web Push 알림은 MVP에서 제외(V1 백로그로 이동)**

---

## 0) 공통 규칙 / 완료 기준(Definition of Done)
- 모든 API는 Swagger UI에 노출되어야 한다.
- 모든 보호 API는 Bearer JWT가 없으면 **401**, 권한이 없으면 **403**.
- Validation 실패는 **400** + 표준 에러 포맷으로 응답한다.
- 핵심 상태 모델(Project/RenderJob)은 상태 전이가 서비스 계층에서만 일어나도록 한다.
- S3 객체 접근은 **Presigned URL** 발급 방식을 기본으로 한다(서버 스트리밍 다운로드는 MVP에 포함하지 않음).
- 렌더링 실패 시 `RenderJob.errorReason`에 사람이 이해 가능한 메시지를 남긴다.
- **테스트 최소 기준**
  - 인증(JWT 검증/만료), Refresh 회전/폐기
  - 권한 체크(프로젝트/그룹/에셋/렌더)
  - S3 업로드 + presign 다운로드(통합 테스트 수준)

---

## 1) 우선순위 정의
- **P0 (Must)**: MVP end-to-end 결과를 만드는 데 필수
- **P1 (Should)**: 운영/UX 개선(채팅, TTL/만료, 로깅 등)
- **P2 (Could)**: 고급 정책/비용 최적화/품질 검사 강화

---

## Epic 0. 프로젝트/환경 세팅 (P0)

### T0-1. Spring Boot 3.x + Java17 + Gradle 프로젝트 생성 [P0]
- [ ] Spring Initializr 기반 생성
- [ ] 의존성 추가  
  - spring-boot-starter-web  
  - spring-boot-starter-validation  
  - spring-boot-starter-security  
  - spring-boot-starter-oauth2-client  
  - spring-boot-starter-data-jpa  
  - springdoc-openapi-starter-webmvc-ui  
  - AWS SDK v2: `software.amazon.awssdk:s3`  
  - DB driver: H2(local optional), MySQL(dev/prod)
- **DoD**
  - [ ] 앱 기동 OK
  - [ ] `/swagger-ui.html` 접속 OK

### T0-2. 로컬 개발용 MySQL docker-compose 구성(선택: H2 대신) [P0]
- [ ] docker-compose로 MySQL 실행
- **DoD**
  - [ ] local profile에서 MySQL 연결 OK

### T0-3. AWS S3 버킷/권한 준비(문서화 포함) [P0]
- [ ] dev/prod 버킷 생성(예: `smoodee-dev`, `smoodee-prod`)
- [ ] 퍼블릭 액세스 차단(권장)
- [ ] IAM 권한 최소화 정책 작성(Put/Get/Delete/List 필요 최소)
- [ ] 로컬 개발은 env로 AWS 키 주입, 운영은 IAM Role 권장
- **DoD**
  - [ ] AWS CLI로 put/get 테스트 성공

### T0-4. application.yml 프로파일 분리(local/dev/prod) [P0]
- [ ] `spring.jpa.hibernate.ddl-auto` (local/dev: update, prod: validate 권장)
- [ ] `app.jwt.*`, `app.storage.s3.*`, `app.render.*` 설정 키 정의
- **DoD**
  - [ ] 각 프로파일로 정상 기동

### T0-5. 공통 응답/에러 포맷 + 글로벌 예외 처리 [P0]
- [ ] 성공 응답(권장): `{ "data": ..., "meta": ... }`
- [ ] 실패 응답(권장): `{ "error": { "code": "...", "message": "...", "details": ... } }`
- [ ] `@RestControllerAdvice` 구현(Validation, 인증/인가, 404, 500)
- **DoD**
  - [ ] 400/401/403/404/500 포맷 통일

### T0-6. Swagger 태그/보안 스키마 세팅 [P0]
- [ ] Tag: Auth, User, Project, Personal, Group, Upload, Render, Chat, Template, Scrap, Notification
- [ ] Bearer JWT SecurityScheme 등록(Authorize 버튼)
- **DoD**
  - [ ] Swagger UI에서 API 그룹 확인 가능

---

## Epic 1. 인증/계정 — OAuth2 + JWT (P0)

### 데이터 모델
- `User(id, provider, subject, name, bio, avatarS3Key, createdAt)`
- `RefreshToken(id, userId, tokenHash, expiresAt, revokedAt, createdAt, lastUsedAt)`

### T1-1. User 엔티티/Repo 구현 + 유니크 제약 [P0]
- [ ] provider, subject 기반 유니크 인덱스
- **DoD**
  - [ ] OAuth 로그인 시 upsert 가능

### T1-2. JWT Service 구현(HS256) + 단위 테스트 [P0]
- [ ] Access JWT: 만료 15분(설정 가능)
- [ ] Claims: sub(userId), iat, exp (+ role optional)
- [ ] Nimbus 기반(Jose) 사용
- **DoD**
  - [ ] 정상/만료/위조 토큰 검증 테스트 통과

### T1-3. Refresh Token 발급/저장(해시) + 회전/폐기 정책(최소) [P0]
- [ ] Refresh는 랜덤 opaque 토큰
- [ ] DB에는 hash 저장(원문 저장 금지)
- [ ] 쿠키: HttpOnly, Secure(운영), SameSite=Lax, Path=/, Max-Age=만료
- [ ] 정책(택1)
  - (권장) refresh 호출 시 회전: 기존 revoke + 새 refresh 발급
- **DoD**
  - [ ] refresh 토큰 재사용 방지(회전/폐기 동작)

### T1-4. Bearer JWT 인증 필터(OncePerRequestFilter) [P0]
- [ ] Authorization: Bearer 토큰 파싱/검증
- [ ] SecurityContext에 Authentication 주입
- **DoD**
  - [ ] 보호 API 토큰 없으면 401, 있으면 userId 식별 가능

### T1-5. OAuth2 SuccessHandler 구현(로그인 성공 후 Refresh 쿠키 세팅) [P0]
- [ ] User upsert
- [ ] RefreshToken 생성/저장
- [ ] Refresh 쿠키 set
- [ ] 프론트 redirect(예: `/oauth2/success`)
- **DoD**
  - [ ] 소셜 로그인 성공 시 쿠키 생성 확인

### T1-6. Auth API 구현(/me, /auth/refresh, /auth/logout) [P0]
- [ ] `GET /api/v1/me` (Bearer 필요) → name, bio, avatarUrl(presigned, 10m) 포함 반환
- [ ] `POST /api/v1/auth/refresh` (Refresh 쿠키 필요) → accessToken 반환
- [ ] `POST /api/v1/auth/logout` → refresh revoke + 쿠키 삭제
- **DoD**
  - [ ] refresh로 access 재발급 가능
  - [ ] logout 후 refresh 사용 불가
  - [ ] /me 응답에 프로필 필드 포함

### T1-7. Swagger에서 Bearer 인증 테스트 가능하게 구성 [P0]
- [ ] SecurityRequirement 적용
- **DoD**
  - [ ] Swagger Authorize로 보호 API 호출 가능

### T1-8. User 엔티티 프로필 필드 추가(name, bio, avatarS3Key) [P0]
- [ ] `name` VARCHAR(50), `bio` VARCHAR(200), `avatarS3Key` VARCHAR(500) 컬럼 추가
- [ ] 기존 사용자 마이그레이션 고려(nullable 허용)
- **DoD**
  - [ ] MyPage에서 프로필 정보 표시 가능

### T1-9. 프로필 수정 API [P0]
- [ ] `PUT /api/v1/me` → `{ name, bio }` 수정
- [ ] 입력 검증: name 1~50자, bio 0~200자
- **DoD**
  - [ ] MyPage 프로필 편집 UI 동작 가능

### T1-10. 아바타 이미지 업로드 API [P0]
- [ ] `POST /api/v1/me/avatar` (multipart)
- [ ] S3 key: `avatars/{userId}/{timestamp}`
- [ ] 이미지 검증: mime(image/*), size(<=5MB)
- [ ] 기존 아바타 교체 시 avatarS3Key 업데이트
- **DoD**
  - [ ] 아바타 업로드 후 /me 응답의 avatarUrl 갱신됨

### T1-11. 계정 삭제 API [P0]
- [ ] `DELETE /api/v1/me`
- [ ] 삭제 대상: User, RefreshToken, 개인 Project/Asset(cascade), UserScrap, UserNotification
- [ ] 그룹 OWNER인 경우 정책 결정 필요(MVP: 탈퇴만, 그룹은 유지)
- [ ] refresh 쿠키 삭제
- **DoD**
  - [ ] 계정 삭제 후 해당 userId로 API 호출 불가(401)

---

## Epic 2. Projects(진행중 탭) (P0)

### 데이터 모델
- `Project(id, userId, type(PERSONAL|GROUP), templateType, status, createdAt, updatedAt, expiresAt)`

### T2-1. Project 엔티티/상태 enum/전이 규칙 확정 [P0]
- [ ] PERSONAL: INIT → UPLOADING → DONE
- [ ] GROUP: CREATED → SLOT_CONFIG → IN_PROGRESS → DONE
- **DoD**
  - [ ] 상태 변경은 서비스 레벨 메서드로만 수행

### T2-2. Projects 리스트/상세 API [P0]
- [ ] `GET /api/v1/projects?type=PERSONAL|GROUP&status=...`
  - InProgressScreen: `status=INIT,UPLOADING,IN_PROGRESS` 필터
  - RecentScreen: `status=DONE,EXPIRED` 필터 (완료/만료된 프로젝트 조회)
- [ ] `GET /api/v1/projects/{projectId}`
- **DoD**
  - [ ] 개인/그룹 탭 구현 가능한 데이터 제공
  - [ ] RecentScreen의 완료/만료 프로젝트 목록 제공 가능

### T2-3. Project 삭제 API(권한 체크 포함) [P0]
- [ ] `DELETE /api/v1/projects/{projectId}`
- **DoD**
  - [ ] 소유자만 삭제 가능(403)

---

## Epic 3. 업로드/스토리지 — AWS S3 + Presigned URL (P0)

### 데이터 모델
- `Asset(id, projectId, ownerUserId, type(IMAGE|VIDEO), s3Key, mime, sizeBytes, width, height, durationSec, createdAt)`

### T3-1. S3 Client/Presigner 인프라 구성(AWS SDK v2) [P0]
- [ ] `S3Client` + `S3Presigner` Bean 구성
- [ ] 설정: bucket, region
- **DoD**
  - [ ] 실제 AWS S3로 put/get 테스트 성공

### T3-2. StorageService(S3) 구현 [P0]
- [ ] `put(file, key)`
- [ ] `presignGet(key, ttl)`
- [ ] `getObject(key)`(렌더 입력 다운용)
- (선택) `delete(key)`는 P1/P2로 미뤄도 됨
- **DoD**
  - [ ] 업로드 후 presigned GET으로 다운로드 가능

### T3-3. 파일 검증 최소셋 구현 [P0]
- [ ] 이미지: mime, size(<=10MB), width/height(ImageIO)
- [ ] 영상: mime, size(<=50MB), duration은 MVP에선 optional(가능하면 ffprobe로 추출)
- **DoD**
  - [ ] 잘못된 파일 400 + 명확한 에러 코드

### T3-4. Upload API(서버 multipart → S3 PutObject) [P0]
- [ ] `POST /api/v1/projects/{projectId}/assets`
- [ ] 흐름(권장)
  1) Asset row 먼저 생성(새 assetId 확보)
  2) key = `assets/{projectId}/{assetId}`
  3) S3 putObject
  4) Asset에 s3Key 업데이트
- **DoD**
  - [ ] 업로드 시 S3에 객체 생성됨

### T3-5. Asset 메타/다운로드URL API(권한 포함) [P0]
- [ ] `GET /api/v1/assets/{assetId}`
- [ ] `GET /api/v1/assets/{assetId}/download-url` (ttl=10m)
- **DoD**
  - [ ] 권한 OK면 presigned 반환, 아니면 403

---

## Epic 4. 개인 템플릿 — Colorwork (P0)

### 데이터 모델
- `PersonalColorworkConfig(projectId, paletteSeed, selectedPaletteJson, gridType(G2|G3), howtoSeen)`
- `PersonalFrame(id, projectId, frameIndex, assetId)` // frameIndex: 0..3 or 0..8

### T4-1. Colorwork 프로젝트 생성 API [P0]
- [ ] `POST /api/v1/personal/colorwork/projects`
- [ ] Project(type=PERSONAL, templateType=COLORWORK) + Config 생성
- **DoD**
  - [ ] 홈에서 “컬러워크 시작” 가능

### T4-2. 사용법(How-to) 상태 저장 [P0]
- [ ] `PUT /api/v1/personal/colorwork/{projectId}/howto-seen`
- **DoD**
  - [ ] 건너뛰기/시청 상태 저장 가능

### T4-3. 팔레트 셔플/선택 API(HSL 단순 알고리즘) [P0]
- [ ] `POST /api/v1/personal/colorwork/{projectId}/palette/shuffle`
- [ ] `PUT /api/v1/personal/colorwork/{projectId}/palette/select`
- **DoD**
  - [ ] 3색 세트 생성/선택 저장

### T4-4. Grid 선택(2x2/3x3) + 진행 상태 조회 [P0]
- [ ] `PUT /api/v1/personal/colorwork/{projectId}/grid`
- [ ] `GET /api/v1/personal/colorwork/{projectId}` (config + frames 상태)
- **DoD**
  - [ ] 나갔다 와도 상태 복구

### T4-5. 프레임별 업로드 바인딩 API [P0]
- [ ] `PUT /api/v1/personal/colorwork/{projectId}/frames/{index}` (assetId)
- [ ] gridType에 따라 index 범위/필수 개수 체크
- **DoD**
  - [ ] G2는 4개, G3는 9개 바인딩 강제 가능

---

## Epic 5. RenderJob 공통(큐/상태/재시도) (P0)

### 데이터 모델
- `RenderJob(id, projectId, type(PERSONAL_IMAGE|GROUP_VIDEO), status(QUEUED|RUNNING|SUCCEEDED|FAILED), outputS3Key, errorReason, createdAt, updatedAt)`

### T5-1. RenderJob 엔티티/Repo/상태 전이 구현 [P0]
- [ ] 상태 전이 규칙 정의
- **DoD**
  - [ ] 실패 시 errorReason 저장됨

### T5-2. @Async 실행기 + ThreadPool 제한 [P0]
- [ ] `ThreadPoolTaskExecutor` 구성(core=2, max=4 등)
- [ ] 동시성 제한(필요 시 세마포어)
- **DoD**
  - [ ] 렌더 요청 폭주 시 서버 과부하 완화

### T5-3. Render API(생성/조회/재시도) [P0]
- [ ] `POST /api/v1/render/personal/{projectId}`
- [ ] `POST /api/v1/render/group/{groupId}`
- [ ] `GET /api/v1/render/jobs/{jobId}`
- [ ] `POST /api/v1/render/jobs/{jobId}/retry`
- **DoD**
  - [ ] 실패 시 재시도 가능

### T5-4. Render 결과 download-url(presigned) API [P0]
- [ ] `GET /api/v1/render/jobs/{jobId}/download-url`
- **DoD**
  - [ ] SUCCEEDED만 URL 발급

### T5-5. 앱 재기동 복구(최소) [P0]
- [ ] STARTUP 시 RUNNING job을 FAILED 또는 QUEUED로 정리(정책 택1)
- **DoD**
  - [ ] 영원히 RUNNING인 job 제거

---

## Epic 6. 개인 렌더링 — Java2D 이미지 합성 (P0)

### T6-1. 렌더 입력 수집(S3 → temp) [P0]
- [ ] frame asset들을 `getObject`로 다운로드하여 temp 저장
- **DoD**
  - [ ] 모든 입력 이미지 확보 실패 시 FAILED 처리

### T6-2. Java2D 합성(Story 9:16 고정) [P0]
- [ ] 출력: 1080x1920 PNG(또는 JPG)
- [ ] 규칙
  - gridType에 맞게 cell 배치(2x2, 3x3)
  - center-crop 후 배치
  - 프리셋(단순): 배경/여백/테두리 + 타이포 1줄 + 스티커 1개(리소스)
- **DoD**
  - [ ] 4장/9장 입력으로 이미지 생성 성공

### T6-3. 결과물 S3 업로드 + RenderJob outputKey 기록 [P0]
- [ ] key: `renders/{projectId}/{jobId}.png`
- **DoD**
  - [ ] download-url로 이미지 접근 가능

---

## Epic 7. 그룹 템플릿 — DayShare(생성/초대/멤버) (P0)

### 데이터 모델
- `Group(id, projectId, name, memberCount, inviteCode, createdAt)`
- `GroupMember(groupId, userId, role(OWNER|MEMBER), joinedAt)`

### T7-1. Group 생성 API + Project 연결 [P0]
- [ ] `POST /api/v1/groups` (name, memberCount)
- [ ] Group + GroupMember(owner) 생성
- **DoD**
  - [ ] inviteCode 발급

### T7-2. 초대코드 유니크 생성/충돌 처리 [P0]
- [ ] 6~8자리 영숫자
- **DoD**
  - [ ] 중복 없이 생성됨

### T7-3. Join API(초대코드) + 정원 체크 [P0]
- [ ] `POST /api/v1/groups/join` (inviteCode)
- [ ] 정원 초과 409, 중복 가입 방지
- **DoD**
  - [ ] 멤버 가입/권한 반영

### T7-4. 그룹 권한 가드(멤버만) 공통화 [P0]
- [ ] `requireGroupMember(groupId, userId)` 유틸/서비스
- **DoD**
  - [ ] 비멤버 접근 403

---

## Epic 8. 슬롯/업로드/제출현황 (P0)

### 데이터 모델
- `Slot(id, groupId, timeLabel, dueAt, orderIndex)`
- `SlotUpload(slotId, userId, assetId, status(UPLOADED|MISSING), updatedAt)`

### T8-1. Slot CRUD + reorder API [P0]
- [ ] `POST /api/v1/groups/{groupId}/slots`
- [ ] `PUT/DELETE /api/v1/groups/{groupId}/slots/{slotId}`
- [ ] `PUT /api/v1/groups/{groupId}/slots/reorder` ([slotId...])
- **DoD**
  - [ ] 추가/삭제/정렬 가능

### T8-2. 슬롯 업로드 바인딩 API(각 slot-user 1개) [P0]
- [ ] `PUT /api/v1/groups/{groupId}/slots/{slotId}/upload` (assetId)
- [ ] 덮어쓰기 허용
- **DoD**
  - [ ] SlotUpload가 최신 asset으로 갱신됨

### T8-3. 제출현황(progress) API(매트릭스) [P0]
- [ ] `GET /api/v1/groups/{groupId}/progress`
- [ ] 반환: slots, members, matrix(UPLOADED/MISSING)
- **DoD**
  - [ ] 미제출자 산출 가능

### T8-4. 그룹 start API(상태 IN_PROGRESS 전환) [P0]
- [ ] `POST /api/v1/groups/{groupId}/start`
- **DoD**
  - [ ] 그룹 상태가 IN_PROGRESS로 전환됨

---

## Epic 9. 그룹 미리보기(간단) (P0)

### T9-1. Preview API(그리드 UI용) [P0]
- [ ] `GET /api/v1/groups/{groupId}/preview`
- [ ] 반환
  - slots(정렬), members
  - cell별 assetId + presigned url(가능할 때)
  - missing placeholder 정보
- **DoD**
  - [ ] 프론트가 “현재까지 업로드된 배치” UI 구현 가능

---

## Epic 10. 그룹 Export — FFmpeg 합본 (P0)

### T10-1. ffmpeg 환경 체크/가이드 [P0]
- [ ] 앱 시작 시 `ffmpeg -version` 체크(실패 시 명확한 에러)
- **DoD**
  - [ ] 환경 미구성 시 Export 시도하면 FAILED + errorReason

### T10-2. Export 규칙 고정(단순) 확정 [P0]
- [ ] 출력: 720x1280 MP4, 30fps
- [ ] 슬롯 1개 = 3초 세그먼트
- [ ] row = 멤버 수, cell = scale/crop
- [ ] missing cell: 단색 + “MISSING”
- **DoD**
  - [ ] 규칙이 문서화되어 프론트/QA가 검증 가능

### T10-3. 입력 영상 준비(S3 → temp) + placeholder 생성 [P0]
- [ ] 필요한 업로드 영상만 다운로드
- [ ] 없는 cell은 placeholder 영상/이미지 생성
- **DoD**
  - [ ] ffmpeg 입력 파일 세트가 준비됨

### T10-4. filter_complex 생성/실행 + 실패 처리 [P0]
- [ ] slot별 stack(세로) → slot concat
- [ ] 실패 시 errorReason 저장
- **DoD**
  - [ ] 최소 케이스(2명/2슬롯)로 mp4 생성 성공

### T10-5. 결과물 S3 업로드 + job 완료 처리 [P0]
- [ ] key: `renders/{projectId}/{jobId}.mp4`
- **DoD**
  - [ ] download-url로 mp4 접근 가능

---

## Epic 11. 채팅(REST 폴링) (P1)

### 데이터 모델
- `ChatMessage(id, groupId, userId, body, createdAt)`

### T11-1. 채팅 send/list API [P1]
- [ ] `POST /api/v1/groups/{groupId}/chat`
- [ ] `GET /api/v1/groups/{groupId}/chat?cursor=&limit=50`
- **DoD**
  - [ ] 2~3초 폴링으로 채팅 구현 가능

---

## Epic 12. 보관 정책/만료 처리 (P1)

### T12-1. TTL 정책 확정 + expiresAt 적용 [P1]
- [ ] 초기 권장: 14일(설정값으로)
- **DoD**
  - [ ] 생성 시 expiresAt 세팅

### T12-2. 만료 배치(프로젝트 EXPIRED) [P1]
- [ ] `@Scheduled` daily로 expiresAt 지난 프로젝트 EXPIRED 전환
- **DoD**
  - [ ] Projects 탭에서 만료 상태 표시 가능

### T12-3. S3 객체 정리 배치(선택) [P2]
- [ ] EXPIRED 후 N일 지나면 assets/renders 삭제
- **DoD**
  - [ ] 비용/용량 관리 가능

---

## Epic 13. 권한/보안/운영 품질 (P0~P1)

### T13-1. 권한 체크 표준화(Project/Group/Asset/Render) [P0]
- [ ] Project: 소유자만
- [ ] Group: 멤버만
- [ ] Asset/Render presign 발급: 소유자 또는 그룹멤버만
- **DoD**
  - [ ] 권한 위반 403 일관 처리

### T13-2. CORS allowlist 설정 [P0]
- [ ] dev/prod 프론트 도메인 허용
- **DoD**
  - [ ] 브라우저에서 API 호출 가능

### T13-3. Validation 강화(입력값) [P1]
- [ ] group name 길이, memberCount 범위, dueAt 유효성 등
- **DoD**
  - [ ] 잘못된 입력 400 + 상세 메시지

### T13-4. 로깅(MDC requestId) + 렌더 실패 로깅 [P1]
- [ ] requestId 생성/전파
- [ ] Render 실패 사유 로깅
- **DoD**
  - [ ] 장애 원인 추적 가능

### T13-5. 헬스체크/actuator(선택) [P1]
- [ ] `/actuator/health`
- **DoD**
  - [ ] 운영 모니터링 기본 준비

---

## Epic 14. 템플릿 카탈로그 (P0)

> HomeScreen 카테고리 필터(전체/스토리/피드/그룹/트렌딩) + 검색 UI 지원

### 데이터 모델
- `Template(id, type(COLORWORK|DAYSHARE), title, category, tags, description)`
- MVP: 2개 고정(Colorwork, DayShare) — DB 시드 or 설정 파일로 관리

### T14-1. Template 엔티티 + 초기 데이터 시드 [P0]
- [ ] Template 엔티티/Repo 구현
- [ ] data.sql 또는 `@PostConstruct` 시드: Colorwork, DayShare 2개
- **DoD**
  - [ ] 앱 기동 시 템플릿 2개 DB에 존재

### T14-2. 템플릿 목록 API(카테고리/검색 필터) [P0]
- [ ] `GET /api/v1/templates?category=&keyword=`
- [ ] category 없으면 전체 반환
- [ ] keyword는 title, tags, description 대상 LIKE 검색(MVP 단순 구현 OK)
- **DoD**
  - [ ] HomeScreen 카테고리 탭 + 검색 UI 동작 가능

### T14-3. 템플릿 상세 API [P0]
- [ ] `GET /api/v1/templates/{templateType}`
- **DoD**
  - [ ] 템플릿 선택 후 상세 정보 표시 가능

---

## Epic 15. 스크랩/북마크 (P1)

> HomeScreen TemplateCard 하트 버튼 + MyPage 스크랩 갤러리 지원

### 데이터 모델
- `UserScrap(userId, templateType, scrapedAt)` — userId+templateType 복합 유니크

### T15-1. UserScrap 엔티티/Repo [P1]
- [ ] 복합 유니크 인덱스(userId, templateType)
- **DoD**
  - [ ] 스크랩 상태 저장/조회 가능

### T15-2. 스크랩 추가/취소 API [P1]
- [ ] `POST /api/v1/templates/{templateType}/scrap`
- [ ] `DELETE /api/v1/templates/{templateType}/scrap`
- [ ] 중복 스크랩 409, 없는 스크랩 취소 404
- **DoD**
  - [ ] 하트 버튼 토글 동작 가능

### T15-3. 내 스크랩 목록 API [P1]
- [ ] `GET /api/v1/me/scraps`
- [ ] 반환: 스크랩한 templateType 목록 + 각 Template 정보
- **DoD**
  - [ ] MyPage 스크랩 갤러리 UI 구현 가능

---

## Epic 16. 인앱 알림 (P1)

> HomeScreen 알림 벨 + 알림 드로어(읽음/안읽음 목록) 지원

### 데이터 모델
- `UserNotification(id, userId, type, referenceId, body, isRead, createdAt)`
- 알림 type 예시: `SLOT_DEADLINE_NEAR`, `SLOT_UPLOAD_DONE`, `GROUP_RENDER_DONE`

### T16-1. UserNotification 엔티티/Repo [P1]
- [ ] userId 인덱스(조회 성능)
- **DoD**
  - [ ] 알림 저장/조회 가능

### T16-2. 알림 조회/읽음 처리 API [P1]
- [ ] `GET /api/v1/notifications` (읽음/안읽음 목록, cursor 페이징)
- [ ] `PUT /api/v1/notifications/{id}/read`
- [ ] `PUT /api/v1/notifications/read-all`
- **DoD**
  - [ ] 알림 드로어 UI 구현 가능(읽음/안읽음 분기)

### T16-3. 알림 생성 트리거 [P1]
- [ ] 슬롯 업로드 완료 시 → 그룹 OWNER에게 알림(`SLOT_UPLOAD_DONE`)
- [ ] 그룹 렌더 완성 시 → 전체 멤버에게 알림(`GROUP_RENDER_DONE`)
- [ ] 슬롯 마감 임박(dueAt 24h 전) → 미제출 멤버에게 알림(`SLOT_DEADLINE_NEAR`) — `@Scheduled`
- **DoD**
  - [ ] 각 이벤트 발생 시 알림 row 생성됨

---

## 구현 순서(권장 마일스톤)
### Milestone A (개인 end-to-end 결과 먼저) — P0
1) Auth(OAuth2+JWT+Refresh) + User 프로필 확장(T1-8~T1-11)
2) **템플릿 카탈로그(Epic 14)** — HomeScreen 동작 필수
3) S3 Upload + Asset download-url
4) Projects 리스트/상세(InProgressScreen + RecentScreen)
5) Colorwork config/frames
6) Personal Render(Java2D) + RenderJob + download-url

### Milestone B (그룹 end-to-end 결과) — P0
7) Group(DayShare) 생성/초대/join
8) Slot CRUD/reorder/start
9) SlotUpload + progress
10) Preview
11) Export(FFmpeg) + RenderJob

### Milestone C (운영 UX/정리) — P1
12) Chat(폴링)
13) 스크랩/북마크(Epic 15)
14) 인앱 알림(Epic 16)
15) TTL 만료/정리
16) 로깅/헬스

---

## V1 백로그(이번 MVP 제외)
- PWA/Web Push 알림(구독 저장/발송/VAPID/스케줄러/정책/중복 방지)
- 미제출자 스마트 리마인드
- 업로드 품질 검사 강화(어두움/가로/길이 초과 트림)
- 결과물 규격 확장(4:5, 1:1), 프리셋 다양화
- S3 lifecycle(수명주기) 규칙 기반 자동 정리(운영 비용 최적화)
