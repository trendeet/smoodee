# Design System Skill

## Description
Trender 프로젝트의 디자인 시스템 가이드. UI 컴포넌트 생성, 스타일링, 레이아웃 작업 시 이 스킬의 토큰과 규칙을 따른다.

## Instructions

### Brand DNA
- 키워드: Warm · Playful · Friendly · Clean · Lightweight
- 화면은 화이트(bgBase) 중심으로 깨끗하게
- **Primary(파스텔 옐로)**: 큰 면적의 주요 액션/선택 상태에만 사용
- **Accent(파스텔 오렌지)**: 작고 확실한 포인트(아이콘, 뱃지, 좋아요)에 제한
- 구분은 secondary(연회색) + subtle border + soft shadow로 처리

### Design Tokens

#### Colors (Core)
| Token | Value | 용도 |
|-------|-------|------|
| `bgBase` | `#FFFFFF` | 기본 페이지 배경 |
| `textBase` | `#2A2A2A` | 기본 텍스트 |
| `secondary` | `#F3F4F6` | 서피스/입력/칩 기본 배경 |
| `primary` | `#FFF7DC` | 주요 CTA / 선택 상태 / 가이드 배너 |
| `accent` | `#FDBA74` | 포인트(아이콘/하트 fill/뱃지) |

#### Color Usage Rules
- **Primary**: CTA 버튼, 선택된 필터 칩, 주요 배너, focus ring 포인트
- **Accent**: 뱃지, 아이콘(Guide 등), 좋아요 활성, 상태 강조(작은 요소)
- **Secondary**: 검색창/입력/placeholder surface, skeleton loading, 영역 구분
- **TextBase**: 밝은 배경 위 기본 가독성 확보. 회색 텍스트는 gray-500/gray-600 범위에서만 사용
- primary가 매우 밝으므로 버튼 텍스트는 **반드시 textBase** 사용

#### Typography
- **Font family**: `-apple-system, BlinkMacSystemFont, Pretendard, "Segoe UI", Roboto, sans-serif`
- **Type Scale (Mobile-first)**:
  - Brand / Page Title: `text-2xl font-black tracking-tight`
  - Section Title: `text-lg font-bold`
  - Card Title: `text-sm font-bold leading-tight`
  - Body: `text-sm font-medium` 또는 `text-base font-normal`
  - Meta: `text-xs text-gray-500 font-medium`
  - Micro Label: `text-[10px] font-bold`
  - Hero Number: `text-4xl font-bold` (스탬프/진행률/리워드 등)

#### Spacing (4px grid)
- Tailwind 기본 스케일: 1=4px, 2=8px, 3=12px, 4=16px, 6=24px, 8=32px, 10=40px
- Page padding: `px-4` (16px)
- Section spacing: `mt-6`(24px) ~ `mt-8`(32px)
- Card padding: `p-4` (16px)
- Card gap: `gap-4` (16px)
- Sticky header: `bg-white/95 backdrop-blur-md border-b border-gray-100/50`

#### Safe Area
- `pb-safe`: 하단 safe-area 포함 padding 유지
- `safe-area-bottom`: 하단 최소 16px + safe-area

#### Radius
| Level | Class | 용도 |
|-------|-------|------|
| Pill | `rounded-full` | 칩, 아이콘 버튼 |
| XL | `rounded-3xl` | 템플릿 썸네일/주요 카드 |
| L | `rounded-2xl` | 검색창/배너/큰 컨테이너 |
| M | `rounded-xl` | 버튼/메뉴 아이템/카드 |
| S | `rounded-lg` | 작은 블록/스와치 |

#### Shadows
- `shadow-soft`: `0 8px 24px rgba(0,0,0,0.04)` — 카드/배너/선택 상태 강조(필요할 때만)
- `shadow-fab`: `0 8px 24px rgba(255, 247, 220, 0.8)` — FAB 전용(브랜드 시그니처)

### Components

#### Button
- **Base**: `rounded-xl font-bold transition-all active:scale-95`, 터치 타겟 확보 `py-3` 권장(≈44px)
- **Variants**:
  - Primary: `bg-primary text-textBase hover:bg-[#EADCA1] shadow-sm`
  - Secondary: `bg-secondary text-textBase hover:bg-gray-200`
  - Ghost: `bg-transparent text-gray-600 hover:bg-gray-50`
  - Outline: `border border-gray-200 text-gray-700 hover:bg-gray-50`
  - White: `bg-white text-textBase border border-gray-100 shadow-sm hover:bg-gray-100`
  - AI (limited): `bg-gradient-to-r from-accent to-primary text-textBase shadow-md`
- **Disabled**: `disabled:bg-gray-200 disabled:text-gray-400`
- **Loading**: 버튼 내부 스피너 `w-5 h-5 border-2 border-textBase/30 border-t-textBase rounded-full animate-spin mr-2`, 로딩 시에도 텍스트 유지(레이아웃 점프 방지)

#### Input (Search 포함)
- Surface: `bg-secondary`
- Shape: `rounded-2xl`
- Padding: `pl-11 pr-4 py-3.5`
- Focus: `focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white focus:border-primary`
- Border: 기본은 투명, focus 시만 드러나게
- 아이콘: 기본 `text-gray-400`, focus 시 `text-textBase`

#### Filter Chip
- Shape: `rounded-full`
- Default: `bg-white text-gray-500 border border-gray-200`
- Active: `bg-primary text-textBase border-primary shadow-soft`
- Padding: `px-4 py-2`
- Text: `text-xs font-bold`

#### Template Card
- Thumb: `rounded-3xl aspect-[4/5] bg-gradient-to-br ... ring-1 ring-gray-100 shadow-sm overflow-hidden`
- Title: `text-sm font-bold`, Meta: `text-xs text-gray-500`
- Interaction: `active:opacity-80 transition-opacity`
- Scrap(Heart): Container `bg-white/30~60 backdrop-blur-md rounded-full p-1.5`, Active fill `accent(#FDBA74)`

#### Toast
- Container: `bg-gray-900/90 backdrop-blur text-white rounded-full px-4 py-2.5 shadow-xl`
- Text: `text-sm font-medium`
- Position: `top-16 left-1/2 -translate-x-1/2`
- Success: `bg-primary` + 체크 아이콘 / Error: `bg-red-500` + 경고 아이콘

#### Drawer (Side Menu)
- Overlay: `bg-black/50 backdrop-blur-sm`
- Drawer: `bg-white rounded-r-[32px] shadow-2xl`
- Item Active: `bg-primary text-textBase shadow-soft font-bold`
- Item Default: `text-gray-600 hover:bg-gray-100 font-medium`
- Profile Logged-in: `avatar ring ring-2 ring-primary`
- Profile Logged-out: 안내 카드 `bg-secondary` + CTA `bg-primary`

#### FAB
- `w-14 h-14 rounded-full bg-primary text-textBase shadow-fab border-4 border-bgBase`
- Position: `bottom-8 left-1/2 -translate-x-1/2`
- Interaction: `active:scale-90`

### Global States

#### Loading Spinner
- Inline (버튼/작은 영역): `h-4 w-4`
- Section (리스트/카드): `h-6 w-6`
- Full-screen (페이지): `h-10 w-10`, `min-h-[60vh] flex items-center justify-center px-4`
- 스피너 + 텍스트 간격: `gap-2`
- 문구 톤: 짧고 안심 (예: "불러오는 중…", "업로드 중…")
- A11y: `role="status" aria-live="polite"`

#### Error Message
- **Inline**: 폼/검증 에러
- **Action Error**: Toast/Alert
- **Page Error State**: 아이콘(선택) + 제목 + 설명 + 버튼(재시도/홈)
  - Title: `text-base font-semibold`
  - Desc: `text-sm text-gray-600`
  - Container: `min-h-[60vh] flex items-center justify-center px-4`
  - Card: `w-full max-w-sm rounded-xl border p-4 bg-white`
  - Actions: Primary(재시도), Secondary(홈/뒤로), Tertiary(문의/코드 복사)

### Motion & Interaction
- `fade-in` 0.2s / `fade-in-down` 0.3s / `slide-up/right/left` 0.3s / Drawer slide 0.35s
- 주요 터치 요소: `active:scale-95` (버튼/배너/카드)
- Header: `bg-white/95 + backdrop-blur-md`로 레이어 분리
- 애니메이션은 짧고 가볍게, 과도한 탄성/흔들림 금지

### Tailwind Config (Canonical)
아래 토큰을 단일 소스로 유지한다.

```js
tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: '#FFF7DC',
        secondary: '#F3F4F6',
        accent: '#FDBA74',
        bgBase: '#FFFFFF',
        textBase: '#2A2A2A'
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Pretendard"', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 8px 24px rgba(0, 0, 0, 0.04)',
        fab: '0 8px 24px rgba(255, 247, 220, 0.8)',
      }
    }
  }
}
```

### Consistency Checklist
- Primary는 CTA/선택 상태 중심으로만 사용 (면적 과다 금지)
- Accent는 "포인트 1개" 룰 (아이콘/뱃지/좋아요 등)
- 카드/서피스는 화이트 + 얕은 border + shadow-soft(필요 시)로 통일
- 라운드는 XL 중심 (`rounded-xl/2xl/3xl`)
- 모든 비동기 요청에 Loading/Empty/Error 상태 제공
- 버튼 로딩 시 텍스트 유지 (폭/높이 점프 금지)
- Tailwind 토큰은 `primary/secondary/accent/bgBase/textBase`만 사용
- 모바일 퍼스트: 기본 `px-4`, 터치 타겟 최소 44px
