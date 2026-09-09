# 마니또 월드 (Manitto World) 스펙 문서

> 이 문서는 `frontend/src/prd.md` (PRD v1.3, 2026-05-17)와 `develop` 브랜치의 실제 구현 코드를 대조하여 작성한 **현행화 스펙**입니다.
> PRD는 최초 기획 의도를 담은 프로토타입 설계이고, 실제 구현은 백엔드 연동·실시간 동기화·인증샷 피드 등으로 상당히 확장되었습니다. 아래는 "지금 코드가 실제로 하는 일" 기준으로 정리했습니다.

- 관련 PRD: [`frontend/src/prd.md`](../frontend/src/prd.md)
- 프론트엔드: `frontend/src/features/manitto/`, 라우트 `frontend/src/app/(main)/manitto/`
- 백엔드: `backend/src/main/java/com/smoodee/manitto/`
- 별도 프로토타입(백엔드 미연동, 디자인 검수용): `frontend/src/features/manitto/ManittoDemo.tsx` (`/manitto-demo` 라우트), 원본 단일 파일 프로토타입은 `frontend/src/mock.jsx`

---

## 1. 개요

마니또 월드는 초대 코드로 모인 그룹이 익명으로 서로의 마니또가 되어 선물·메시지·힌트를 주고받고, 종료 시점에 서로의 정체를 추리·공개하는 실시간 소셜 미니게임이다. `/manitto?code={roomCode}` 단일 라우트에서 클라이언트 사이드 뷰 전환(`setup → lobby → room → result`, 부가로 `feed`)으로 전체 플로우를 구현한다.

PRD 대비 실제 구현에서 크게 추가된 축:
1. **실시간 동기화 레이어(SSE)** — 로비/룸 이벤트를 폴링 없이 push
2. **인증샷(자랑) 서브플로우** — 아이템 드롭 시 사진 첨부 → 마니띠 승인/거절 → 승인 시 방 전체 피드에 공개, 좋아요
3. **닉네임 시스템** — PRD의 "고유 이름"이 아니라 참가자가 직접 설정하는 별칭으로 대체
4. **오늘의 미션(로컬 전용)** — 서버 연동 없이 `localStorage`로 완료 상태 저장
5. **전체 결과 페어 공개 페이지** (`/manitto/result`) — 모든 마니또-마니띠 쌍과 교류량(아이템 수/방문 수) 공개

---

## 2. 전체 유저 플로우

```
[입장]
  코드 없이 진입 → CreateOrJoinScreen (방 만들기 / 코드로 입장)
  코드(?code=) 있음 → 방 상태 조회 → SETUP이면 setup, ACTIVE면 lobby

[SetupView] (SETUP 상태)
  닉네임 저장 → (호스트) 종료 시각 설정 + 참가자 2명 이상 확인 → 매칭 시작(startMatching)
  → 서버가 참가자를 셔플 후 순환(circular) 배정 → 방 상태 ACTIVE → 전원 SSE로 lobby 전환

[LobbyView] (ACTIVE 상태, 기본 화면)
  ┌ 카운트다운 타이머 / 결과보기 버튼
  ┌ "내 마니띠 방 가기" 카드 → RoomView(마니띠 방, isMine=false지만 canInteract=true)
  ┌ 오늘의 미션 아코디언 (로컬 상태)
  ┌ 인증 피드 진입 버튼 → FeedView
  ┌ 활성화된 방 그리드 (전원의 방 아이콘) → RoomView
  └ 새로운 소식 (방문 알림 + 아이템 알림 + 인증 승인요청)

[RoomView] (남의 방 / 내 방 공통 컴포넌트)
  - 남의 방 + canInteract(마니또↔마니띠 관계) → 바닥 클릭 시 PixelDropModal → 아이템 드롭
  - 내 방 → 사물함/바닥 아이템 열람, 방문자 발자국 확인, 방문자 있으면 인사 버블 수신
  - 인사 아이콘 클릭 → GREETING_PRESETS 5종 중 선택 → 2.5초 말풍선 + SSE 브로드캐스트

[DeductionModal] (HUD 상시 노출 버튼)
  1단계 지목 → 2단계 사유 작성 → 제출(submitDeduction) → "보류 안내" 화면
  * 서버는 결과 판정 여부를 절대 응답에 포함하지 않음 (getResult 호출 시에만 계산)

[ResultView] ("결과보기" 버튼으로 언제든 수동 진입)
  내 진짜 마니또 공개(플립카드) + 내 추리 성적표(성공/실패/미참여 3분기)
  + 나를 지목한 타인들의 사유(롤링페이퍼) + "전체 결과 보러가기"

[AllResultsPage] (/manitto/result?code=)
  이번 게임의 모든 마니또-마니띠 쌍 + 쌍별 아이템 교환 수 / 방문 횟수 공개
```

---

## 3. 화면별 상세 스펙

### 3.1 진입 화면 — `CreateOrJoinScreen` (`ManittoWorld.tsx` 내부)
- 로그인하지 않은 경우 생성/입장 버튼 비활성화, 클릭 시 `/login`으로 리다이렉트(PRD에 없는 인증 게이트)
- 방 만들기: 방 이름(선택, 30자) + 종료 기간(`DateTimePicker`) → `POST /rooms`
- 코드로 입장: 6자리 코드 입력(자동 대문자) → `POST /rooms/{code}/join` → `GET /rooms/{code}`

### 3.2 `SetupView` — 대기실 (PRD 3.1 대응)
- **닉네임 입력(신규)**: PRD에는 없던 요구사항. 참가자가 직접 별칭을 입력·저장(`PATCH /nickname`)해야 하며, 호스트는 **자신의 닉네임 저장 + 참가자 2명 이상**이어야 "매칭 시작" 버튼이 활성화된다.
- 참가자 리스트는 실시간이 아니라 `room-updated` SSE 수신 시 재조회로 갱신(F-102 대응, 폴링 아님).
- 초대 링크 복사는 실제로는 **URL이 아니라 6자리 코드 문자열**을 클립보드에 복사한다(F-103과 문구는 동일하나 대상이 링크가 아님). `navigator.clipboard` 실패 시 `document.execCommand('copy')` 폴백 사용.
- 종료 기간은 호스트만 설정 가능(로컬 상태로만 반영되며 별도 저장 API는 없음 — 실제로는 `createRoom` 시점의 `endDate`만 서버에 반영되고, Setup 화면에서의 재설정은 `startMatching` 시점에 서버로 전달되지 않는 점 확인 필요, §6 참고).

### 3.3 `LobbyView` — 메인 로비 (PRD 3.2 대응)
- 카운트다운 타이머(`CountdownTimer`)와 결과보기 버튼(F-201, F-202 그대로 구현).
- 오늘의 미션(F-203 "미션 리스트")은 서버에 존재하지 않는 **프론트 전용 로컬 데이터**(`MISSIONS` 상수, 3종: 방문/드롭/인사)이며 완료 여부는 `localStorage["manitto_missions_{roomCode}_{userId}"]`에 저장된다. 새로고침해도 유지되지만 다른 기기/브라우저와는 동기화되지 않는다.
- 알림 센터(F-203)는 서버의 `GET /notifications`(방문 로그 + 아이템 로그를 합쳐 시간순 정렬)와 실시간 SSE(`visitor-arrived`, `item-dropped`)를 병합해 표시.
- **인증 피드 진입 버튼(신규)**: PRD에 없는 기능. 승인된 인증샷 수를 배지로 표시.
- **미승인 인증 요청(신규)**: 내가 마니띠인 인증샷이 대기 중이면 알림 리스트 상단에 노출되고 탭하면 `CertApprovalModal`이 뜬다.

### 3.4 `RoomView` — 개인 방 (PRD 3.3, 3.4 대응)
- 벽면 액자 3종(하트/별/유령) 배치는 PRD F-302 규격과 동일하게 하드코딩 구현(중앙 상단/좌하단/우하단, 유령이 별보다 높게).
- 발자국(F-303): **내 방에서만** 서버가 24시간 이내 방문 기록(`GET /visits`)을 반환해 렌더링. 남의 방에 있을 때는 발자국을 그리지 않는다(방문자 관점에서는 비노출).
- 방문 기록 저장 로직(신규, PRD에 없음): 남의 방에 들어갈 때 좌표를 미리 계산해 두었다가, 그 방을 **나갈 때** `POST /visit`로 기록한다(`recordPendingVisit`). 자기 자신의 방 방문은 기록되지 않는다.
- 접근 제어(신규): `canInteractWithRoom = isMineRoom || activeRoomUserId === myTargetUserId`. 즉 **방 주인 본인**과 **그 방 주인의 마니또(나)** 만 아이템 상호작용 가능. 그 외 인원이 바닥 아이템 클릭 시 "접근 제한" 모달, 남의 마니또 사물함 아이템을 열려고 하면 "선물 전달 완료" 안내 모달이 뜬다. PRD 5장의 "격리 정책"이 여기서 프론트 가드로도 이중 구현됨.
- 아이템 드롭(F-401~403): 선물/메시지/힌트 3종, 선물·메시지만 스킨 3종 선택 가능(PRD와 동일). **인증샷 첨부(신규)**: 드롭 시 이미지를 선택하면 크롭(`ImageCropModal`, 1:1) 후 첨부 가능하고, "자랑해줘" 토글을 켜면 드롭 직후 `POST /items/{id}/certify`가 함께 호출된다.
- 인사말(F-304): `GREETING_PRESETS` 5종, 2.5초 노출은 PRD와 동일. 실제로는 로컬 표시뿐 아니라 SSE `greet-received` 이벤트로 상대방 화면에도 말풍선이 뜬다(PRD엔 없는 실시간 상호 인지).
- Presence(신규, PRD에 없음): 다른 유저가 내 방/상대 방에 실제 접속 중이면 회색 실루엣 캐릭터가 나타난다(`user-entered`/`user-left` SSE, `PUT/DELETE /presence`).

### 3.5 `DeductionModal` — 단계별 추리 (PRD 3.5 대응)
- 1단계 지목 → 2단계 사유 필수 입력 → 제출. 제출 후에는 재제출 불가(서버에서 이미 존재 시 400).
- 정답 여부 은닉 정책(F-502): 서버가 `submitDeduction` 응답에 정답 여부를 아예 포함하지 않으므로(단순 204 No Content) 클라이언트가 알 방법이 없다 — PRD 요구사항이 API 설계로 강하게 보장됨.
- 제출 완료 가이드 문구(F-503) 그대로 구현.

### 3.6 `ResultView` — 결과 발표 (PRD 3.6 대응)
- 내 진짜 마니또는 서버가 "나를 타겟으로 지목한 참가자"를 역산해서 알려준다(`realManittoName`).
- 3분기 성적표(F-602): 미참여(`guessedUserId == null`) / 성공(`isCorrect`) / 실패, PRD의 문구·배지 색상과 대응.
- 롤링페이퍼(F-603): 나를 지목했던 모든 참가자의 사유를 무기명이 아니라 **지목자 이름과 함께** 노출(`othersGuesses`) — PRD는 "친구들이 남긴 사유"라고만 되어 있어 실명 노출 여부가 명시적이지 않았는데, 구현은 실명(닉네임) 공개로 정해짐.
- **"전체 결과 보러가기"(신규)**: `/manitto/result`로 이동해 이번 게임의 모든 마니또-마니띠 쌍과 그 쌍의 아이템 개수·방문 횟수를 공개. PRD에 전혀 없는 기능.

### 3.7 `FeedView` / `CertApprovalModal` — 인증샷 피드 (신규, PRD에 없음)
- 아이템 드롭 시 첨부한 인증샷은 곧바로 공개되지 않고 `PENDING` 상태로 저장되어, 대상(마니띠)에게만 SSE `cert-pending`으로 알림이 간다.
- 마니띠가 `CertApprovalModal`에서 코멘트를 달아 승인하면 `APPROVED`로 전환되어 방 전체에 SSE `cert-approved`로 브로드캐스트되고 `FeedView`에 노출된다. 거절 시 `REJECTED`로 비공개 유지.
- 피드의 각 포스트는 좋아요 토글 가능(`POST /cert-posts/{id}/like`, 낙관적 업데이트 + 실패 시 롤백).

---

## 4. API 명세 (BASE: `/api/v1/manitto/rooms`)

| Method | Path | 설명 | 인증 필요 |
|---|---|---|---|
| GET | `/` | 내 마니또 방 목록(진행중만) | ✅ |
| POST | `/` | 방 생성 (호스트로 자동 참가) | ✅ |
| GET | `/{roomCode}` | 방 조회 (상태/참가자) | ❌ |
| GET | `/{roomCode}/events` | SSE 구독 | (토큰 쿼리 파라미터) |
| PATCH | `/{roomCode}/nickname` | 내 별칭 설정 | ✅ |
| POST | `/{roomCode}/join` | 방 참가 (SETUP 상태만) | ✅ |
| PATCH | `/{roomCode}/start` | 매칭 시작 (호스트 전용, 2명+) | ✅ |
| GET | `/{roomCode}/lobby` | 로비 데이터(내 타겟, 내 사물함) | ✅ |
| POST | `/{roomCode}/items` | 아이템 드롭 (ACTIVE 상태만) | ✅ |
| GET | `/{roomCode}/locker` | 내 사물함 조회 | ✅ |
| GET | `/{roomCode}/users/{targetUserId}/items` | 특정 유저 방의 아이템 조회 | ✅ |
| PATCH | `/{roomCode}/locker/{itemId}/store` | 아이템 사물함에 담기(소유자만) | ✅ |
| PATCH | `/{roomCode}/locker/{itemId}/open` | 아이템 열기(소유자만) | ✅ |
| POST | `/{roomCode}/deduction` | 추리 제출 (1회만) | ✅ |
| GET | `/{roomCode}/result` | 결과 조회 (실시간 판정) | ✅ |
| DELETE | `/{roomCode}` | 방 나가기 (호스트면 방 전체 삭제) | ✅ |
| PUT / DELETE | `/{roomCode}/presence` | 입장/퇴장 알림 | ✅ |
| POST | `/{roomCode}/greet` | 프리셋 인사 전송 | ✅ |
| POST | `/{roomCode}/visit` | 방문 기록 저장 | ✅ |
| GET | `/{roomCode}/visits` | 발자국 조회(24h 이내, 내 방 대상만) | ✅ |
| POST | `/{roomCode}/move` | 캐릭터 이동 브로드캐스트(SSE만, 저장 안 함) | ✅ |
| GET | `/{roomCode}/notifications` | 알림 로그(방문+아이템 합성) | ✅ |
| POST | `/{roomCode}/items/{itemId}/certify` | 인증샷 업로드(multipart) | ✅ |
| POST | `/{roomCode}/cert-posts/{postId}/approve` | 인증 승인(대상자 전용) | ✅ |
| POST | `/{roomCode}/cert-posts/{postId}/reject` | 인증 거절(대상자 전용) | ✅ |
| GET | `/{roomCode}/cert-posts` | 승인된 인증 피드 조회 | ✅ |
| POST | `/{roomCode}/cert-posts/{postId}/like` | 좋아요 토글 | ✅ |
| GET | `/{roomCode}/cert-posts/pending` | 내 미승인 인증 요청 목록 | ✅ |

> `moveCharacter`는 서버에 위치를 영속화하지 않고 SSE 브로드캐스트만 수행한다 — 현재 프론트 어디에서도 이 API를 호출하는 코드가 확인되지 않음(연동 미완/추후 실시간 캐릭터 이동 기능 예약으로 추정).

---

## 5. 실시간 이벤트 (SSE, `/{roomCode}/events`)

| 이벤트 | payload | 트리거 | 클라이언트 반응 |
|---|---|---|---|
| `room-updated` | - | 참가/매칭 시작 | 방 재조회, ACTIVE면 로비 데이터까지 로드 |
| `user-entered` / `user-left` | `{ userId }` | presence 등록/해제 | 방문자 실루엣 표시 토글 |
| `greet-received` | `{ fromUserId, text }` | 인사 전송 | 2.5초 말풍선 표시 |
| `visitor-arrived` | `{ text, time }` | 타인이 내 방 방문 기록 | 알림 리스트에 추가 |
| `nickname-updated` | `{ userId, nickname }` | 닉네임 저장 | 참가자 목록 갱신 |
| `item-dropped` | `{ text, time, targetUserId, item }` | 아이템 드롭 | 알림 추가 + (대상 본인이면) 사물함 즉시 반영 |
| `cert-pending` | `CertPendingPayload` | 인증샷 업로드 | (대상 본인이면) 승인 대기 큐에 추가 |
| `cert-approved` | `ManittoCertPostResponse` | 인증 승인 | 피드에 즉시 추가 |
| `character-moved` | `{ userId, x, y }` | `/move` 호출 | (현재 프론트 리스너 없음) |

접속 시점에 서버가 현재 presence 목록을 즉시 `user-entered`로 재전송해 신규 구독자의 초기 상태를 맞춘다(`ManittoController.subscribeRoomEvents`).

---

## 6. 핵심 비즈니스 로직

- **매칭 알고리즘**: 참가자를 무작위로 셔플한 뒤 `i`번째가 `i+1`번째(마지막은 첫 번째로 순환)를 마니또 타겟으로 배정하는 단일 사이클 구조. N명이면 정확히 하나의 순환 고리가 생성되어 자기 자신을 지목하는 경우가 발생하지 않는다.
- **결과 판정 보류(F-502)**: `submitDeduction`은 정답 여부를 계산도, 응답도 하지 않는다. 정답 여부는 오직 `getResult` 호출 시점에 `realManitto`(나를 타겟으로 삼은 참가자)와 내 지목을 비교해 즉석 계산 — PRD의 "은닉 정책"이 데이터 설계 자체로 보장됨.
- **미참여 분기(F-503 하위, Technical Notes)**: `guessedUserId == null`이면 프론트가 전용 "미참여" UI를 렌더링. PRD가 요구한 `roomData` undefined 폴백(F-Technical Notes)은 현재 `loadRoom` 실패 시 에러 메시지와 함께 `create` 화면으로 되돌리는 방식으로 대체 구현되어 있고, PRD가 말한 "user1 방 데이터 폴백 렌더링"은 존재하지 않음(§7 참고).
- **아이템 접근 제어**: 소유자(`ownerUserId`)만 사물함 담기/열기 가능(서버 강제) + 프론트에서 마니또-마니띠 관계 기반 이중 가드.
- **방 삭제 정책**: 호스트가 나가면 방과 모든 하위 데이터(추리/아이템/방문)가 즉시 삭제되고, 일반 참가자가 나가면 본인 참가 레코드만 삭제.
- **표시 이름 규칙**: 닉네임이 설정되어 있으면 닉네임, 없으면 계정 실명(`userName`)을 노출(`displayName`).
- **미션(로컬)**: 서버 상태와 무관하게 클라이언트 로컬 판정 — "마니띠 방 방문", "드롭", "인사 보내기" 3종.

---

## 7. PRD 대비 상태 정리

| PRD 항목 | 상태 | 비고 |
|---|---|---|
| F-101 종료 기간 지정 | ✅ 구현 | 방 생성 시에만 명확히 반영, Setup 화면 재설정 값의 서버 반영 여부는 재검토 필요 |
| F-102 참가자/READY | ⚠️ 부분 구현 | READY 배지는 상시 표시(모든 참가자가 참가 즉시 ready)로 단순화, PRD의 "대기 중 미준비" 상태 없음 |
| F-103 초대 링크 복사 | ⚠️ 변경 | 링크가 아니라 6자리 코드 복사 |
| F-201 카운트다운 | ✅ 구현 | |
| F-202 결과보기 강제 트리거 | ✅ 구현 | |
| F-203 미션/알림 | ⚠️ 변경 | 미션은 로컬 전용, 알림은 서버 로그 기반으로 구현 |
| F-301~304 룸 데코/인사 | ✅ 구현 | 인사는 SSE로 실시간 확장됨 |
| F-401~403 아이템 드롭 | ✅ 구현 + 확장 | 인증샷 첨부 서브플로우 추가 |
| F-501~503 추리 | ✅ 구현 | |
| F-601~603 결과 발표 | ✅ 구현 + 확장 | 전체 쌍 공개 페이지 추가 |
| 기술 노트 — 격리 정책 | ✅ 구현 | API 설계 + 프론트 가드 이중 보장 |
| 기술 노트 — undefined 방 폴백 | ❌ 미구현 | user1 폴백 대신 에러 화면으로 대체 |
| (신규) 실시간 SSE 레이어 | 🆕 | PRD에 없던 전면 확장 |
| (신규) 인증샷 승인/피드/좋아요 | 🆕 | PRD에 없던 전면 확장 |
| (신규) 닉네임 시스템 | 🆕 | PRD에 없던 요구사항 |
| (신규) 전체 결과 페어 페이지 | 🆕 | PRD에 없던 요구사항 |

---

## 8. 확인이 필요한 사항 (Open Questions)

1. Setup 화면에서 호스트가 종료 시각을 바꾸면(`onChangeEndDate`) 로컬 상태만 갱신되고 이를 서버에 반영하는 API 호출이 보이지 않는다 — 실제로 반영되는지 백엔드 확인 필요.
2. `moveCharacter` API와 `character-moved` SSE 이벤트가 정의되어 있으나 프론트 어디에서도 호출/구독하지 않는다 — 미완성 기능인지, 제거 대상인지 확인 필요.
3. 오늘의 미션이 로컬 저장이라 기기를 바꾸면 초기화된다 — 의도된 설계인지, 추후 서버 동기화 예정인지 확인 필요.
4. `ManittoDemo.tsx` / `/manitto-demo` 라우트와 `mock.jsx`는 실제 서비스 플로우와 분리된 정적 프로토타입으로 보인다 — 배포 대상에서 제외할지 정리 필요.
