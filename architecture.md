# 퓨처나우 진단 플랫폼 — architecture.md

> 본 문서는 시스템의 **단일 진실(single source of truth)**이다.
> 확정된 모든 구조·계약·데이터 모델·보안 규칙·진단 사양이 여기 담긴다.
> 작업 중 결정·구현된 결과물의 설계는 반드시 이 문서에 반영한다.
> 보류·향후 항목은 `plan.md`, 작업 규율은 `CLAUDE.md`에 둔다.
>
> 문서 버전: v0.7 (거점=SAIL 승격 · 코어(CoreContext) 구현 · 가입-by-코드/Q1~Q3 확정 · B①·B②·B④ + 문항 원문 · AlertSignal(ADR-19) · 디자인 시스템 v1 구현(색 토큰·공용 UI 9종·응답 위젯 5종·ResponseRunner) / B③ 리포트 시각화 대기)

---

## 0. 문서 체계와 사용 규칙

| 파일 | 역할 | 변경 권한 |
|---|---|---|
| `architecture.md` | 확정 구조·계약·사양. 단일 진실 | 지휘부 승인 후 갱신. 구현 결과는 즉시 반영 |
| `plan.md` | 보류·향후 업그레이드·미해결 질문 | 자유 추가, 착수 시 architecture로 승격 |
| `CLAUDE.md` | 클로드코드 작업 규율 | 지휘부 |
| `design_system.md` | UI/UX 토큰·컴포넌트·시안 | **지휘부 확정 후 별도 전달** (현재 미존재) |

`/contracts` 폴더의 타입을 바꾸는 것은 시스템의 척추를 바꾸는 일이다. **계약 변경은 지휘부 승인을 받는다.**

---

## 1. 비전과 범위

퓨처나우는 여러 진단 서비스를 수용하는 **공용 플랫폼의 첫 번째 인스트루먼트**다. 백지에서 짓지 않고, 가장 성숙한 형제 시스템 SAIL의 아키텍처를 토대로 삼는다. 퓨처나우로 플러그인 계약을 실전 검증한 뒤, 검증된 계약 위로 SAIL을 이관한다.

운영 규모는 월 500명 이하·1회기 1그룹 10명 수준이다. 처리량이 아니라 **정밀·개방·검증**에 최적화한다.

서비스는 **3계층 구조**다.

| 계층 | 역할 | 코어 role |
|---|---|---|
| 운영자(본부) | 코치 승인·인스트루먼트 관리·전체 통계·민감정보 열람 | `admin` |
| 코치·강사 | 차수 개설·참여 관리·리포트 열람·돌봄 알림 수신 | `coach` |
| 참여자(멤버) | 진단 응답 | `user` |

코치는 코칭 전문가이나 온라인 시스템 초보자다. **코치 UX는 극단적으로 단순·안내형으로 짓는다.**

---

## 2. 아키텍처 개관 — 3층 모델

```
┌──────────────────────────────────────────────────────────┐
│  3층 — 진단별 전용 UX        퓨처나우 UX  │  SAIL UX        │  ← 진단마다 따로
├──────────────────────────────────────────────────────────┤
│  2층 — 진단별 전용 엔진      퓨처나우 엔진 │  SAIL 엔진      │  ← 코드 비공유
├──────────────────────────────────────────────────────────┤
│  ── 플러그인 계약(contract) ── 응답흐름·채점·리포트·알림 4종 │  ← 한 규격
├──────────────────────────────────────────────────────────┤
│  1층 — 공유 코어 런타임 (채점하지 않음)                     │  ← 한 번만 만듦
│       신원·계정 · 차수·코치·가입 · 응답봉투 · 알림·돌봄     │
│       공용 UI·디자인 토큰                                   │
├──────────────────────────────────────────────────────────┤
│  Supabase 공유 DB · Vercel — 동일 auth.users · 교차 자동 로그인 │
└──────────────────────────────────────────────────────────┘
```

**핵심 원리 (이것이 "질 저하 절대 금지"를 구조로 보장한다)**

1. **코어는 채점하지 않는다.** 코어는 신원·차수·코치·응답봉투·알림·공용UI를 *운영*하는 런타임(OS)이다. 채점 로직 한 줄도 코어에 두지 않는다.
2. **엔진은 쌓이지 않고 꽂힌다.** 퓨처나우 엔진과 SAIL 엔진은 코드를 한 줄도 공유하지 않는다. 둘 다 코어의 플러그인 계약을 *각자* 구현해 꽂는다. 상속(stack)이 아니라 플러그인(plug).
3. **메뉴는 콘솔 차원이다.** 한 플랫폼·한 로그인·한 콘솔 안에서 코치가 진단을 메뉴로 고른다. 고르는 순간 그 진단 전용 모듈이 작동한다. 아래(계정·차수·코치·알림)는 하나로 흐르고, 위(진단의 살)는 완전히 갈라진다.

### 2.1 빌드 전략 — "C를 전제로 한 A"

| 단계 | 전략 | 이유 |
|---|---|---|
| 현재 ~ 퓨처나우 1차 완성 | **A안**: 코어+퓨처나우 단일 레포·단일 작업공간(클코1) | 계약이 진화 중이고, 퓨처나우가 그 계약의 검증자다. 한 몸으로 움직여야 검증이 빠르다 |
| 계약 안정화 후 | **C안**: 코어를 독립 패키지로 추출 | 계약이 굳으면 병렬이 안전. SAIL·퓨처나우가 추출된 코어에 의존 |

지금부터 **폴더는 C를 전제로 분리**해 둔다(§4). 나중에 패키지로 떼어낼 때 이사가 쉽도록.

---

## 3. 기술 스택 (확정)

SAIL 노선을 채택한다. 형제 시스템 분석에서 검증된 조합이다.

| 영역 | 채택 | 비고 |
|---|---|---|
| 프레임워크 | Next.js 16 + React 19 + TypeScript | App Router. **확정 버전: Next 16.2.9 · React 19.2.4 · TS 5.** Next 16 규약: 세션 갱신 미들웨어는 `proxy.ts`(nodejs 런타임), `cookies()`/`headers()` **async** → core/auth 구현에 반영. **breaking change 다수 → CLAUDE.md §6** |
| 백엔드·DB | Supabase (Postgres + Auth + RLS) · @supabase/ssr 0.12 | **거점 확정: SAIL 프로젝트 `zdoytzmvcafcebytttrm` 승격**(ADR-13). 같은 `auth.users` 공유 → 교차 자동 로그인. SAIL(`sail-diagnosis`)·TCI 와 점진 통합 |
| 상태관리 | Zustand | SAIL 계승. *UI 단계에서 설치* |
| 시각화 | Recharts 3 | 레이더·막대·나침반 게이지. *UI 단계에서 설치* |
| 리포트 | @react-pdf/renderer | TCI 깊이 계승. 개인 분석보고서 다중 페이지. *UI 단계에서 설치* |
| 스타일 | Tailwind CSS 4 | 디자인 토큰 기반 |
| 애니메이션 | framer-motion | SAIL 계승 (절제 사용). *UI 단계에서 설치* |
| 검증(zod) | zod 4 | `answers`·`subjectProfile` 경계 검증(CLAUDE §9) |
| 테스트 | Vitest 4 (+ vite-tsconfig-paths) | 단위·로직·RLS 격리 테스트. 컴포넌트 렌더는 디자인 확정 후(jsdom) |
| AI 해석 | Claude API 게이트웨이 | 분석보고서 자동 문구. **위치는 plan.md 미결**(Railway vs Supabase Edge Function) |
| 배포 | Vercel | |

> **구현 메모(v0.2)**: 토대 단계에서는 **비시각 의존성만** 설치했다(Next·React·Tailwind 4·@supabase/ssr 0.12·zod 4·Vitest 4). UI 전용 라이브러리(Recharts·framer-motion·@react-pdf/renderer·Zustand)는 디자인 시스템 확정 단계에서 설치한다.

lifegraph의 Firebase는 **미채택**. 통합 시 Supabase로 이관(plan.md).

---

## 4. 코드베이스 구조 (C-ready)

```
/src
  /core                ← 1층 공유 런타임. 향후 독립 패키지로 추출
    /auth              인증·세션·현재 사용자
    /identity          users·role·신원 필수성 정책 강제
    /cohort            차수·가입코드·참여(enrollment)·코치 승인
    /response          응답 봉투 저장/조회 · 응답 러너(ResponseRunner)
    /alert             알림 전달·돌봄 명단
    /ui                공용 컴포넌트 (Button·Card·Slider·ProgressBar …)
  /contracts           ← A·B 계약 타입. 코어·진단이 공유(서로 직접 참조 금지)
    core-context.ts    A: CoreContext (코어 → 진단)
    instrument.ts      B: InstrumentModule 및 4종 플러그인 인터페이스
    domain.ts          공용 도메인 타입 (Role·Wave·CoreUser·ResponseEnvelope …)
  /instruments
    /futurenow         ← 퓨처나우 전용 엔진+UX (계약 구현체)
      flow.ts          B① 응답 스키마
      scoring.ts       B② 7규칙 채점
      report.tsx       B③ 화면·PDF·그룹 리포트
      alerts.ts        B④ Red Flag·돌봄 트리거
      schema.ts        answers·profile zod 스키마
      copy.ts          참여자 노출 문구(존대체)·리포트 명명(어휘 분리)
    (/sail)            ← 추후 이관 (plan.md)
/supabase
  /migrations          타임스탬프 마이그레이션 (절대 기존 파일 수정 금지)
```

**경계 규율**: `/core`는 `/instruments`를 참조하지 않는다. 진단도 코어를 직접 참조하지 않는다. 양쪽 다 `/contracts`만 바라본다. 이 한 겹이 나중에 레포를 갈라도 계약이 깨지지 않게 막는다.

---

## 5. 데이터 모델

### 5.1 신원 vs 진단별 참여 프로필 — 분리선 (ADR-02)

| 항목 | 자리(소유) | 저장 위치 | 성격 |
|---|---|---|---|
| 계정 신원(이메일·인증·role) | 코어 | `users` | 한 사람=한 계정, 전 진단 공유, 항구적 |
| 이름·전화번호 | **코어 공용 필드** | `users` / `user_contacts` | 항구적 신원, 한 번 받아 재사용. 필수성은 정책 |
| 닉네임 | 코어 | `users.nickname` | 표시명(실명일 수도 가명일 수도) |
| 차수 참여 | 코어 | `enrollments` | 참여자 ↔ 차수 |
| 연령대·신앙연수·작성일·참여계기 | **진단** | `responses.subjectProfile` | 응답 시점 스냅샷(불변) |
| 문항 응답 | 진단 | `responses.answers` | 코어 불가시 |

### 5.2 신원 필수성 정책 (ADR-03)

이름·전화번호는 공용 필드이되, 필수/선택은 **(진단 × 역할)** 정책으로 진단이 선언하고 코어가 강제한다.

| 필드 | 코치 | 참여자 | 운영자 |
|---|---|---|---|
| 이메일 | 필수 | 필수 | 필수 (코어 고정) |
| 이름 | 필수 | 선택 | 필수 |
| 전화번호 | 필수 | 선택 | 선택 |

참여자에게는 실명·전화를 **강제하지 않는다.** 퓨처나우가 실명제를 지향하더라도 코어가 참여자에게 실명을 강제하지 않는다(권장 수준). 실명제라는 진단별 정책은 진단 안에서 다룬다.

### 5.3 전화번호 — 민감 채널 (ADR-04)

전화번호 열람은 **운영자(admin) 전용**이다. 같은 차수 코치도, 다른 코치도 볼 수 없다(본인 것 제외). RLS는 행을 가리지 열을 못 가리므로, 전화번호를 **물리적으로 분리**한다.

- `users`에서 전화번호 제거 → `user_contacts` 테이블로 격리.
- 본인은 자기 번호 열람·수정. 운영자는 전체 열람. 코치 정책 없음 = 코치 전면 차단(상호 비열람 포함).
- `CoreUser` 타입에 `phone` 없음 → 진단 엔진·콘솔이 `currentUser()`로 전화번호를 받을 경로 자체가 없음. 접근은 `getPhone` 게이트 하나로 봉쇄.

### 5.4 코어 테이블 (초기 마이그레이션 사양)

SAIL의 검증된 스키마를 토대로 한다. 컬럼·정책의 출처는 SAIL `20260528*` 마이그레이션이다.

> **거점 확정·적용 완료 (directive 2026-06-26 · ADR-13~16)**: 거점 = **SAIL 프로젝트** `zdoytzmvcafcebytttrm` 를 승격(신규 프로젝트 미신설, 같은 `auth.users` 공유). 코어 테이블은 SAIL 의 기존 **`public` 스키마**에 둔다(구 "core 스키마 분리" ADR-11 **폐기**). `public.users` 를 **재사용**해 코어 신원으로 삼되 `full_name`→`name` 표준화·`phone` 분리(`user_contacts`)로 정비한다. 확정 실명: `users`·`user_contacts`·`cohorts`(`instrument_id` 보유)·`enrollments`·`responses`·`alerts`. SAIL 잔존 테이블 `groups`/`group_members`/`results` 는 유지(점진 통합 — 클로드3 조율). **마이그레이션 `20260626120000_core_platform_upgrade.sql` 은 거점에 적용 완료**(원격 version `20260626064658`).
>
> **참여 식별자 — `instrument_id` 규약**: 퓨처나우 = `'futurenow'`, SAIL = `'sail'`. 진단 간 격리는 `instrument_id` + 차수(코치) RLS 로 성립(ADR-14). 코어 신원 모델에는 `coach_applications` 가 포함되나, 본 승격 마이그레이션은 아직 만들지 않았다(코치 승인 흐름 구현 시 별도 마이그레이션).

```
users              -- auth.users 1:1. id·email·name·nickname·role(user/coach/admin)
user_contacts      -- 민감 신원 격리. user_id PK·phone. RLS: 본인+운영자만
cohorts            -- 코치 소유 차수. id·coach_id·instrument_id·name·code(가입코드)
                   --   ·status(active/archived)·max_members·expires_at
enrollments        -- 차수 참여 조인. (cohort_id, user_id) PK·joined_at
coach_applications -- 코치 자기등록 승인. status(pending/approved/rejected)
responses          -- 응답 봉투. id·instrument_id·cohort_id·user_id·wave
                   --   ·answers(JSONB)·subject_profile(JSONB)·created_at. immutable
alerts             -- Red Flag·돌봄. response_id·cohort_id·severity·reason. 점수·원문 미적재
```

**불변 원칙**: `responses`·`alerts`는 INSERT/SELECT만, UPDATE/DELETE 정책 없음(차단). SAIL의 immutable `results` 철학 계승.

**가입코드 형식**: 5자리 영숫자, 혼동 글자(0/O/1/I/L) 제외 (SAIL 계승).

### 5.5 가입·인증 흐름 (Q1~Q3 확정 · 2026-06-26)

plan Q1~Q3 을 확정한다(과거 plan.md §3 → 본 절로 승격).

| # | 결정 | 근거 |
|---|---|---|
| Q1 | **로그인 기반**(비로그인 미허용) | 실명제·인도자 전용. 현 RLS(`auth.uid()` 요구)와 일치 |
| Q2 | **차수 가입 시 계정 생성** | enrollment·응답이 `auth.uid()` 에 묶임 |
| Q3 | **페어링 키 = `user_id + cohort_id + instrument_id`**, `wave` 로 사전/사후 구분 | 로그인 기반 자연 키 |

**흐름**(`/join`): 코드 입력 → `previewCohortByCode`(차수 공개 메타) → 로그인/신규 가입 →
`enrollByCode`(정원·만료·중복 검사 후 `enrollments` INSERT) → `ResponseRunner`(saveResponse) →
**완료(§7.5)**. 현 RLS 가 이미 이 전제로 짜여 정책 변경이 없다.

완료 화면의 *갈망 거울*(②방향·③갈망·⑤믿음)은 **퓨처나우 인스트루먼트 소유**(`participantMirror(scores)`)이며,
앱 액션 `finalizeResponse` 가 채점(B②) 후 호출해 반환값에 실어 보낸다 — **CoreContext·InstrumentModule 인터페이스
무변경**(G1 보호, ADR-27). 참여자엔 측정·severity·돌봄 신호 0건(코치 경로 전용). 거울 산출 실패 시 ①헤더+④핸드오프만
보이는 우아한 저하. (남은 미결: plan Q4 리포트 열람 주체 · Q5 AI 문구 검수.)

**라우트 맵**(전부 기존 메서드 위 배선 — 계약 변경 0):
| 라우트 | 주체 | 데이터 |
|---|---|---|
| `/` | 방문자 | 현관 — 두 갈래(참여하기→/join · 인도자 로그인→/login). 정적, 데이터 없음 |
| `/home` | 멤버(user) | 멤버 랜딩(Step 1.1). 게이트: 미인증→/login·코치·운영자→/coach. 인사 + [코드로 세미나 참여]→/join + [내 차수]→/my/cohorts. 셸 헤더+로그아웃 |
| `/my/cohorts` | 멤버(user) | 내 차수 목록(Step 1.2). `listMyCohorts`(my_cohorts DEFINER RPC) — 차수명·코치명·status·사전/사후 진행. 미완→/join·완료→[내 리포트]. 게이트=/home 동일 |
| `/my/cohorts/[cohortId]/report` | 멤버(user) | 내 리포트 **순화 뷰**(Step 1.3, ADR-27/30). `listResponses`(본인 pre, responses_select self-read)→score→`participantMirror`→`MirrorView`. 측정·severity 0. 계약·DB 무변경(기존 조합) |
| `/login` | 코치/운영자 | `signInWithPassword` → `currentUser().role` → coach·admin=/coach, **user=/home**. 로그인 전용(가입은 /signup·/join) |
| `/signup` | 스태프/일반 | `signUp`(트리거가 users role=user 생성) → 세션 시 역할별 랜딩(멤버=/home). 확인 필요 시 안내. /login 상호 링크 |
| `/admin` | 운영자 | `listUsers` + 멤버 역할 직접 변경(`setUserRole`→set_user_role RPC). 운영자 게이트(§8.6 첫 조각) |
| `/join` | 참여자 | preview→enroll→runner→finalize(거울). 코드 진입(참여자 가입 결속) |
| `/coach` | 코치/운영자 | `listCohortsByCoach` + 차수별 `buildCohortRoster`(먼저 챙길 분=`listAlerts` care/red_flag) |
| `/coach/new` | 코치/운영자 | `createCohort` |
| `/coach/cohort/[cohortId]` | 코치/운영자 | `getCohort`·`listEnrollments`·`listResponses`·`listAlerts`·`listCohortMembers` → 3숫자·3묶음 + 관리(마감·정원=`updateCohort`) |
| `/coach/cohort/[cohortId]/report/[responseId]` | 코치/운영자 | `getResponse`→B② `score`→`ReportScreen`(재사용). 접근=responses RLS(차수 코치+운영자+본인). 참여자 UI 경로 없음 |

---

## 6. 보안·RLS

### 6.1 SECURITY DEFINER 헬퍼 (ADR-05) — SAIL 핫픽스 계승

RLS 정책이 서로의 테이블을 참조하면 무한 재귀(Postgres 42P17)가 난다. SAIL이 이미 겪고 해결했다. **권한 판정을 `SECURITY DEFINER` 함수로 감싸 재귀를 끊는다.** 이 패턴을 그대로 계승한다.

```
is_admin(uid) · is_group_coach(group_id, uid) · is_group_member(group_id, uid) · user_role(uid)
-- 모두 SECURITY DEFINER, STABLE, SET search_path=public. anon·authenticated 에 EXECUTE 부여.
```

> **구현 주 (ADR-13~16, 적용됨)**: 헬퍼는 SAIL 의 기존 **`public` 스키마**에 둔다(구 ADR-11 의 `core` 스키마안 폐기). 기존 SAIL 헬퍼 `is_admin`·`user_role`·`is_group_coach`·`is_group_member`(SAIL `groups` 용)는 **재사용**하고, 차수(cohort)용 신규 헬퍼 `is_cohort_coach`·`is_cohort_member`·`resolve_cohort_by_code` 를 더한다(모두 `SECURITY DEFINER`, `SET search_path=public`, `anon·authenticated` EXECUTE). 코어 RLS(`cohorts`·`enrollments`·`responses`·`alerts`)는 이 cohort 헬퍼를 호출한다. `resolve_cohort_by_code(code)` 는 차수 **UUID** 를 반환한다(비참여자 가입용; 이후 `enrollments` INSERT 로 가입). SAIL 전화 헬퍼 `email_by_phone`·`phone_exists` 는 `user_contacts` 기준으로 재지정돼 SAIL 전화 로그인을 보존한다(ADR-16).

### 6.2 가시성 매트릭스 (ADR-06)

| 데이터 | 본인 | 같은 차수 코치 | 다른 코치 | 운영자 |
|---|---|---|---|---|
| 이름·닉네임 | ○ | ○ | ✕ | ○ |
| **전화번호** | ○(본인) | ✕ | ✕ | ○ |
| 응답·점수 | ○(본인) | ○ | ✕ | ○ |
| 알림·돌봄 | — | ○ | ✕ | ○ |

**실명제·인도자 전용**: SAIL의 익명 URL 공유 모델(`user_id IS NULL` 허용 SELECT 절)은 **제거**한다. 퓨처나우 응답은 본인·같은 차수 코치·운영자만 본다.

---

## 7. 작업 A — 코어 경계 (CoreContext)

방향: **코어 → 진단** (코어가 제공하는 서비스 표면). 진단 엔진은 이걸 호출만 한다.

```ts
// /contracts/domain.ts
type Role = 'user' | 'coach' | 'admin';
type Wave = 'pre' | 'post' | null;            // 단발 진단은 null
type InstrumentId = string;                    // 'futurenow' | 'sail' | …
type FieldRequirement = 'required' | 'optional' | 'hidden';

interface CoreUser {
  id: string;                 // auth.users.id
  email: string;              // 전 역할 필수
  name: string | null;        // 공용 필드, 필수성은 정책이 결정
  nickname: string | null;
  role: Role;
  // phone 없음 — 민감 채널로 분리(getPhone 게이트로만 접근)
}

interface IdentityPolicy {
  byRole: Record<Role, { name: FieldRequirement; phone: FieldRequirement }>;
  // email은 항상 required라 정책 대상 아님
}

interface Cohort {
  id: string;
  coachId: string;
  instrumentId: InstrumentId;
  name: string;
  code: string;
  status: 'active' | 'archived';
  maxMembers: number;
  expiresAt: string | null;
}

interface Enrollment { cohortId: string; userId: string; joinedAt: string; }

// 가입 결정용 차수 공개 메타(Cohort 도메인 밖 — coachName·memberCount 포함, 민감정보 미포함). ADR-22
interface CohortPreviewMeta {
  id: string; name: string; coachName: string | null; instrumentId: InstrumentId;
  memberCount: number; status: 'active' | 'archived'; expiresAt: string | null;
}

interface ResponseEnvelope<TAnswers = unknown, TProfile = unknown> {
  id: string;
  instrumentId: InstrumentId;
  cohortId: string | null;
  userId: string | null;      // 실명제 진단은 NOT NULL을 진단이 강제
  wave: Wave;
  answers: TAnswers;          // 진단 소유 — 코어 불가시
  subjectProfile: TProfile;   // 진단별 참여 프로필 — 진단 소유
  createdAt: string;
}

interface SaveResponseInput<TAnswers, TProfile> {
  instrumentId: InstrumentId;
  cohortId: string | null;
  userId: string | null;
  wave: Wave;
  answers: TAnswers;
  subjectProfile: TProfile;
}

interface AlertInput {
  responseId: string;
  cohortId: string;
  severity: 'info' | 'care' | 'red_flag';
  reason: string;             // 진단이 명명 (예: '활력 위기신호')
  // 점수·원문은 싣지 않는다 — 측정/강의 어휘 분리. 맥락은 코치 콘솔에서만.
}

// 읽기용 알림(인도자 콘솔의 '먼저 챙길 분'). AlertInput(쓰기)에 id·createdAt 부가. ADR-23
// 돌봄 신호의 **저장된 출처** — 재채점으로 재유도하지 않는다(drift 방지).
interface Alert {
  id: string; responseId: string; cohortId: string | null;
  severity: 'info' | 'care' | 'red_flag'; reason: string; createdAt: string;
}

// 차수 멤버 최소 참조(id+name만). cohort_member_directory(DEFINER) RPC — users RLS 미확대, 최소 노출. ADR-24
interface MemberRef { userId: string; name: string | null; }

// 코치 신청(USER→COACH 승격 대기). 본부 §8.6 [승인 대기]. 읽기=운영자 전용, 결정=decide_coach_application RPC(원자 승격). ADR-24
interface CoachApplication {
  id: string; userId: string; applicantName: string | null;
  status: 'pending' | 'approved' | 'rejected';
  motivation: string | null; reviewedBy: string | null; reviewedAt: string | null;
  reviewNote: string | null; createdAt: string;
}
```

```ts
// /contracts/core-context.ts
interface CoreContext {
  // 인증·신원
  currentUser(): Promise<CoreUser | null>;
  requireRole(role: Role): Promise<void>;   // 비동기(ADR-18) — 현재 사용자 해석 후 역할 검사

  // 민감 채널 — 운영자 또는 본인만 성공. 그 외 호출 시 코어가 차단
  getPhone(userId: string): Promise<string | null>;
  setPhone(userId: string, phone: string): Promise<void>;

  // 차수·참여
  previewCohortByCode(code: string): Promise<CohortPreviewMeta | null>; // 가입 결정용 공개 메타(coachName·memberCount). ADR-22
  resolveCohortByCode(code: string): Promise<Cohort | null>;   // 차수 도메인 본체(가입-후/코치 경로)
  enrollByCode(code: string): Promise<Enrollment>;             // 코드로 현재 사용자를 차수에 가입(ADR-17)
  createCohort(input: { name: string; instrumentId: InstrumentId; maxMembers?: number; description?: string; expiresAt?: string | null }): Promise<Cohort>; // 차수 개설(코치/운영자). 앱측 코드 생성+재시도, DDL 0. ADR-25
  updateCohort(cohortId: string, patch: { name?: string; description?: string | null; maxMembers?: number; status?: 'active' | 'archived'; expiresAt?: string | null }): Promise<Cohort>; // 차수 부분수정(코치/운영자). coach_id·instrument_id·code·id 불변. ADR-26
  getCohort(cohortId: string): Promise<Cohort>;
  listCohortsByCoach(coachId: string): Promise<Cohort[]>;       // 코치 차수 목록(콘솔 홈). RLS: 본인/운영자. ADR-23
  listCohortMembers(cohortId: string): Promise<MemberRef[]>;    // 차수 멤버 id+name(코치/운영자). RPC cohort_member_directory. ADR-24
  listEnrollments(cohortId: string): Promise<Enrollment[]>;

  // 응답 봉투 (answers·profile 타입은 진단이 지정)
  saveResponse<A, P>(input: SaveResponseInput<A, P>): Promise<string>;
  getResponse<A, P>(responseId: string): Promise<ResponseEnvelope<A, P>>;
  listResponses<A, P>(query: {
    instrumentId: InstrumentId;
    cohortId?: string;
    userId?: string;
    wave?: Wave;
  }): Promise<ResponseEnvelope<A, P>[]>;

  // 알림 (진단이 트리거, 코어가 전달)
  raiseAlert(input: AlertInput): Promise<void>;
  listAlerts(cohortId: string): Promise<Alert[]>;              // '먼저 챙길 분'의 저장된 출처. RLS: 차수 코치/운영자. ADR-23

  // 본부 — 코치 신청 승인/거절(USER→COACH 승격). 운영자 전용.
  listCoachApplications(status?: 'pending' | 'approved' | 'rejected'): Promise<CoachApplication[]>; // 운영자 전용. ADR-24
  decideCoachApplication(input: { applicationId: string; decision: 'approved' | 'rejected'; note?: string }): Promise<void>; // RPC decide_coach_application(원자 승격). ADR-24
}
```

---

## 8. 작업 B — 플러그인 계약 4종

방향: **진단 → 코어** (코어가 진단에게 요구하는 구현). 진단은 아래 `InstrumentModule`을 코어에 등록한다.

```ts
// /contracts/instrument.ts
type AnswerValue = number | string | boolean | null;
type Answers = Record<string /* item.code */, AnswerValue>;

interface InstrumentModule<A = Answers, P = unknown, S = unknown> {
  id: InstrumentId;
  identityPolicy: IdentityPolicy;    // §5.2
  flow: ResponseFlowPlugin;          // B①
  scoring: ScoringPlugin<A, S>;      // B②
  report: ReportPlugin<S>;           // B③
  alerts: AlertPlugin<S>;            // B④
  answersSchema: unknown;            // zod — A 경계 검증
  profileSchema: unknown;            // zod — P 경계 검증
}
```

### 8.1 B① 응답 흐름 계약 (확정)

설계 원칙: **선언형 우선 + 탈출구.** 진단은 문항·척도·블록을 *선언*만 하고, 코어 러너가 위젯·제약무작위·진행저장·재개·검증·접근성을 수행한다. 표준 위젯으로 안 되는 블록(향후 라이프커브)은 `CustomBlock`으로 내려간다.

```ts
// /contracts/instrument.ts (B①)
type ScaleKind = 'bipolar' | 'likert' | 'numeric' | 'text' | 'check';
interface BipolarScale { kind: 'bipolar'; points: number; leftLabel: string; rightLabel: string; }
interface LikertScale  { kind: 'likert';  points: number; minLabel: string; maxLabel: string; centerLabel?: string; }
interface NumericScale { kind: 'numeric'; min: number; max: number; input: 'slider' | 'number'; suffix?: string; }
interface TextScale    { kind: 'text';    multiline: boolean; placeholder?: string; maxLen?: number; }
interface CheckScale   { kind: 'check';   label: string; }
type ScaleDef = BipolarScale | LikertScale | NumericScale | TextScale | CheckScale;

type Polarity = 'positive' | 'negative' | 'neutral';
interface Item {
  code: string;        // 저장 키 (영구·불변) — 예 'A2','C5','B1'
  prompt: string;      // 참여자에게 보이는 유일한 문자열
  scale: ScaleDef;
  required: boolean;
  polarity: Polarity;  // 내부 전용 — 배열 제약·역채점 근거. 화면 비노출
}

interface StandardBlock {
  id: string; kind: 'standard';
  title: string; intro?: string;     // intro·title은 참여자 노출(존대체)
  optional?: boolean;                 // F섹션 '선택' 표시
  items: Item[];
  ordering: OrderingPolicy;
}
interface CustomBlock {
  id: string; kind: 'custom';
  title: string; optional?: boolean;
  component: string;                  // customComponents 등록 키
  emits: string[];                    // 채우는 answers 코드 목록 — 검증용
}
type Block = StandardBlock | CustomBlock;

type OrderingPolicy =
  | { mode: 'fixed' }
  | { mode: 'constrained-shuffle'; firstPolarity?: Polarity; maxConsecutiveSameNegative?: number };

interface ResponseSchema { instrumentId: InstrumentId; wave: Wave; blocks: Block[]; }

interface CustomFlowComponentProps {
  value: Record<string, AnswerValue>;
  onChange: (code: string, v: AnswerValue) => void;
  context: CoreContext;
}
type CustomFlowComponent = (props: CustomFlowComponentProps) => unknown;

interface ResponseFlowPlugin {
  getSchema(wave: Wave): ResponseSchema;
  customComponents?: Record<string, CustomFlowComponent>;
}
```

**코어 러너 (코어가 제공, 진단은 호출만)**
```ts
interface ResponseRunnerProps {
  schema: ResponseSchema;
  context: CoreContext;
  cohortId: string | null;
  wave: Wave;
  onComplete: (responseId: string) => void;
}
// 코어 책임: 위젯 렌더 · 제약무작위 배열 · 진행 저장/재개 · 필수 검증 ·
//           모바일 7블록 흐름 · 접근성 · 완료 시 context.saveResponse() 호출
```

**B①이 구조로 지키는 것**
- 저장은 코드, 화면은 일련번호. `answers` 키는 불변 코드. 참여자가 보는 번호는 렌더 시점의 임시 번호.
- 측정/강의 어휘 분리. 참여자에 닿는 문자열은 `prompt`·`title`·`intro` 뿐. `code`·`polarity`·구인·STEP은 렌더 경로에 없음.
- wave 분기로 사전·사후 페어링. `getSchema('pre'|'post')`는 같은 코드를 쓰되 `intro` 서사만 바꿈.

### 8.2 B② 채점 계약 (구현 완료 — 2026-06-27)

```ts
interface ScoringPlugin<A = Answers, S = unknown> {
  score(answers: A, ctx: { wave: Wave }): S;
}
```
퓨처나우 `TScores` 형상은 §9.3의 7규칙 산출물이다. **전용노선과 채점이 한 치도 다르지 않아야 하며, 단위테스트로 못 박는다.** **구현 완료**(2026-06-27): `scoring.ts` 의 `FuturenowScores`(vitality·redFlag·grow(GROW+F)·trap·compass·gap·faith). 산출물엔 구인 식별자만, 강의 명명 없음(§9.6).

### 8.3 B③ 리포트 계약 (사양 확정·구현 대기)

```ts
interface ReportPlugin<S = unknown> {
  renderScreen(scores: S, prev?: S): unknown;          // 화면 결과(나침반 게이지·레이더·막대)
  renderPdf(scores: S, profile: unknown, prev?: S): unknown;  // react-pdf 개인 분석보고서
  renderGroup(all: S[]): unknown;                      // 그룹 평균 레이더(1주차 오프닝)
}
```
측정 어휘의 진단명(시들음·원씽 등)은 **이 단계에서 비로소 등장**한다(예: "활력 지수가 낮게 나왔습니다 — 이를 '시들음'이라 부릅니다"). 디자인 시스템 확정 후 시각 사양을 채운다.

### 8.4 B④ 알림 트리거 계약 (구현 완료 — 2026-06-27, ADR-19)

```ts
type AlertSignal = Pick<AlertInput, 'severity' | 'reason'>;   // ADR-19 — 진단은 severity·reason 만
interface AlertPlugin<S = unknown> {
  evaluate(scores: S, answers: Answers): AlertSignal[];
}
```
퓨처나우 트리거는 §9.3 규칙 2(Red Flag)·돌봄 체크다. **구현 완료**(2026-06-27, `alerts.ts`): A2·A5·A4 모두 ≥4 → `red_flag`('활력 위기신호') · 돌봄 체크 → `care`('돌봄 요청 신호'), 둘 다면 red_flag 우선. **ADR-19**: evaluate 반환을 `AlertSignal`(severity·reason)로 정직화 — `responseId`·`cohortId` 는 코어가 saveResponse 후 주입해 완전한 `AlertInput` 으로 raiseAlert.

---

## 9. 퓨처나우 인스트루먼트 사양

### 9.1 문항 코드 매핑 (31문항 · 사전·종료 공용)

저장 키는 아래 원 코드다. 화면 일련번호는 제약무작위로 매겨지는 임시값이다.

| 번호 | 코드 | 구인 | 척도 | 채점 | 블록 |
|---|---|---|---|---|---|
| 1 | NAV1 | 나침반-동기(회피↔접근) | bipolar5 | 우측 가점 | 나침반 |
| 2 | NAV2 | 나침반-기준(비교↔자기기준) | bipolar5 | 우측 가점 | 나침반 |
| 3 | NAV3 | 나침반-시선(결정론↔목적론) | bipolar5 | 우측 가점 | 나침반 |
| 4 | NAV4 | 나침반-리셋(매몰비용↔제로베이스) | bipolar5 | 우측 가점 | 나침반 |
| 5 | A1 | 활력-기대 | likert5 | 정 | 지금의 나 |
| 6 | C3 | R-현실인식 | likert5 | 정 | 지금의 나 |
| 7 | A2 | 활력-정체감 | likert5 | 역·위기▲ | 지금의 나 |
| 8 | C6 | O-원씽 | likert5 | 정 | 지금의 나 |
| 9 | D1 | 함정-관성 | likert5 | 역·함정 | 지금의 나 |
| 10 | C2 | G-조감도 | likert5 | 정 | 지금의 나 |
| 11 | A5 | 활력-도파민 | likert5 | 역·위기▲ | 지금의 나 |
| 12 | C8 | W-피드백 | likert5 | 정 | 지금의 나 |
| 13 | C5 | O-우선순위 | likert5 | 역 | 지금의 나 |
| 14 | A3 | 활력-몰입 | likert5 | 정 | 지금의 나 |
| 15 | D2 | 함정-준비 | likert5 | 역·함정 | 지금의 나 |
| 16 | C1 | G-재해석 | likert5 | 정 | 지금의 나 |
| 17 | A4 | 활력-시들음 | likert5 | 역·위기▲ | 지금의 나 |
| 18 | C7 | W-실행지속 | likert5 | 정 | 지금의 나 |
| 19 | D3 | 함정-안주 | likert5 | 역·함정 | 지금의 나 |
| 20 | C4 | R-습관자각 | likert5 | 정 | 지금의 나 |
| 21 | C9 | F-정체성 | likert5 | 정 | 지금의 나 |
| 22 | F1 | 믿음-의미 | likert5 | 정·선택 | 믿음의 자리 |
| 23 | F2 | 믿음-실행 | likert5 | 정·선택 | 믿음의 자리 |
| 24 | B1 | 간격-일 Work | numeric 0~10 | 레이더 | 간격 |
| 25 | B2 | 간격-재정 Wealth | numeric 0~10 | 레이더 | 간격 |
| 26 | B3 | 간격-관계 Relationships | numeric 0~10 | 레이더 | 간격 |
| 27 | B4 | 간격-건강 Health | numeric 0~10 | 레이더 | 간격 |
| 28 | B5 | 간격-기여 Contribution | numeric 0~10 | 레이더 | 간격 |
| 29 | E1 | 기대(주관식) | text | 서술 | 묻는 시간 |
| 30 | E2 | 정서(주관식) | text | 서술 | 묻는 시간 |
| 31 | E3 | 요청(주관식·선택) | text | 서술 | 묻는 시간 |

부가: 들어가며(조감도 한 문장, text) · 돌봄 체크(31번 뒤, check) · 마지막 다짐(check).

### 9.2 7블록 흐름 (모바일)

| 블록 | 문항 | 배열 |
|---|---|---|
| 들어가며 | 조감도 한 문장 | fixed |
| 나침반 | NAV1~4 | fixed |
| 지금의 나 | A1~A5·C1~C9·D1~D3 (5~21) | **constrained-shuffle** (첫 문항 positive, 부정 2연속 금지) |
| 믿음의 자리 | F1·F2 | fixed · optional |
| 간격 | B1~B5 | fixed |
| 나에게 묻는 시간 | E1~E3 + 돌봄 체크 | fixed |
| 마지막 한 걸음 | 다짐 체크 | fixed |

### 9.3 산출규칙 7종 (B②·B③·B④의 사양)

1. **활력 지수 (5~25)**: `A1 + A3 + (6−A2) + (6−A5) + (6−A4)`. 구간(확정 2026-06-28): **시들음 ≤10**(Languishing 신호 → 1주차 전 가벼운 안부 권장) · **중간 11~17** · **번성 18~25**. 구간 명명은 B③ 리포트에서만(§9.4).
2. **Red Flag (최우선)**: `A2·A5·A4(7·11·17) 모두 4~5점` 또는 `돌봄 체크` → 개별 연락·돌봄 명단. 점수 공개·지목 없이 개인 면담으로 연결. → B④ `severity:'red_flag'|'care'`.
3. **준비도 GROW+F**: G=`avg(C2,C1)` · R=`avg(C3,C4)` · O=`avg(C6, 6−C5)` · W=`avg(C8,C7)` · F=`C9`(보조 F1·F2). 축별 평균 막대. 그룹 평균 낮은 축 = 보강 포인트.
4. **함정 유형**: `D1(관성)·D2(준비)·D3(안주)` 중 최고점 = 주 함정. 소그룹 편성 기준.
5. **나침반 4축**: `NAV1~4` 좌(1)~우(5). 사전-사후 '바늘 이동' = 세미나 효과 헤드라인.
6. **간격 레이더**: `B1~B5` 오각형. 그룹 평균 레이더 = 1주차 오프닝.
7. **믿음의 자리**: `F1·F2` 무응답·저점은 실패가 아니라 목회적 신호. 점수로 다루지 않고 5주차 FAITH 수위 조절 참고로만.

### 9.4 측정·강의 어휘 분리 (불변 원칙)

문항에는 '시들음·원씽' 등 강의 어휘를 노출하지 않는다(사회적 바람직성 편향 차단). 그 명명은 **리포트 단계(B③)에서** 비로소 한다. 코드·구인·STEP은 참여자 렌더 경로에 두지 않는다(B① 타입이 강제).

### 9.5 사전·사후

동일 번호·동일 코드·동일 구인에 종료 시점 문장으로 치환(`getSchema('post')`). 비교 뷰: 나침반 바늘 이동·활력 변화·간격 축소를 나란히. `subjectProfile`은 응답마다 박제(불변).

### 9.6 구현 메모 (2026-06-27 · B①·B②·B④ 구현, 문항 원문 반영)

순수 로직(화면 없음). `/instruments/futurenow`: `flow.ts`·`scoring.ts`·`alerts.ts`·`schema.ts`·`copy.ts`.

- **역채점 범위 확정**: `6 − x` 는 **A2·A5·A4(활력)·C5(GROW O)** 에만 적용. 함정 `D1·D2·D3` 은 규칙④에서 **원점수 최고점**(역채점 아님, 동점 시 앞선 코드).
- **부가 항목 코드 확정**(§9.1 부가에 코드 부여): 들어가며=`INTRO`(text) · 돌봄 체크=`CARE`(check) · 마지막 다짐=`COMMIT`(check). (지휘부 승인 2026-06-27.)
- **문항 원문 반영 완료**: 검증된 copy deck 을 `copy.ts` 에 verbatim 담고 `flow.ts` 가 참조(구조/문구 분리). 1~28 prompt·양극 레이블은 wave 공용, intro·E1~E3·들어가며·체크 label·간격 intro 는 `getSchema('pre'|'post')`에서 wave 분기. 블록 title 은 copydeck(나의 나침반·다섯 영역의 간격 등). 화면 공용 안내 문구(보안 고지 등)는 `copy.notices`(ResponseSchema 밖, 렌더러용).
  - *보류*: likert 중앙 레이블 '보통'(블록2)은 현 `LikertScale` 계약에 필드가 없어 미반영(렌더러 파생 또는 추후 계약 보강). 간격 종료의 '5주 전' 값은 B③ 비교뷰 사안 — flow 는 '오늘' 값만 수집.
- **subjectProfile 형상**(진단 소유): `ageBand`·`faithYears`(공용) · `motivation`(사전, 참여 계기) · `writtenAt`(종료, 작성일) — wave별 노출(`copy.profileFieldsByWave`). **실명은 코어 `users.name`, 전화는 `user_contacts`** 재사용 — profile 에 두지 않음(ADR-02·04).
- **B④ 정직화(ADR-19)**: `AlertPlugin.evaluate` 반환을 `AlertSignal`(severity·reason)로 변경. `responseId`·`cohortId` 는 코어가 saveResponse 후 주입 → 완전한 `AlertInput` 으로 raiseAlert. 책임 경계와 일치(진단=신호, 코어=식별자).

---

## 10. 디자인 시스템 — **v3 도착·구현 (응답 + 리포트 + 진입 흐름 + 콘솔) / 운영자 화면 대기**

상세는 [`design_system.md`](design_system.md) (v3). 본 절은 요약·구현 상태.

**v3 범위(구현 완료)**: 색 3단 토큰 · 타이포 · 응답 위젯 5종 · 리포트 시각화 5종 · 종합 배치 · **참여 진입 흐름(§7) · 코치 콘솔(§8)**.

- **색 3단 토큰**(§1): 원천 hex → 역할(semantic) → 컴포넌트. `src/app/globals.css` 에 §1.1~1.4 구현. **컴포넌트는 2차 역할 토큰만 참조**(hex·`--navy-*`·`--gold-*` 직접 참조 금지). 색값은 **잠정**(첫 화면 확정 후 재평가). 선택색 = `--color-accent`(골드). 다크 토큰은 역할만 재지정.
- **타이포·간격**(§2·§3): Pretendard, 숫자 tabular-nums, 타이포 7토큰(display~micro), `--tap-min:44px` 등. globals.css.
- **공용 UI 12종**(§9, 코어 `src/core/ui`, 인스트루먼트 중립): Button·Card·ProgressBar·SegmentBar·DotScale·NumberSlider·TextArea·CheckRow·StickyScaleHeader·**OtpInput·Stepper·ListRow**. 스타일은 `src/core/ui/ui.css`(역할 토큰·`--care-*`만). 리포트 차트군은 코어가 아니라 **인스트루먼트 소유**(ADR-21).
- **진입 흐름(§7) + 코치 콘솔(§8)** — **앱 레이어**(`src/app/_screens/`, 코어 UI·인스트루먼트를 합성). 진입: 코드입력(OtpInput)→차수 미리보기(CohortPreview)→로그인/가입(이름·전화 미요구, ADR-03)→시작 안내(보안 고지·버튼=동의). 콘솔: 홈(먼저 챙길 분 최상단·돌봄 우선)·차수 개설(3스텝)·차수 상세(3숫자+명단 3묶음)·모든 차수. **인도자 화면만 의미색(저채도 `--care-*`), 참여자 진입 화면 경고색 배제.** 미리보기 `/preview/entry`·`/preview/console`. **CohortPreview 메타 타입은 앱 로컬**(`_screens/types.ts`) — 계약 승격은 보류(아래).
- **응답 위젯 5종 + 러너**(§4): 나침반=세그먼트바(중앙 유지)·리커트=행스택+척도 sticky+도트22px(히트44px)·간격=슬라이더+숫자·주관식=텍스트영역·체크=행토글(경고색 금지·골드 선택). `src/core/response/ResponseRunner.tsx`(시각부: 블록 흐름·위젯 렌더·진행·필수 게이팅·제약무작위 배열[`ordering.ts`]·완료 시 `saveResponse`). 참여자 화면 경고색 배제(§0.4). 미리보기 라우트 `/preview`.
- **리포트 시각화 5종 + 배치**(§5·§6, B③ 구현 완료): 나침반=덤벨·간격=레이더(사후 네이비13% 면+사전 회색 점선)·GROW+F=충전막대(사후 네이비·사전 회색)·활력=띠 이동(시들음/중간/번성 저채도 구간+상태배지)·돌봄 신호=조건부 배너(저채도 `--care-*`). 배치: 돌봄→헤드라인(활력·나침반)→깊이(간격·GROW)→주관식, 데스크톱 2×2/모바일 1열. **본문 시각물 네이비·회색, 의미색은 돌봄 배너에만.** 명명(시들음·원씽)은 리포트에서만(§9.4). `src/instruments/futurenow/report/*` + `report.tsx`(ReportPlugin: renderScreen·renderGroup·renderPdf[react-pdf, 서버 전용]). 미리보기 `/preview/report`. **InstrumentModule 최종 조립** = `src/instruments/futurenow/index.ts`.
- **경계 결정(directive 2026-06-28, ADR-21)**: 리포트 차트군(Dumbbell·Radar·ChargeBars·VitalityBand·CareBanner)은 **인스트루먼트 소유** 확정(`report/visuals.tsx`) — 진단별 명명·데이터가 박히므로 코어 중립 부품이 아니다. design_system §7 의 '코어' 기재는 **오기로 정정**. 진단↛코어 경계(CLAUDE §1) 유지, 차트는 공유 디자인 토큰만 참조. **활력 구간 경계 확정**(11~17 중간·18~25 번성). **PDF 생성 라우트(renderToBuffer)는 다음 단위**(renderPdf 구현·타입·빌드는 완료, 서버 전용).
- **보류(design_system §9)**: 코치/운영자 콘솔·`CohortPreview`. **착수 금지.**
- **후속(러너)**: 진행 저장/재개·subjectProfile 수집 화면·접근성 키보드 정밀화는 미구현(주석).

---

## 11. ADR (Architecture Decision Records)

| # | 결정 | 근거 |
|---|---|---|
| ADR-01 | 공유 코어 + 진단별 전용 모듈(플러그인 계약) | 통합하되 질 저하 금지. 채점·리포트 엔진은 비공유 |
| ADR-02 | 신원=코어 / 진단별 참여프로필=responses.subjectProfile | 실명제 퓨처나우·익명 SAIL 공존 |
| ADR-03 | 이름·전화 공용 필드 + (진단×역할) 필수성 정책 | 코치 강제·참여자 선택, 교차 재사용 |
| ADR-04 | 전화번호 user_contacts 격리·운영자 전용·getPhone 게이트 | 코치 상호 비열람. RLS 열 제한 한계 보완 |
| ADR-05 | RLS는 SECURITY DEFINER 헬퍼로 재귀 회피 | SAIL 핫픽스 계승 |
| ADR-06 | 실명제·인도자 전용. 익명 URL SELECT 절 제거 | 퓨처나우 보안 전제 |
| ADR-07 | C를 전제로 한 A: 단일 레포·폴더 분리 → 후일 패키지 추출 | 계약 진화 중 한 몸 검증, 후일 병렬 |
| ADR-08 | B① 선언형 우선 + CustomBlock 탈출구 | 응답 품질 바닥값 공유, 특수 블록 허용 |
| ADR-09 | responses·alerts 불변(UPDATE/DELETE 차단) | SAIL immutable results 철학 |
| ADR-10 | 저장=원코드 / 화면=제약무작위 임시번호 | 배열이 섞여도 채점·페어링 불변 |
| ADR-11 | ~~코어를 전용 `core` 스키마에 격리~~ | **폐기됨(ADR-13/15로 대체)**. 거점이 SAIL 프로젝트로 확정되며 기존 `public` 재사용이 더 단순·정합적이라 판단 |
| ADR-13 | 거점 = SAIL 프로젝트(`zdoytzmvcafcebytttrm`) 승격, 같은 `auth.users` 공유, 신규 프로젝트 미신설 | 교차 자동 로그인. 운영 단순화. 적용 완료 2026-06-26 |
| ADR-14 | 진단 격리 = `instrument_id` + 차수(코치) RLS | 코치는 자기 차수(단일 instrument)의 응답만 열람 → instrument 격리 성립 |
| ADR-15 | SAIL 기존 `public.users` 를 코어 신원으로 공유 재사용 | SAIL `results`·2축 채점은 인스트루먼트 잔류, 통합은 점진(클로드3 조율). `full_name`→`name` 표준화·`phone` 분리 |
| ADR-16 | SAIL 전화 로그인(`email_by_phone`)은 `user_contacts` 기반으로 격리 보존 | 퓨처나우는 전화 로그인 미사용. 통합 시 재설계(plan.md) |
| ADR-17 | 가입-by-코드: `resolve_cohort_by_code` 를 공개 메타(비민감) 반환 정의자로 확장 + `CoreContext.enrollByCode` 계약 추가 | 미가입자도 코드로 차수를 확인·가입해야. 차수·참여는 코어 책임. 민감정보(응답·명단·전화) 미노출 |
| ADR-18 | `requireRole` 를 `Promise<void>` 로 비동기화 | 숨은 "현재 사용자 선행 해석" 전제를 타입으로 끌어올려 견고화(계약은 견고화 방향으로만 변경) |
| ADR-19 | `AlertPlugin.evaluate` 반환을 `AlertSignal`(severity·reason)로 정직화 | 진단은 신호만, `responseId`·`cohortId` 는 코어가 saveResponse 후 주입. 책임 경계와 일치 |
| ADR-20 | `LikertScale.centerLabel?` 추가(척도 레이블 데이터 소유) | 중앙 레이블('보통' 등)을 진단이 데이터로 선언. 렌더러는 있으면 표기, 없으면 생략 |
| ADR-21 | 리포트 차트군은 **인스트루먼트 소유**(코어 아님) | 진단별 명명·데이터 결속 → 진단↛코어 경계(CLAUDE §1) 유지. design_system §7 '코어' 기재 정정(directive 2026-06-28) |
| ADR-22 | `CohortPreviewMeta` + `previewCohortByCode` 추가(가입 결정용 공개 메타) | `resolveCohortByCode`(Cohort 본체)와 목적 분리 — 미가입자 가입 결정용 비민감 메타(coachName·memberCount). RPC 메타를 버리지 않고 매핑. DB 무변경(directive 2026-06-28 승인) |
| ADR-23 | `Alert` 읽기 타입 + `listCohortsByCoach`·`listAlerts` 추가(콘솔 실데이터) | 콘솔 홈 = 코치 차수목록 + '먼저 챙길 분'. 돌봄은 안전 신호 → **저장된 알림을 읽는다**(listAlerts), `listResponses`+재채점 금지(채점 로직 변경 시 저장본과 drift). RLS(cohorts_select·alerts_select) 그대로 사용, DB 무변경(directive 2026-06-28 승인) |
| ADR-24 | 본부 데이터 계층: `MemberRef`·`CoachApplication` + `listCohortMembers`·`listCoachApplications`·`decideCoachApplication` | **이름 가시성**(plan Q6): users RLS 확대(전 행 노출) 대신 `cohort_member_directory`(DEFINER, **id+name만**) 채택 — SAIL `users` 보존·ADR-04 최소노출. **코치 승격**: 상태변경+role 승격 원자성 위해 `decide_coach_application`(DEFINER) — 내부 is_admin·FOR UPDATE·status='pending' 가드·`role='user'`만 승격. 읽기(listCoachApplications)는 RPC 불요(coach_apps_select=admin + users 조인). directive 2026-06-28 승인 |
| ADR-25 | `createCohort` = **앱측 코드 생성 + 충돌 재시도**(DEFINER RPC·마이그레이션 0) | `cohorts_insert` RLS(coach_id=auth.uid() AND user_role∈{coach,admin})가 권한을 이미 받음 → 새 RPC 불요. 유일 설계점은 유니크 코드: 앱이 `crypto.getRandomValues`로 5자리(알파벳 `ABCDEFGHJKMNPQRSTUVWXYZ23456789` = DB `cohorts_code_check`와 글자 일치) 생성, 23505 충돌 시 재시도(≤5). `Math.random` 금지(초대 수단=예측불가). directive 2026-06-28 승인 |
| ADR-26 | `updateCohort` = **앱측 부분수정**(불변필드 제외) + `cohorts_update` WITH CHECK 부기 | 마감(status=archived)·정원 수정은 `cohorts_update` RLS(USING=소유 코치/운영자)가 받음 → 메서드만. patch는 `name·description·maxMembers·status·expiresAt`만 — `coach_id`(소유이전)·`instrument_id`(불일치)·`code`(링크파손)·`id` 불변. 기존 정책에 `WITH CHECK` 부재 → raw UPDATE 소유이전 가능했음 → 부기 픽스(USING+WITH CHECK 둘 다 소유 강제). 행 0=미존재/RLS차단→CoreNotFound. directive 2026-06-28 승인 |
| ADR-27 | 참여자 완료 §7.5 *갈망 거울* = **퓨처나우 인스트루먼트 소유 + 앱층 조합**(계약 변경 0) | 갈망/지향 언어는 퓨처나우 고유 지식 → `participantMirror(scores)` 인스트루먼트 내부 export(InstrumentModule 인터페이스 미추가). 앱 `finalizeResponse` 가 반환값에 동봉, `Completion`(앱)이 구조 렌더. CoreContext·DB 무변경(G1 보호). 참여자엔 측정·severity·돌봄 0건. 산출 실패 시 ①+④ 우아한 저하. 다인스트루먼트 일반화는 추후. directive 2026-06-28 승인 |
| ADR-28 | 본부 멤버 역할 관리: `MemberSummary` + `listUsers` + `setUserRole`(set_user_role RPC) | 운영자가 멤버를 **직접 승격/강등**(상시 권한)하는 본부 §8.6 첫 조각. `decide_coach_application`(자가 신청 승인)과 **공존** — 전자는 운영자 권한, 후자는 신청 기반. 역할 변경은 민감 → DEFINER RPC가 가드 강제(내부 is_admin·역할 화이트리스트·자기강등 방지). 읽기(listUsers)는 `users_select`=admin 직접 select. directive 2026-06-29 승인 |
| ADR-29 | 멤버 본인 차수 읽기: `MyCohortSummary` + `listMyCohorts`(my_cohorts RPC) | 멤버는 cohorts RLS상 자기 차수도 직접 못 읽음 → **DEFINER RPC가 비민감 메타만**(차수명·코치명·status·진행·가입일; coach_id·code·max_members 미반환) `auth.uid()` 기준 반환. cohorts·enrollments·responses **RLS 불변**(옵션 A). 진행=해당 wave responses row 존재(불변·완료컬럼 없음). `previewCohortByCode`(코드·미가입자)와 목적 분리. directive 2026-06-29 승인 |
| ADR-30 | Q4 확정 — 멤버 리포트 = **순화 뷰**(갈망 거울 재사용), 코치 = **리얼 리포트**(measurement) | 멤버 본인 열람은 `participantMirror`(ADR-27) 산출을 공용 `MirrorView`로 렌더(②방향·③갈망·⑤믿음) — severity·점수·버킷·돌봄 0. 코치 `ReportScreen`(measurement 전체)와 **시각·경로 분리**(/my/cohorts/[id]/report vs /coach/cohort/[id]/report/[responseId]). 멤버 self-read는 `responses_select`(user_id=auth.uid()) 직접 — RPC 불요. scores 미저장(재채점, ADR-09). 계약·DB·RLS 무변경(G1=0). directive 2026-06-29 승인 |

---

## 12. 용어집

- **코어 / 런타임**: 채점하지 않는 1층 공유 인프라(인증·차수·코치·응답봉투·알림·UI).
- **인스트루먼트(진단)**: 코어에 꽂히는 전용 모듈(퓨처나우·SAIL).
- **계약(contract)**: 진단이 코어에 제공하는 4종 구현 규격(응답흐름·채점·리포트·알림).
- **봉투(envelope)**: `responses`의 코어 소유 메타. 속(answers·subjectProfile)은 진단 소유.
- **wave**: 사전(pre)·사후(post). 단발 진단은 null.
- **돌봄/Red Flag**: 위기 신호 → 인도자 즉시 알림.
