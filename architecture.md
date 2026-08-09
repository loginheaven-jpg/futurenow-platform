# 퓨처나우 진단 플랫폼 — architecture.md

> 본 문서는 시스템의 **단일 진실(single source of truth)**이다.
> 확정된 모든 구조·계약·데이터 모델·보안 규칙·진단 사양이 여기 담긴다.
> 작업 중 결정·구현된 결과물의 설계는 반드시 이 문서에 반영한다.
> 보류·향후 항목은 `plan.md`, 작업 규율은 `CLAUDE.md`에 둔다.
>
> 문서 버전: **v1.0** (거점=SAIL 승격 · 코어(CoreContext) 구현 · 가입-by-코드/Q1~Q3 확정 · B①·B②·B④ + 문항 원문 · AlertSignal(ADR-19) · 디자인 시스템 v3 구현(색 토큰·공용 UI 12종·응답 위젯 5종·리포트 시각화 5종·ResponseRunner) · 코치 콘솔·본부(코치 승인·역할관리) · 참여 프로필(ADR-32))
> **v1.0 도달(2026-06-30~07-01)**: X1 색 팔레트 확정 · X2 공통 셸 모드(AppHeader root/sub/flow) · 진입 1~3(공개 소개 현관·플로우 헤더·참여자 홈) · 차수 소개(description) · 진단-1(재진단 허용+dedup ADR-33 · 중간저장 `response_drafts` ADR-34) · 완료 후 착지(A-2, Completion→홈) · 마감 a11y(오류 텍스트 대비). 프로덕션 라이브(Vercel, futurenow-platform.vercel.app).
> **UX 2차 트랙 A(진행 중, 2026-07-02)**: A1 셸 홈 복귀 어포던스(ADR-45) · A2 내 정보 완결(프로필·KPC 편집)+성별 전 서비스 공통 상수(ADR-46) · A3 본부 코치 신청 큐(승인 대기 구분)+운영자 로그인 알림(ADR-47) · A4 성별 남/여 2값(마이그 `20260702002311`·ADR-48) · A5 코드 전달(복사·공유·`?code=` deep-link·ADR-49) · A6 빈/로딩/에러 상태 감사+ConsoleHome 빈 상태(ADR-50). **트랙 A(화면 완결성) 완료.**
> **트랙 A′(네비게이션 통합 홈, 진행 중, 2026-07-02)**: A′-1 역할 감금 해제(통합 홈·비대칭 개방 — /home·/my/cohorts 개방·loginOutcome 전원 /home·MemberHome 운영 카드·ADR-51, ADR-45 부분 대체) · A′-2 홈 복귀 homeHref 통일(콘솔·본부·차수·리포트·내정보 전부 /home · CoachInfoGate flow→sub) · A′-3 인증 영역 현관 복귀·상호 전환(login·signup·reset·reset/confirm → `/`·상호링크, signup 막다른 상태 해소·ADR-52) · A′-4 차수 상세 뒤로가기 출처 기반(`?from=`·ADR-53) · A′-5 root 홈 인지성(라벨드 홈·로고=서비스·ADR-54). **트랙 A′(네비게이션 통합 홈) 완료** — 역할 감금 해제·전 화면 홈 복귀 `/home` 통일·인증 현관 복귀·출처 기반 뒤로가기·홈 인지성. 비대칭 개방(홈 전원·콘솔/본부 게이트) 유지, 데이터 RLS 불변.
> **트랙 B(사후 진단·차수 라이프사이클, 진행 중, 2026-07-02)**: B-1 사후 인프라·코치 개시(`cohorts.post_opened_at`·`open_post_wave` RPC·my_cohorts/listCohortsByCoach 반환 확장·CohortDetail 개시 컨트롤·ADR-55, responses UNIQUE 미추가로 ADR-33 유지) · B-2 참여자 사후 진입(JoinClient `?wave=post` 파라미터화·MemberHome/MyCohorts '사후 진단하기'·ADR-56) · B-3 사전↔사후 비교 리포트(참여자 미러 2개·코치 그룹 평균 2개, 자동 감지·순화/리얼 이원 불변·ADR-57 — 사전→세미나→사후→비교 서사 완결) · B-4 차수 라이프사이클(마감=진입 봉인·데이터 미봉인·CreateCohort 죽은 wave UI 제거·ADR-58). **트랙 B(사후 진단·차수 라이프사이클) 완료** — 코치 사후 개시 → 참여자 사후 진입 → 사전↔사후 비교 → 마감. 하부(wave 인프라) 재사용, responses UNIQUE 미추가(ADR-33 유지).
> **A·B 정합 마감(2026-07-02)**: 다차원 재점검(17 에이전트·적대 검증) 확정 9→7건 수정 — med 3(내 리포트 전역 개방·admin 홈 승인대기 알림·CohortDetail 재공유 배선)·low 4(loginOutcome role/왕복 정리·copy.ts orphan 제거·스테일 주석 동기화). ADR-59. 보안·마이그·계약 G1 clean.
> **트랙 C(성능·측정 기반, 진행 중, 2026-07-02)**: C-1 측정(전역 하한 ~1.1–1.4s = getUser 2회+SELECT, 콘솔 N+1 ~610ms/차수, force-dynamic 16면) · C-2 `currentUser` 요청 단위 메모이즈(ADR-60 — /coach 게이트 3×→1×, 검증 우회 아님) · C-3 콘솔 차수 루프 병렬화(ADR-61 — 순차→`Promise.all`, N=3 스케일링 평탄화) · C-4 낙관적 UI 시범(ADR-62 — 차수 이름 변경, refresh 전체 재렌더→낙관적 즉시 반영·실패 롤백). **트랙 C(성능) 봉인** — 측정 하한 확인 → currentUser 메모이즈 → 콘솔 병렬화 → 낙관적 UI. 보안 사안 2건(이중 getUser dedup·getClaims 교체)은 별도 승인 대기.
> **트랙 D(general 공개 체험 진단, 2026-07-02)**: D-1 예약 코드 차수 인프라(마이그 `20260702131316` — cohorts CHECK 예약어 `JOINF` + general 차수 시드[운영자 소유·상시 active·무기한·무제한 정원]) · D-2 진입 UI(CodeInput 하단 '체험 진단 시작하기' → `onCode('JOINF')` 딥링크 동형 → CohortPreview `isGeneral`) · D-3 정책·리포트(사전 wave 고정·참여자 본인 순화 거울·운영자 콘솔 재사용 노출). ADR-63. **트랙 D 봉인** — 워크스루 실측: /join 체험 진입 노출·`?code=JOINF` 200·general 참여자 `/my/cohorts` 열람·본인 리포트 200 미러 렌더·신호 0(순화 유지). 확정: 코드=`JOINF`·콘솔 노출·CodeInput 하단.
> **B③ AI 해석(비차단·코치 검수, 진행 중, 2026-07-02)**: B③-A 비차단 생성(ADR-64 — 코치 리포트 렌더 경로에서 aiChat 동기 await 제거, 첫 열람 34,892ms→2,466ms) · B③-B 코치 검수 UI(ADR-65 — 다듬기=setCoachInterpretation·AI 원문으로=clearCoachInterpretation·RLS 소유코치/운영자 격리 실측). **B③ 봉인**(비차단 + 코치 검수).
> **S-1 인증 왕복 최적화(검증 신뢰 실증, 2026-07-02)**: S-1 이중 getUser dedup(ADR-66 — proxy 검증 신원 헤더 전달·strip 신뢰 경계·요청당 Auth 왕복 2→1·role SELECT 유지·세션 갱신 유지, 위조/미인증 거부 로컬+프로덕션 실증). **matcher 불변식(위조-strip 커버리지) 명문화**: `PROXY_MATCHER` 단일 출처(proxy.guard) + `proxyMatcherCovers` 회귀 테스트가 "matcher 를 좁히지 말 것"(정적 자산 외 전 경로 strip 유지·신규 라우트 기본 커버·allowlist 전환 금지)을 강제.
> **S-2 파킹(2026-07-03)**: getClaims 로컬 검증 교체는 선결 실증상 **기술적 가능**(프로젝트 JWT=ES256 비대칭·JWKS 존재·getClaims 지원)하나, 실이득이 왕복 1→0(사용자-비가시 — S-1 실측상 in-region 왕복은 TTFB 노이즈 수준)에 그치는 반면 **검증 신뢰 변화**(getClaims 는 서명·만료만 로컬 검증하고 서버측 사용자 상태[삭제·차단]는 만료 ~1h 까지 미확인; role 은 SELECT 라 즉시 반영)와 세션 갱신 fallback 분기 복잡도를 수반한다 → **파킹**. **재개 트리거: Auth 서버 부하가 실측 제약이 될 때에 한해 재검토**(그때 getClaims+만료-fallback 설계·삭제/차단 지연 posture 실증 후 배선). role 클레임화는 배제 유지(§1).
> **차수 삭제 + '인도자' 용어 통일(2026-07-03)**: 차수 하드삭제(ADR-67 — 예약 general 삭제금지·운영자 임의·코치 빈차수만·2단계 컨펌·계약 +deleteCohort·마이그 0) + 사용자-노출 '코치'→'인도자' 통일(코드/DB 식별자·`/coach` URL·KPC·AI 프롬프트는 유지). 초기 테스트 차수 정리(JOINF·타 계정 데이터 보존). **이중 getUser(proxy↔page)·getClaims 검증 교체는 보안 사안 — 별도 보고·승인 후.**
> **남은 미결(plan.md)**: B③ 리포트 **자동 해석 문구(AI 생성)** 구현 대기 — 시각화 5종은 구현 완료, AI 게이트웨이 위치(plan §1)·Q5(문구 검수) 결정 선결. 그 외 다크 모드 색·접근성 키보드 정밀화는 후속.

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
    vocab.ts           전 서비스 공통 규약 **값**(런타임 상수 — 성별). domain.ts(타입 전용)와 분리·직접 import(ADR-46)
  /instruments
    /futurenow         ← 퓨처나우 전용 엔진+UX (계약 구현체)
      flow.ts          B① 응답 스키마
      scoring.ts       B② 7규칙 채점
      report.tsx       B③ 화면·PDF·그룹 리포트
      alerts.ts        B④ Red Flag·돌봄 트리거
      schema.ts        answers·profile zod 스키마
      profileVocab.ts  퓨처나우 프로필 도메인 값(종교·KPC형식·생년상한 — 성별 제외, ADR-46)
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
| 성별·생년·종교·신앙연수(신원 부가) | **코어** | `user_profiles` | 계정 단위 재사용·users 본체 미오염(ADR-04 격리 선례·ADR-37). 전부 nullable — 필수성은 폼/IdentityPolicy |
| 참여 스냅샷(성별·생년·종교·신앙연수 사본 + 참여계기 motivation) | **진단** | `responses.subjectProfile` | 응답 시점 스냅샷(불변) — 신원 부가는 계정(`user_profiles`)에서 복사·박제, 참여계기는 진단 고유(ADR-32·44) |
| 문항 응답 | 진단 | `responses.answers` | 코어 불가시 |

**저장처 분리(S1~S4 확정)**: 이름=`users.name` · 전화=`user_contacts`(민감 게이트) · 신원 부가(성별·생년·종교·신앙연수)=`user_profiles` · 코치 인증번호(KPC)=`coach_applications.kpc_number`. 각 값의 소유·민감도가 다르므로 물리 분리한다 — `CoreUser`엔 phone·profile·KPC를 싣지 않고 게터(`getPhone`·`getProfile`·`getMyCoachKpc`)로만 접근(ADR-04 최소노출 계승·ADR-37).

**허용값 소유 계층(A2·ADR-46 / 값 A4·ADR-48)**: 성별 허용값 `GENDERS = ['남','여']`(전 서비스 일관 2값 — 지휘부 확정)은 **전 서비스 공통 상수**(`src/contracts/vocab.ts` — 형제 인스트루먼트도 공유), 종교 목록·KPC 형식·생년 상한은 **퓨처나우 소유**(`src/instruments/futurenow/profileVocab.ts`). 성별 상수는 `user_profiles.gender`의 **SQL CHECK 와 값이 일치해야 하며**(TS·SQL 이원 원천 — SQL은 상수 미참조), 값 변경 시 마이그(CHECK+`handle_new_user` sanitize)를 반드시 동반한다(A4 마이그 `20260702002311` 이행 — DROP→변환→ADD 순서).

### 5.2 신원 필수성 정책 (ADR-03)

이름·전화번호는 공용 필드이되, 필수/선택은 **(진단 × 역할)** 정책으로 진단이 선언하고 코어가 강제한다. (아래 표는 **코어 기본 정책**이다. 진단은 `IdentityPolicy`로 자기 요건을 강화할 수 있다 — futurenow는 참여자 이름을 required로 올린다·ADR-42, 아래 문단.)

| 필드 | 코치 | 참여자 | 운영자 |
|---|---|---|---|
| 이메일 | 필수 | 필수 | 필수 (코어 고정) |
| 이름 | 필수 | 선택 | 필수 |
| 전화번호 | 필수 | 선택 | 선택 |

참여자에게는 실명·전화를 **강제하지 않는다.** 퓨처나우가 실명제를 지향하더라도 코어가 참여자에게 실명을 강제하지 않는다(권장 수준). 실명제라는 진단별 정책은 진단 안에서 다룬다.

**퓨처나우 한정 강화(UX통합가입, 2026-07-01 · ADR-42)**: futurenow는 참여자 이름도 **필수**로 선언한다(코치 명단 식별). 이는 코어 ADR-03을 **반전하지 않는다** — `CoreUser.name`은 여전히 nullable이고 DB 불변식도 아니다. 필수성은 진단이 소유한 `IdentityPolicy` 데이터(`futurenowIdentityPolicy.byRole.user.name = 'required'`)와 폼 게이트로만 강제한다. 성별·생년의 '필수'도 같은 방식(폼 게이트, DB nullable)이다.

### 5.3 전화번호 — 민감 채널 (ADR-04)

전화번호 열람은 **운영자(admin) 전용**이다. 같은 차수 코치도, 다른 코치도 볼 수 없다(본인 것 제외). RLS는 행을 가리지 열을 못 가리므로, 전화번호를 **물리적으로 분리**한다.

- `users`에서 전화번호 제거 → `user_contacts` 테이블로 격리.
- 본인은 자기 번호 열람·수정. 운영자는 전체 열람. 코치 정책 없음 = 코치 전면 차단(상호 비열람 포함).
- `CoreUser` 타입에 `phone` 없음 → 진단 엔진·콘솔이 `currentUser()`로 전화번호를 받을 경로 자체가 없음. 접근은 `getPhone` 게이트 하나로 봉쇄.

### 5.4 코어 테이블 (초기 마이그레이션 사양)

SAIL의 검증된 스키마를 토대로 한다. 컬럼·정책의 출처는 SAIL `20260528*` 마이그레이션이다.

> **거점 확정·적용 완료 (directive 2026-06-26 · ADR-13~16)**: 거점 = **SAIL 프로젝트** `zdoytzmvcafcebytttrm` 를 승격(신규 프로젝트 미신설, 같은 `auth.users` 공유). 코어 테이블은 SAIL 의 기존 **`public` 스키마**에 둔다(구 "core 스키마 분리" ADR-11 **폐기**). `public.users` 를 **재사용**해 코어 신원으로 삼되 `full_name`→`name` 표준화·`phone` 분리(`user_contacts`)로 정비한다. 확정 실명: `users`·`user_contacts`·`cohorts`(`instrument_id` 보유)·`enrollments`·`responses`·`alerts`. SAIL 잔존 테이블 `groups`/`group_members`/`results` 는 유지(점진 통합 — 클로드3 조율). **마이그레이션 `20260626120000_core_platform_upgrade.sql` 은 거점에 적용 완료**(원격 version `20260626064658`).
>
> **참여 식별자 — `instrument_id` 규약**: 퓨처나우 = `'futurenow'`, SAIL = `'sail'`. 진단 간 격리는 `instrument_id` + 차수(코치) RLS 로 성립(ADR-14). 코어 신원 모델에는 `coach_applications` 가 포함되며, 코치 승인 흐름은 **구현·적용 완료**다: `decide_coach_application`(원자 승격 DEFINER, 마이그 `20260628095527`·ADR-24)·`set_user_role`(운영자 직접 승강, `20260629000321`·ADR-28)·자기강등/자가승격 방지(`20260629100002`).
>
> **코치 레코드화 (S1~S4, 2026-07-01)**: `coach_applications`는 라이브에만 있고 repo에 `CREATE`가 없던 드리프트를 backfill 마이그(`20260701061038`)로 정확 복원해 편입했고, **UNIQUE(user_id)**(한 사람=한 행 — 신청제·지정제 공용, 재신청=행 갱신)와 **`kpc_number`**(형식 CHECK, 실검증은 plan.md)를 더했다(`20260701061054`). 자가 신청 = `create_coach_application`(self-scoped DEFINER·status='pending' 고정·upsert·ADR-39, `20260701070126`), 코치 본인 KPC 보완 = `set_my_coach_kpc`(role=coach·형식검증·role/status 무오염·ADR-40, `20260701080201`). 참여 프로필은 코어 별도 테이블 `user_profiles`(ADR-37, `20260701061118`) — `handle_new_user` name 키 버그 수정 + 프로필 저장(ADR-41, `20260701061220`).

```
users              -- auth.users 1:1. id·email·name·nickname·role(user/coach/admin)
user_contacts      -- 민감 신원 격리. user_id PK·phone. RLS: 본인+운영자만
cohorts            -- 코치 소유 차수. id·coach_id·instrument_id·name·code(가입코드)
                   --   ·status(active/archived)·max_members·expires_at·post_opened_at(사후 개시 시점 nullable, ADR-55)
                   --   code CHECK = '^[…]{5}$' OR 'JOINF'(general 예약어·ADR-63). general 차수 1건(운영자 소유·상시 active·무기한) = 공개 체험 진입
enrollments        -- 차수 참여 조인. (cohort_id, user_id) PK·joined_at
user_profiles      -- 신원 부가(계정 단위). user_id PK·gender·birth_year·religion·faith_years·updated_at. RLS 본인+운영자 SELECT(코치 열람은 DEFINER RPC cohort_member_profiles). ADR-37
coach_applications -- 코치 자기등록·지정 승인. UNIQUE(user_id)(한 사람=한 행)·status(pending/approved/rejected)·motivation·kpc_number(KPC 형식 '^KPC[0-9]{5}$')·reviewer 흔적. ADR-39/40
responses          -- 응답 봉투. id·instrument_id·cohort_id·user_id·wave
                   --   ·answers(JSONB)·subject_profile(JSONB)·created_at. immutable(ADR-09)
                   --   (user,cohort,wave) UNIQUE 없음 — 재진단 허용의 의도된 설계(ADR-33·latestPerUser dedup). 트랙 B에서 미추가 확정
alerts             -- Red Flag·돌봄. response_id·cohort_id·severity·reason. 점수·원문 미적재
response_drafts    -- 제출 전 작성본(중간저장). PK(user_id,cohort_id,wave)·instrument_id·answers(JSONB)·updated_at
                   --   가변(upsert 덮어쓰기). RLS 본인 한정. 제출 성공 시 정리. responses 와 분리(ADR-34, 진단-1B)
```

**불변 원칙**: `responses`·`alerts`는 INSERT/SELECT만, UPDATE/DELETE 정책 없음(차단). SAIL의 immutable `results` 철학 계승. **예외**: `response_drafts`는 작성 중 보존이라 가변(본인 upsert/delete만, ADR-34) — 정식 응답(`responses`)의 불변성과 무관. `user_profiles`·`coach_applications`도 계정/코치 신원이라 본인 upsert 가변(신원값 정정·KPC 보완) — 불변 원칙 대상 아님(users·user_contacts 동류).

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
| `/` | 방문자 | 현관 — 참여하기→/join · **로그인(전 역할 공용)→/login**(상단 "이미 참여하셨나요? 로그인" + 하단 로그인 버튼) · 인도자 회원가입→/signup. 정적, 데이터 없음 |
| `/home` | 모든 로그인 사용자 | 통합 홈 허브(A′-1·ADR-51). 게이트: **미인증→/login 만**(역할 리다이렉트 제거·전원 개방). 인사 + (코치·운영자)**운영 카드**(→/coach·/admin) + [코드로 세미나 참여]→/join + [내 차수]→/my/cohorts. 셸 헤더+로그아웃 |
| `/my/cohorts` | 모든 로그인 사용자 | 내 차수 목록(Step 1.2·A′-1 개방). `listMyCohorts`(my_cohorts DEFINER RPC, auth.uid() 스코프) — 차수명·코치명·status·사전/사후 진행·**post_opened**. 사전 미완→/join · **사후 개시·미완→[사후 진단하기]→/join?wave=post(B-2)** · 그 외→[내 리포트]. 게이트: 미인증→/login |
| `/my/cohorts/[cohortId]/report` | 전 로그인 사용자(본인 참여분) | 내 리포트 **순화 뷰**(Step 1.3, ADR-27/30·role 게이트 제거 ADR-59 — RLS 본인 스코프). `listResponses`(본인 pre·post, self-read)→각 wave `latestPerUser`→score→`participantMirror`→`MirrorView`. **사전·사후 모두 있으면 미러 2개 나란히 비교(B-3·ADR-57), 하나면 단독**. 측정·severity 0(순화 유지). 계약·DB 무변경 |
| `/login` | 전 역할 | `signInWithPassword` → **전원 `/home`**(A′-1 `loginOutcome` 통일 — 역할 분기 제거). 로그인 전용(가입은 /signup·/join) |
| `/signup` | 스태프/일반 | `signUp`(트리거가 users role=user 생성) → 세션 시 `/home`(A′-1 loginOutcome). 확인 필요 시 안내. **출구(A′-3): 로그인·현관(`/`)** — 막다른 상태 해소 |
| `/reset` | 공개 | 비밀번호 재설정 요청(Step 2.3). `resetPasswordForEmail`(redirectTo=origin/reset/confirm). enumeration 방지(동일 안내). 비번=auth.users. **출구(A′-3): 로그인·현관** |
| `/reset/confirm` | 공개 | 새 비밀번호 설정(Step 2.3). 복구 세션 게이트(있을 때만 `updateUser`) → `/home`. 만료 시 재요청 안내. **출구(A′-3): 로그인·현관(전 단계)** |
| `/account` | 로그인(3페르소나) | 내 정보(Step 2.5·**A2 완결**). 이름=`setName`(users.name)·**연락처(전화·주소·계좌)=`setContact`**(user_contacts, 부분 upsert·ADR-76)·**프로필(성별·생년·종교·신앙연수)=`setProfile`**·**(코치)KPC=`setMyCoachKpc`**·비번=`updateUser`. 프리필=`getContactDetail`/`getProfile`/`getMyCoachKpc`. **모든 필드 나중에 수정·추가 가능**(지휘부 2026-07-09). role 쓰기 경로 없음(2.S2 봉쇄). 게이트 미인증→/login |
| `/admin` | 운영자 | 두 섹션 구분(A3) — **승인 대기**(`listCoachApplications('pending')`→`decideCoachApplication` 승인/거절, 승인 시 user→coach 원자 승격) + **멤버 관리**(`listUsers`+`setUserRole` 승격/강등, 이름 클릭→세부 `memberDetailAction`[신원+활동] ADR-71, 세부 내 하드삭제 `deleteMember` ADR-70). 운영자 게이트(§8.6) |
| `/join` | 참여자 | preview→enroll→runner→finalize(거울). 코드 진입(참여자 가입 결속). **`?code=` 초대 링크 deep-link(A5)**. **`?wave=post` 사후 진입(B-2)** — getSchema(post)·wave='post' 저장(기본 pre). `?cohort=` 재진입과 함께 실림. **general 체험(D-2·ADR-63)**: CodeInput 하단 '체험 진단 시작하기' → `onCode(GENERAL_CODE='JOINF')`(딥링크 동형) → CohortPreview `isGeneral`(인도자·인원 숨김·체험 문구) → 기존 enroll→runner 합류. 사전 wave 고정(general 사후 없음) |
| `/coach` | 코치/운영자 | 차수 목록 = **운영자 `listAllCohorts`(전체 인도자 차수·소유자명 표시)** / 인도자 `listCohortsByCoach(me.id)`(ADR-74) + 차수별 `buildCohortRoster`(먼저 챙길 분=`listAlerts` care/red_flag). `/coach/cohorts`(모든 차수)도 동일 분기. **(운영자) 승인 대기 N건 배너→/admin**(콘솔 진입 시). admin 로그인 착지는 **/home**(loginOutcome 전원 /home·ADR-51) — 홈 '본부' 카드에 승인 대기 건수 노출(ADR-59, 배너와 이원) |
| `/coach/new` | 코치/운영자 | `createCohort` |
| `/coach/cohort/[cohortId]` | 코치/운영자 | `getCohort`·`listEnrollments`·`listResponses`·`listAlerts`·`listCohortMembers` → 3숫자·3묶음 + 관리(마감·정원=`updateCohort`, **사후 진단 개시=`openPostWave`**·ADR-55). **명단 행 휴지통=`removeCohortMember`**(차수에서 제거·2단계 컨펌·소유 코치/운영자만·ADR-73). **뒤로=진입 출처(`?from=` 콘솔/목록, 기본 목록·A′-4)** |
| `/coach/cohort/[cohortId]/report/[responseId]` | 코치/운영자 | `getResponse`→B② `score`→`ReportScreen`(재사용). 접근=responses RLS(차수 코치+운영자+본인). 참여자 UI 경로 없음 |

---

## 6. 보안·RLS

### 6.0 저장소 규율 — 참여자 원문은 커밋하지 않는다 (ADR-96)

**참여자 실명·발언 원문(녹취록·상담 기록 등)은 어떤 저장소에도 커밋하지 않는다. 코드 저장소는 익명 집계와 문안만 다룬다. git 은 삭제가 사실상 불가능하므로 유입 자체를 막는다.**

`.gitignore` 는 **기본 차단 + 명시 허용**이다(ADR-97) — `/docs/*` 로 한 겹 막고 `!/docs/tasks/`·`!/docs/reports/` 만 연다. 앞 슬래시는 저장소 루트 앵커다(없으면 하위 디렉터리의 다른 `docs` 까지 함께 막힌다). **문법 함정**: `/docs/` 로 디렉터리 자체를 제외하면 그 안의 negation 이 동작하지 않으므로 반드시 `/docs/*` 여야 한다 — 이 구조를 단순화하지 말 것. **지시서·보고서 두 폴더도 공개 저장소에 올라간다** — 실측 수치·집계·문안은 되지만 실명·발언 원문은 안 되고, 지시서에 실명이 섞여 오면 클코1 은 **커밋하지 않고 먼저 보고한다.** 이 규율은 저장소 공개 여부와 무관하다 — private 으로 바꿔도 협업자가 늘면 접근이 함께 넓어지고 이력은 여전히 지우기 어렵다. **녹취록은 버전 관리가 필요한 물건이 아니다.**

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
| **회차 갈무리**(`checkins`) | ○(본인·전 회차) | ○ | ✕ | ○ | 
| ↳ 한 걸음(`step_what`·`step_when`·`step_blocker`) | ○ | △ | ✕ | △ |
| ↳ 바라는 점(`suggestion`) | ○ | △ | ✕ | △ |
| ↳ 편지 사진(`checkin-photos`) | ○(삭제 가능) | ○(삭제 ✕) | ✕ | ○(삭제 가능) |

**갈무리 △의 뜻(ADR-86)**: 한 걸음은 참여자가 `step_private` 토글을 켜면 인도자·운영자 모두에게 **블록 전체가 가려진다**(내용 0, '비공개로 두었다'는 사실만 표시). 바라는 점은 참여자가 `suggestion_anon` 을 켜면 **이름을 떼고** 차수 단위 무기명 섹션에만 나온다. 둘 다 **권한 등급으로 뚫지 않는다** — 운영자도 코치와 동일하다(참여자에게 한 약속이지 역할 통제가 아니다). 그 밖의 모든 응답 키는 본인·같은 차수 코치·운영자가 읽는다(저장 화면 고지 `save.notice2` "적으신 내용은 인도자와 운영자가 읽습니다."가 근거).

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
- **문항 원문 반영 완료**: 검증된 copy deck 을 `copy.ts` 에 verbatim 담고 `flow.ts` 가 참조(구조/문구 분리). 1~28 prompt·양극 레이블은 wave 공용, intro·E1~E3·들어가며·체크 label·간격 intro 는 `getSchema('pre'|'post')`에서 wave 분기. 블록 title 은 copydeck(나의 나침반·다섯 영역의 간격 등). 화면 공용 안내 문구(보안 고지 등)는 StartGuide·ResponseRunner 인라인(구 `copy.notices`·`profileLabels` 미사용 export 는 정합 마감 시 제거·ADR-59).
  - *보류*: likert 중앙 레이블 '보통'(블록2)은 현 `LikertScale` 계약에 필드가 없어 미반영(렌더러 파생 또는 추후 계약 보강). 간격 종료의 '5주 전' 값은 B③ 비교뷰 사안 — flow 는 '오늘' 값만 수집.
- **subjectProfile 형상**(진단 소유 · ADR-32 기준 · 2026-07-01 정합): `birthYear`·`gender`(수집 필수) · `religion`·`faithYears`(선택) — 계정(`user_profiles`)에서 복사·박제하는 4필드(`copy.profileFieldsByWave`, pre·post 동일). 스냅샷 zod(`futurenowProfileSchema`)는 birthYear·gender 를 nullable·optional 로 완화(계정값 NULL 가능 — 필수성은 DB 불변식이 아니라 S3 `ProfileForm`/`IdentityPolicy`가 강제·코치 화면 NULL 폴백). `motivation`(참여 계기)은 **계정이 아니라 응답 전용 선택 필드**(사전 wave 스냅샷·시점 종속) — `ProfileForm`이 프리필/스킵과 무관하게 수집, `profileFieldsByWave`엔 미포함(ADR-44). 실명은 코어 `users.name`, 전화는 `user_contacts` 재사용 — profile 에 두지 않음(ADR-02·04). (구 `ageBand`·`writtenAt` 기재는 폐기 — 코드 부재, ADR-32로 대체.)
- **B④ 정직화(ADR-19)**: `AlertPlugin.evaluate` 반환을 `AlertSignal`(severity·reason)로 변경. `responseId`·`cohortId` 는 코어가 saveResponse 후 주입 → 완전한 `AlertInput` 으로 raiseAlert. 책임 경계와 일치(진단=신호, 코어=식별자).

---

## 10. 디자인 시스템 — **v3 도착·구현 (응답 + 리포트 + 진입 흐름 + 콘솔) / 운영자 화면 대기**

상세는 [`design_system.md`](design_system.md) (v3). 본 절은 요약·구현 상태.

**v3 범위(구현 완료)**: 색 3단 토큰 · 타이포 · 응답 위젯 5종 · 리포트 시각화 5종 · 종합 배치 · **참여 진입 흐름(§7) · 코치 콘솔(§8)**.

- **색 3단 토큰**(§1): 원천 hex → 역할(semantic) → 컴포넌트. `src/app/globals.css` 에 §1.1~1.4 구현. **컴포넌트는 2차 역할 토큰만 참조**(hex·`--navy-*`·`--gold-*` 직접 참조 금지). 색값은 **잠정**(첫 화면 확정 후 재평가). 선택색 = `--color-accent`(골드). 다크 토큰은 역할만 재지정.
- **타이포·간격**(§2·§3): Pretendard, 숫자 tabular-nums, 타이포 7토큰(display~micro), `--tap-min:44px` 등. globals.css.
- **공용 UI 12종**(§9, 코어 `src/core/ui`, 인스트루먼트 중립): Button·Card·ProgressBar·SegmentBar·DotScale·NumberSlider·TextArea·CheckRow·StickyScaleHeader·**OtpInput·Stepper·ListRow**. 스타일은 `src/core/ui/ui.css`(역할 토큰·`--care-*`만). 리포트 차트군은 코어가 아니라 **인스트루먼트 소유**(ADR-21).
- **진입 흐름(§7) + 코치 콘솔(§8)** — **앱 레이어**(`src/app/_screens/`, 코어 UI·인스트루먼트를 합성). 진입(갱신 2026-07-01): **공개 소개 현관(`/`)** → `/join`: 코드입력(CodeInput)→차수 미리보기(CohortPreview + 세미나 소개)→로그인/가입(AuthGate, 이름·전화 미요구 ADR-03)→시작 안내(StartGuide, 보안 고지·버튼=동의)→**참여 프로필(ProfileForm, ADR-32)**→러너→**완료(Completion 갈망 거울, ADR-27)→자기 홈(A-2)**. 콘솔: 홈(먼저 챙길 분 최상단·돌봄 우선)·차수 개설(3스텝)·차수 상세(3숫자+명단 3묶음)·모든 차수. **인도자 화면만 의미색(저채도 `--care-*`), 참여자 진입 화면 경고색 배제.** 미리보기 `/preview/entry`·`/preview/console`(**보호 라우트 — 세션+`role !== 'user'`, ADR-93**). **CohortPreview 메타 타입은 앱 로컬**(`_screens/types.ts`) — 계약 승격은 보류(아래).
- **응답 위젯 5종 + 러너**(§4): 나침반=세그먼트바(중앙 유지)·리커트=행스택+척도 sticky+도트22px(히트44px)·간격=슬라이더+숫자·주관식=텍스트영역·체크=행토글(경고색 금지·골드 선택). `src/core/response/ResponseRunner.tsx`(시각부: 블록 흐름·위젯 렌더·진행·필수 게이팅·제약무작위 배열[`ordering.ts`]·완료 시 `saveResponse`). 참여자 화면 경고색 배제(§0.4). 미리보기 라우트 `/preview`(**보호 — ADR-93.** `futurenowFlow` 를 클라이언트로 import 하므로 문항 원문 전량이 번들에 실린다).
- **리포트 시각화 5종 + 배치**(§5·§6, B③ 구현 완료): 나침반=덤벨·간격=레이더(사후 네이비13% 면+사전 회색 점선)·GROW+F=충전막대(사후 네이비·사전 회색)·활력=띠 이동(시들음/중간/번성 저채도 구간+상태배지)·돌봄 신호=조건부 배너(저채도 `--care-*`). 배치: 돌봄→헤드라인(활력·나침반)→깊이(간격·GROW)→주관식, 데스크톱 2×2/모바일 1열. **본문 시각물 네이비·회색, 의미색은 돌봄 배너에만.** 명명(시들음·원씽)은 리포트에서만(§9.4). `src/instruments/futurenow/report/*` + `report.tsx`(ReportPlugin: renderScreen·renderGroup·renderPdf[react-pdf, 서버 전용]). 미리보기 `/preview/report`(**보호 — ADR-93.** 리포트 구조·명명이 본문에 그대로 나온다). **InstrumentModule 최종 조립** = `src/instruments/futurenow/index.ts`.
- **경계 결정(directive 2026-06-28, ADR-21)**: 리포트 차트군(Dumbbell·Radar·ChargeBars·VitalityBand·CareBanner)은 **인스트루먼트 소유** 확정(`report/visuals.tsx`) — 진단별 명명·데이터가 박히므로 코어 중립 부품이 아니다. design_system §7 의 '코어' 기재는 **오기로 정정**. 진단↛코어 경계(CLAUDE §1) 유지, 차트는 공유 디자인 토큰만 참조. **활력 구간 경계 확정**(11~17 중간·18~25 번성). **PDF 생성 라우트(renderToBuffer)는 다음 단위**(renderPdf 구현·타입·빌드는 완료, 서버 전용).
- **보류(design_system §9)**: 코치/운영자 콘솔·`CohortPreview`. **착수 금지.**
- **셸 홈 복귀(트랙 A1·ADR-45, 2026-07-02)**: root 화면 우측 액션(`HeaderActions`)에 홈 아이콘 링크(`homeHref`) — `usePathname`으로 **현재=홈이면 생략**(자기참조 방지). sub 화면은 `AppHeader`(variant='sub')가 이미 홈 아이콘을 렌더하므로 액션엔 미전달(중복 회피). **(A′-2·ADR-51)** 전 화면 homeHref 를 **통합 홈 `/home`**으로 통일(역할별 거점 폐지) — 콘솔·본부·차수·리포트·내 정보 어디서든 홈 아이콘·로고가 `/home`으로 복귀. `CoachInfoGate` flow→sub(홈 복귀 어포던스 부여). **(A′-5·ADR-54)** 우측 홈 어포던스=아이콘+'홈' 라벨(인지성), root 로고=서비스 정체성(aria "홈" 제거·홈 링크는 유지) — 로고/홈 역할 분리.
- **러너 후속(갱신 2026-07-01)**: **진행 저장/재개 — 구현 완료**(진단-1B·ADR-34: `response_drafts` 서버 draft + localStorage 자동 + `draftLocation` 안 푼 첫 필수 문항 재계산, step 미저장으로 셔플 안전). **subjectProfile 수집 화면 — 구현 완료**(`ProfileForm`·ADR-32, `/join` 흐름 `start→profile→runner`). **접근성 키보드 정밀화는 미구현 유지**(plan §2 — 후속).

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
| ADR-31 | `setName` 추가(본인 표시 이름 수정) | `/account` 프로필의 이름 수정 = `users.name` 본인 행 update. **본인 전용**(requireUser→id=auth.uid()) — userId 인자 없음(타인 수정 불요). **role 미포함**(2.S2로 role 컬럼 권한 봉쇄·set_user_role 전용) — RLS(본인 행) + 컬럼권한(name=true) 이중 보장. 전화는 기존 `setPhone`/`getPhone` 재사용(계약 +0). 실패는 정제(raw 비노출·내부 로그, ADR 흡수). 계약 +1 메서드만. directive 2026-06-29 승인 |
| ADR-32 | 참여 프로필 수집(생년·성별 필수, 종교·신앙연수 선택) + 러너 프로필 운반 | 제출 실패 수정: 러너가 `subjectProfile:{}` 를 보내는데 `futurenowProfileSchema` 가 필수 필드를 요구해 전 제출 실패(러너 빈스냅샷 의도 ↔ 스키마 필수 충돌, stub validators 라 단위테스트 미포착). 지휘부 확정 — 프로필 **실수집**: `futurenowProfileSchema` = `birthYear`(int 1900~2100·필수)·`gender`(필수)·`religion`(선택)·`faithYears`(선택). 수집 UI = `ProfileForm`(참여자 — 의미색·구인 어휘 0, §0.4·§7), `/join` 흐름에 `start→profile→runner` 삽입. **계약 +1(선택 필드)**: `ResponseRunnerProps.subjectProfile?`(미전달 시 `{}`) — 러너가 `saveResponse` 로 운반(견고화: 러너가 스냅샷 운반). 채점·리포트·거울은 `answers`만 사용 → 프로필 다운스트림 영향 0. 마이그레이션 0. directive 2026-06-29 승인 |
| ADR-33 | 재진단 **허용**(최신 유효) + 집계·열람 경로 dedup(`latestPerUser`) | 같은 user·차수·wave 에 응답이 다중 행 쌓일 수 있음(`responses` 유니크 제약 없음 — 재진단과 양립). 무결성 취약 경로 둘을 앱층에서 user별 `created_at` 최신 1건으로 접음: 그룹 평균(`/coach/cohort/[id]/group` — 평균 오염 방지)·개인 리포트 재방문(`/my/cohorts/[id]/report` — 무순서 `[0]` staleness 방지). 코치 콘솔 카운트(`buildCohortRoster`)는 이미 user별 최신 — 무변경. `listResponses` 시그니처·DB·계약 무변경(G1=0, 진단-1A). directive 2026-06-30 승인 |
| ADR-34 | 중간저장 = 별도 테이블 `response_drafts` + `CoreContext.saveDraft/getDraft/clearDraft` | 진단을 도중 잃지 않게 2층 보존: localStorage 자동(투명·디바운스) + [중간 저장] 버튼 서버 보존. **answers만 저장·step 미저장**(블록 내 셔플과 무관 — 재개 시 `draftLocation`으로 안 푼 첫 필수 문항 블록 재계산). `responses`(불변·정식 제출)와 **분리** — 회귀면 0, 제출 성공 시 draft 정리. PK(user,cohort,wave) upsert=최신 1개. **RPC 대신 RLS 직접 I/O**(self-scoped CRUD라 `user_id=auth.uid()` USING+WITH CHECK로 완전 표현, `saveResponse` 선례 동형 — 함수 DDL 0). INSERT/UPDATE는 `is_cohort_member` 부기(`responses_insert` 선례). 마이그 `20260630134334`(테이블+RLS) + 계약 +3. 러너(코어, §10 "진행 저장/재개")는 토스트 대신 인라인 확인(코어→앱 의존 회피). directive 2026-06-30 승인 |
| ADR-35 | 코어 AI 게이트웨이 통로 `CoreContext.aiChat`(범용·서버 전용) | B③-0(3bc4788) 코드-only 도입 §11 보강. 프롬프트·진단 어휘는 인스트루먼트 소유·코어는 통로만(진단어휘 0) → 코어 '채점 안 함'(CLAUDE §2) 유지. `src/core/ai/gateway.ts`(API Key 불요·provider fallback). 서버 전용(키·provider 비노출) |
| ADR-36 | 코치 리포트 해석 그릇 `report_interpretations` + 계약 4메서드(get/save/setCoach/clearCoach) | B③-1(ca51840) 보강. 유효=coach_content ?? ai_content. RLS 코치(is_cohort_coach)·운영자만 **참여자 분기 없음**(코치 리포트 전용). ai_content 앱 규약 불변(감사). 구조화 형상 진단 소유(계약 unknown·경계 zod는 인스트루먼트). 마이그 `20260630160857` |
| ADR-37 | 참여 프로필 `user_profiles` 코어 별도 테이블 분리(CoreUser 무변경·getProfile/setProfile 게터) | S2(2026-07-01). users 본체 미오염(SAIL 형제 영향 0·ADR-04 격리 선례). RLS 본인 CRUD+운영자 SELECT·코치 직접열람 없음. 전 컬럼 nullable(필수성=폼/IdentityPolicy). role 등 민감 컬럼 부재. 마이그 `20260701061118` |
| ADR-38 | 코치 조원 프로필 열람 DEFINER RPC `cohort_member_profiles`(RLS 확대 회피) | ADR-24 패턴. 내부 `is_cohort_coach OR is_admin` + `user_id IN (차수 enrollments)` 이중 스코프. REVOKE anon/GRANT authenticated·DEFINER·search_path=public. 코치는 자기 차수 조원만. 마이그 `20260701061156` |
| ADR-39 | 자가 코치 신청 `createCoachApplication`=self-scoped DEFINER `create_coach_application`(status='pending' 고정·upsert) | 신청 자격 `user_role='user'`. 재신청 ON CONFLICT(user_id)→status pending·motivation/kpc 덮어씀·reviewer 초기화. 견고화: coach_apps_insert RLS에 `status='pending'` 부기(직접 approved 차단). 클라 metadata 신뢰 폐기(ADR-41). 마이그 `20260701070126`. 그릇=backfill(`20260701061038`)+UNIQUE·kpc_number(`20260701061054`) |
| ADR-40 | 코치 본인 KPC 보완 `setMyCoachKpc`=self-scoped DEFINER `set_my_coach_kpc`(role·status 불변 — 권한상승 아님) | 지정제 코치(role=coach)는 ADR-39(role=user 게이트) 재사용 불가 → 별도. 불변식: 자격 role=coach·**role 미접근**(coach_applications만 upsert)·status 신규만 'approved'·기존 무변경·형식 `^KPC\d{5}$` RPC+CHECK 이중. 실측 status·role 무오염·pending 큐 오염 0. getMyCoachKpc=coach_apps_select 본인 self-read. 마이그 `20260701080201` |
| ADR-41 | `handle_new_user` name 키 버그 수정(full_name 단독 → COALESCE('name','full_name')) + user_profiles INSERT(방어 sanitize)·coach 신청 INSERT 제거 | 버그: name을 full_name 단독으로 채워 futurenow 가입(키='name')에서 users.name 항상 NULL → 신원 필수성 무력화. COALESCE라 SAIL(full_name) 비파괴(ADR-15). coach 신청 트리거 미INSERT(client metadata 신뢰 폐기·신청은 ADR-39). sanitize: CHECK 위반→NULL(가입 안 깨짐). search_path 보존. 마이그 `20260701061220` |
| ADR-42 | futurenow IdentityPolicy 강화 — 참여자 `user.name='required'`(코어 ADR-03 반전 아님) | 코치 명단 식별. **ADR-03 불변** — CoreUser.name nullable·DB NOT NULL 미검. 필수성은 정책 데이터(`identityPolicy.byRole.user.name='required'`)+폼 게이트로만. 진단 소유 정책이라 futurenow 한정(SAIL 미영향). 성별·생년 필수도 폼 게이트(DB nullable) |
| ADR-43 | 코치 정보 게이트 — role=coach·전화/KPC 미완 시 `/coach`가 콘솔 대신 보완 화면(강등 아님·참여자 폴백) | S4. 판정 `/coach/page.tsx`(role='coach' && (!phone‖!kpc)→CoachInfoGate). **강등 아님**(role 변경 0·loginOutcome 무변경). 운영자 면제. [나중에]→/home(코치 권한 유지·콘솔 접근만 유예·완비 시 refresh 개방). 저장=setPhone(ADR-04)+setMyCoachKpc(ADR-40) 재사용 — 새 권한 경로 0. 부분저장 허용·KPC 형식 클라+CHECK 이중 |
| ADR-44 | `motivation`(참여 계기) = 응답 전용 선택 필드(계정 아님) 부활 | ADR-32는 계정 복사 4필드만 확정 — motivation 미포함. 참여 계기는 시점 종속이라 계정(`user_profiles`) 아닌 응답 스냅샷 소유. 사전 wave `subjectProfile` 선택 필드(`futurenowProfileSchema.motivation?`)·`ProfileForm`이 프리필/스킵과 무관하게 수집. `profileFieldsByWave`(계정 4필드)엔 미포함. 채점·리포트·거울은 answers만 → 다운스트림 0. 계약·DB 무변경(G1=0) |
| ADR-45 | 셸 홈 복귀 어포던스 = `HeaderActions.homeHref`(root 노출·자기참조 생략, sub 는 AppHeader 홈 아이콘 재사용) · **A′-1·ADR-51 이 역할별 거점 전제 대체(어포던스 구조는 계승)** | 트랙 A1(항목5). root 화면(내 정보·내 차수 등)에서 홈 복귀가 로고 링크뿐이라 비발견적 → 우측 액션에 홈 아이콘 링크. `usePathname`으로 **현재=홈이면 생략**(자기참조 방지 — /home·/coach·/admin). sub 는 `AppHeader`(variant='sub')가 이미 홈 아이콘 → homeHref 미전달(중복 회피). 역할 거점(참여자/home·코치/coach·운영자/admin). `HomeIcon` export 재사용. 계약·DB·마이그 0. directive 2026-07-02 승인 |
| ADR-46 | 프로필 허용값 소유 계층 — 성별=전 서비스 공통 상수(`contracts/vocab.ts`) / 종교·KPC형식·생년상한=퓨처나우(`instruments/futurenow/profileVocab.ts`) + /account 프로필·KPC 편집 완결 | 트랙 A2(항목6). 성별 표기는 전 서비스 일관(지휘부 확정) → 계약 인접 런타임 상수로 원천화. 배럴은 `export type *`(타입 전용)이라 사용처는 `@/contracts/vocab` **직접 import**(척추 성격 보존). 종교 목록은 진단 고유라 인스트루먼트 소유(둘의 소유 계층 분리). **TS 상수 ↔ SQL CHECK 이원**(SQL은 상수 미참조) — 값 변경 시 마이그(CHECK+`handle_new_user` sanitize) 동반 의무(A4). /account 는 `getProfile`/`setProfile`·(코치)`getMyCoachKpc`/`setMyCoachKpc` 재사용(계약 +0). AuthGate·ProfileForm 로컬 상수 → 공유 import(중복 제거·렌더 무변경). 마이그 0. directive 2026-07-02 승인 |
| ADR-47 | 본부 코치 신청 큐(승인 대기) 구분 + 운영자 로그인 알림(/coach 배너) | 트랙 A3(항목4). /admin 을 두 섹션으로 구분 — ① 승인 대기(`listCoachApplications('pending')`→`decide_coach_application` 승인/거절, 승인 시 user→coach 원자 승격) ② 멤버 관리(기존 `setUserRole`). 운영자는 로그인 시 /coach 로 착지(loginOutcome 무변경)하므로 pending>0 이면 콘솔 상단에 '승인 대기 N건·본부에서 확인' 배너(→/admin). 계약·DB·마이그 0(기존 메서드·RPC·RLS admin 게이트 재사용). **로그인 착지 전제는 ADR-51(A′-1)이 대체 — admin도 /home 착지**; 승인 대기는 /home '본부' 카드 건수 + /coach 배너 이원(ADR-59). directive 2026-07-02 승인 |
| ADR-48 | 성별 허용값 '남'/'여' 2값으로 축소('남성/여성/기타' 폐기) | 트랙 A4(항목3). 성별=남/여 2값을 전 서비스 일관 규약으로 확정(지휘부). ADR-46 이원 동기화 의무 이행 — TS 상수(`GENDERS=['남','여']`) + SQL 마이그(`20260702002311`: 구 CHECK **DROP → 데이터 변환**(남성→남·여성→여·그 외 NULL) **→ 새 CHECK ADD** IN('남','여') → `handle_new_user` sanitize 교체) 동시 변경. 순서 필수(DROP 먼저 — 구 CHECK 살아있으면 변환값 '남'이 구 값집합에 걸림). 실측 기존 '남성' 1행→'남'. AuthGate·ProfileForm·AccountForm 은 공유 상수 참조라 자동 반영(재수정 0). 마이그 1. directive 2026-07-02 승인 |
| ADR-49 | 코드 전달 배선 — 코드 복사(clipboard) + 초대 링크 공유(Web Share·폴백) + /join `?code=` deep-link | 트랙 A5(항목: 코드 전달). CreateCohort 완료 스텝 placeholder 두 버튼 실배선 — 코드 복사=`navigator.clipboard`, 초대 공유=`navigator.share`(미지원 시 링크 clipboard 폴백). 피드백은 로컬 상태(토스트 미의존 — 미리보기 안전·비보안 컨텍스트 try/catch). 초대 링크=`${origin}/join?code=<코드>`; JoinClient 가 `initialCode` 로 받아 미리보기 자동 deep-link(코드 입력 생략, `cohort=` 재진입 우선). 계약·DB·마이그 0. directive 2026-07-02 승인 |
| ADR-50 | 빈/로딩/에러 상태 감사 + ConsoleHome '진행 중 차수' 빈 상태 보강 | 트랙 A6(항목: 상태 완결). 감사 결과 대부분 기존 처리 확인 — 빈 상태(MyCohorts·AllCohorts·AdminMembers 승인대기·MemberHome), 로딩(Next 서버 로드 + 버튼 busy + JoinClient resolving), 에러(`error.tsx` 경계 + 액션 토스트). 조용한 catch 들은 의도된 폴백(null→빈 폼·`notFound`·우아한 저하 ADR-27·재시도 상태)이라 보존(무분별 제거 금지). 유일 갭=ConsoleHome '진행 중 차수' 빈 목록 → 안내 문구 추가. 계약·DB·마이그 0. directive 2026-07-02 승인 |
| ADR-51 | 통합 홈 — 역할 감금 해제(비대칭 개방) | 트랙 A′-1. ADR-45 의 **역할별 거점 홈 전제를 대체**(홈 어포던스 메커니즘 `HomeIcon`·`HeaderActions.homeHref` 는 계승). `/home`·`/my/cohorts` 역할 리다이렉트 제거(전 로그인 사용자 개방) + `loginOutcome` 전원 `/home` + `MemberHome` '운영' 진입 카드(코치·운영자만 →/coach·/admin, 중립 팔레트·참여자 미노출·§0.4). **비대칭 개방**: 홈은 전원, 콘솔(`/coach` role=user→/home)·본부(`/admin`) 게이트 유지 — 데이터는 RLS 불변이라 홈 개방=UX 이득(보안 무관, A′-1 워크스루로 URL 직접접근 차단 실증). 계약·DB·마이그 0(`MemberHome` role prop=컴포넌트 시그니처). directive 2026-07-02 승인 |
| ADR-52 | 인증 영역 네비 정비(A′-3) — 현관(`/`) 복귀 + 상호 전환, 경량 인라인(AppHeader auth variant 미신설) | login·signup·reset·reset/confirm 에 `/`(현관) 출구 + 상호 링크(로그인↔가입↔재설정). signup 막다른 상태 해소(→/login·→/). **§5 Q2 판단**: 인증 페이지가 AppHeader 를 안 씀(독립 폼) 실측 → 경량 인라인 채택(root/sub/flow 에 variant 추가 안 함 — 모드 파급 0). 루트 `/` 링크는 `no-html-link-for-pages` 룰로 `next/link`, 하위 라우트는 기존 `<a>` 유지. 계약·DB·마이그 0. directive 2026-07-02 승인 |
| ADR-53 | 차수 상세 뒤로가기 = 진입 출처 기반(`?from=`) | 트랙 A′-4. `/coach/cohort/[id]` backHref 고정(`/coach`) → 진입 출처 분기: 콘솔 경유(`?from=console`)→`/coach`, 목록 경유(`?from=cohorts`)→`/coach/cohorts`, 출처 없음(직접)→목록 기본. push 지점(ConsoleHomeClient·AllCohortsClient)이 `from` 부여, 서버 page 가 읽어 backHref 산출. `?from=` 은 `/coach/cohort/[id]` 전용 — A5 `/join?code=`(ADR-49) 와 라우트·파라미터 무충돌 확인. 계약·DB·마이그 0. directive 2026-07-02 승인 |
| ADR-54 | root 홈 인지성 — 라벨드 홈 컨트롤 + 로고=서비스 역할 분리 | 트랙 A′-5. 우측 홈 어포던스를 아이콘 단독→**아이콘 + '홈' 텍스트 라벨**(인지성 강화). root 로고는 서비스 정체성(제목=접근성 이름·`aria-label="홈"` 제거)이되 홈으로도 링크(브랜드 관례) — "로고=서비스 / 우측=홈 복귀" 역할 명료화. ADR-45·51 어포던스 계승·구체화. 계약·DB·마이그 0. directive 2026-07-02 승인 |
| ADR-55 | 사후 진단 인프라·코치 개시 — `cohorts.post_opened_at` + `open_post_wave` DEFINER RPC(트랙 B-1) | 차수는 wave 중립(사전=개설=개방). 사후는 코치 수동 개시 = `post_opened_at`(nullable, NULL=미개시). `open_post_wave(p_cohort_id)` self-scoped DEFINER — `is_cohort_coach OR is_admin` 게이트, NULL→now() **단방향·멱등**, `post_opened_at`만 세팅(role/status/기타 불건드림 — 권한 상승 아님, 라이브 실증). 계약 +`openPostWave` + `my_cohorts`·`listCohortsByCoach` 반환에 `post_opened`(형상 변경·G1 명시). **`responses` UNIQUE 미추가**(ADR-33 재진단 허용 유지 — wave 컬럼+latestPerUser dedup으로 분리·페어링, 지시서 개정 반영). 마이그 `20260702051200`. directive 2026-07-02 승인 |
| ADR-56 | 참여자 사후 진입 — JoinClient wave 파라미터화(`?wave=post`) + MemberHome/MyCohorts '사후 진단하기'(트랙 B-2) | JoinClient `wave="pre"` 하드코딩을 `initialWave`(page `?wave=`)로 파라미터화 — 사후 진입 시 `getSchema('post')`·`wave='post'`로 saveResponse·채점(기본 'pre'·기존 불변). 홈/내차수: `post_opened && !post_done` → '사후 진단하기'(→`/join?cohort=&wave=post`), 사전 미완 시 pre 우선. `finalizeResponse` 는 `resp.wave` 재사용(무변경). 사후 dedup=pre의 `latestPerUser`(ADR-33) wave만 교체 — 하부 재사용. 재진입 UX=pre 동형. `?wave=`↔`?from=`(A′-4)·`?code=`(A5) 무충돌. 계약·DB·마이그 0. directive 2026-07-02 승인 |
| ADR-57 | 사전↔사후 비교 리포트 — 응답 존재 자동 감지(트랙 B-3) | 참여자 개인(`/my/cohorts/[id]/report`)·코치 그룹(`/coach/cohort/[id]/group`)의 `wave='pre'` 고정 해제 — 사전·사후를 각각 `latestPerUser`(ADR-33)로 최신 1건 페어링(다중 행이어도 최신끼리). 둘 다 있으면 비교, 사전만이면 사전 뷰 폴백(**자동 감지**·쿼리 불요). **이원 원칙 불변**(ADR-30): 참여자=순화(`participantMirror` 미러 2개 '세미나 전/후' 나란히·측정 0), 코치=리얼(`GroupView` 사전/사후 그룹 평균 2개 라벨). 계약·DB·마이그 0(기존 부품 재사용). directive 2026-07-02 승인 |
| ADR-58 | 차수 라이프사이클 — 마감=**진입 봉인(데이터 미봉인)** + CreateCohort 죽은 wave UI 제거(트랙 B-4) | 마감(`status='archived'`)은 **신규 가입만 차단**(`resolve_cohort_by_code`·`enrollByCode`가 이미 `status='active'` 필터 → 미가입자 preview/enroll 불가), **리포트·데이터는 상시 열람**(리포트 경로 status 미검), **가입자는 진단 완료 가능**(재진입 `?cohort=` 허용). expires_at 만료도 동일 차단(resolve 필터). 마감/재개 컨트롤은 CohortDetail(`updateCohort{status}`)에 기구현. CreateCohort의 사전/종료 wave 선택(저장 안 되던 죽은 UI) 제거 — 차수는 wave 중립, 사후는 개설 아닌 개시(ADR-55). **§5 판단**: '진입 봉인 not 데이터 봉인' 채택 — draft 유무 구분 없이 가입자 완료 허용(단순·저위험, '세미나에 있던 사람은 마칠 수 있다'). 계약·DB·마이그 0. directive 2026-07-02 승인 |
| ADR-59 | A·B 정합 마감 — 재점검(17 에이전트) 확정 이슈 수정(문서-코드 드리프트=작업 미완, CLAUDE §11) | **med**: (1) 내 리포트 라우트 `role!=='user'→/coach` 게이트 제거 → 전 로그인 사용자가 본인 참여분 순화 뷰 열람(A′-1 개방 정합·RLS 본인 스코프); (2) admin 로그인 알림 — admin은 loginOutcome로 /home 착지하므로 `/home` '본부' 카드에 승인 대기 건수 노출(/coach 배너와 이원); (3) `CohortDetail` '다시 공유' 실배선(onClick 부재 죽은 컨트롤 → 재공유, A5·ADR-49 로직 동형). **low**: `loginOutcome` role 인자·호출부 `currentUser()` 왕복·도달불가 폴백 제거; `copy.ts` 미사용 export(`notices`·`profileLabels`) 제거(`profileFieldsByWave`는 ADR-32/44 규범 참조라 유지); 스테일 주석 동기화(MyCohorts·HeaderActions·AppHeader·coach/page). 계약·DB·마이그 0. directive 2026-07-02 승인 |
| ADR-60 | `currentUser` 요청 단위 메모이즈(트랙 C-2 성능) | `SupabaseCoreContext` 인스턴스(요청마다 생성)에 currentUser Promise 캐시 — getPhone/requireUser/requireRole/setProfile 등이 내부 재호출해도 `getUser`(Auth 검증)+users SELECT 는 **요청당 1회**. **검증 우회 아님**(최초 1회 getUser JWT 검증 그대로·이후 검증된 결과만 공유). 특히 /coach 게이트(page currentUser + getPhone + getMyCoachKpc = 3× → 1×)·/account 유사 절감. **이중 getUser(proxy↔page 별 실행맥락)·`getClaims` 검증 교체는 위조 세션 검증 직결 보안 사안이라 미착수**(별도 보고·승인 후). 계약·DB·마이그 0. directive 2026-07-02 승인 |
| ADR-61 | 콘솔 차수 루프 병렬화(트랙 C-3 성능) | `/coach` 콘솔의 차수 집계 `for` 루프(차수 **간** 순차 await = wall-clock ∝ N)를 `Promise.all(cohorts.map(...))`로 병렬화 — 차수 **내** 4쿼리(enrollments/responses/alerts/members)는 기존 Promise.all 유지, 차수 간 순차만 제거. `map` 결과 배열의 입력 순서 보존으로 `summaries`·`careMembers`(flatMap) 순서 불변, 예외 전파는 for와 동일(첫 reject→페이지 error·조용한 삼킴 없음). 동일 Supabase·동일 데이터·동일 URL 실측(전=fa1e6f3 순차·후=636b18b 병렬): **차수당 한계비용 순차 +854ms(warm-min +437) → 병렬 +289ms(warm-min +253), N=3 wall-clock 3457→2619ms(median −24%·warm-min 2411→2034 −16%)**. N=1은 순차==병렬(warm-min 1538 vs 1528 — 단일 차수 sanity). 데이터 무손상: 콘솔 렌더 본문(스크립트 제거) N=1 4405B·N=3 5769B가 전후 **바이트 동일**(명단·돌봄·응답 순서·집계 불변). 잔여 스케일링(+253ms/차수 warm-min)은 Supabase 커넥션 풀링(N차수×4쿼리 동시 일부 큐잉)+RSC payload 증가에서 옴 — 현실적 차수 수(소수)엔 충분히 완만. **(A) 집계 DEFINER RPC(왕복 1회)는 buildCohortRoster 로직/원시행 + RLS 동등 게이트 복제 복잡도 대비 이득 제한적이라 미착수**(대량 차수 코치가 실병목일 때 재검토). 계약·DB·마이그 0. directive 2026-07-02 승인 |
| ADR-62 | 낙관적 UI 시범 — 차수 이름 변경(트랙 C-4 성능·봉인) | 액션 성공 후 `router.refresh()` 전체 재렌더(액션마다 바닥 ~1.5s 재발생)를 낙관적 전이로 대체. 시범=**차수 이름 변경**(저위험: 자기 소유 설정·완전 가역·RLS 코치스코프, 서버가 `name.trim()` 그대로 저장 → **낙관적 값 == 서버 값·드리프트 0**). `CohortDetailClient` 가 `optimisticName` 오버레이(`effectiveName = optimisticName ?? summary.name`)를 헤더에 즉시 반영(refresh 없음), 실패·예외 시 이전 이름 롤백 + 에러 토스트. 오케스트레이션 = `applyOptimistic`(cohortAdmin 순수 헬퍼·단위테스트 3): 성공→onCommit, 실패/throw→onRollback(error) — **조용한 삼킴 금지**(실패든 예외든 사용자에 롤백/에러 노출). **고위험 제외**: decide(승인/거절)·역할 승격 등 person-affecting 비가역은 낙관적 미적용(directive). 나머지 5개 관리 액션(정원·소개·마감·재개·사후개시)은 현재 `run()`+refresh 유지 — 확대 시 동일 패턴 재사용. force-dynamic 재평가는 대부분 per-user 저이득이라 최소. 계약·DB·마이그 0. directive 2026-07-02 승인 |
| ADR-63 | general 공개 체험 진단 — 예약 코드 차수 인프라(트랙 D-1) | 세미나 코드 없이 **로그인** 사용자가 체험하는 general 진단 = **예약 차수** 방식(진단 파이프라인 재사용, 예약 진입로만 얹음). 마이그 `20260702131316`: `cohorts_code_check` 를 `~ '^[…]{5}$' OR code='JOINF'` 로 확장(5자 랜덤 생성/검증 무변경 — 예약어 1개만 예외) + general 차수 1건 시드(운영자 소유·상시 active·무기한 `expires_at NULL`·`max_members=1000000` 사실상 무제한[enrollByCode 정원검사 회피]·`instrument=futurenow`·`code='JOINF'`). `coach_id`=최초 admin 서브쿼리(생성 UUID 하드코딩 회피), `ON CONFLICT(code) DO NOTHING` 멱등. **보안**: 코치 코드 생성은 랜덤 5자만(`context.ts newCode`) → `JOINF` 위조 불가; general 진입도 로그인 필수(익명 아님). `resolve_cohort_by_code(UPPER)` 가 `JOINF`/`joinf` 모두 반환 → `/join?code=JOINF` 딥링크가 기존 preview→가입→진단 흐름에 합류(D-2). 예약 코드=앱 상수 1곳 격리(`general.ts GENERAL_CODE`) + DB 마이그 하드코딩. **D-2**(진입 UI): CodeInput 하단 '체험 진단 시작하기'(prop 미전달 시 미노출 — 세미나 코드용 무변경) → `onCode('JOINF')` → `previewCohort` → CohortPreview `isGeneral`(인도자·인원 숨김·체험 문구·'체험 시작하기'). **D-3**(정책·리포트): general 은 **사전 wave 고정**(사후 개시 없음), 참여자 본인 순화 거울은 기존 `/my/cohorts/[id]/report` 그대로(RLS 본인 스코프·측정/신호 0 유지), 운영자는 소유자라 기존 코치 콘솔 재사용으로 general 열람(별도 배선 0·Q2 노출). **워크스루 실측**(throwaway 참여자→삭제·general 보존): /join 체험 진입 노출·`?code=JOINF` 200·`/my/cohorts` general 열람·본인 리포트 200 미러 렌더·**신호 0**. 계약 0·마이그 +1. directive 2026-07-02 확정(코드=`JOINF`·운영자 콘솔 노출·CodeInput 하단 진입). |
| ADR-64 | 코치 리포트 해석 **비차단 생성**(B③-A) | 코치 리포트 page(`/coach/cohort/[id]/report/[responseId]`)가 `generateInterpretation`(aiChat ≤28s)을 렌더 경로에서 **동기 await** → **첫 열람 블로킹(실측 34,892ms)**. 분리: 서버 컴포넌트는 `getInterpretation`(existing·빠름)만 조회 → 있으면 즉시 표시, 없으면 클라이언트 `InterpretationPanel`(신규)이 마운트 후 `ensureInterpretationAction`(**유일 신규 표면** — 생성 트리거 서버 액션)으로 백그라운드 생성. **리포트 시각화(ReportScreen)는 항상 즉시 렌더**(해석 무관). 실패·타임아웃 → 재시도 안내(조용한 실패 금지). **비차단 방식 (A)클라 트리거 채택**(B③-B 검수 컨트롤이 어차피 클라 컴포넌트 필요 → 통합; (B)Suspense 스트리밍은 응답 26s 개방+throw 시 error boundary 위험·재시도 어색). **중복 생성**(동시 열람): `generateInterpretation` existing 선확인 + `saveInterpretation` '없을 때만' + `aiChat useCache:true`(동일 입력 캐시)로 완화 — 락(DB 커넥션 26s 점유)은 기각, 드문 중복 aiChat 은 낭비이나 정합 안전. 참여자 리포트는 해석 대상 아님(무변경). **측정 전후(동일 Supabase·동일 응답)**: 신선 리포트(해석 없음) 열람 TTFB **블로킹 34,892ms → 비차단 2,466ms(~14×·93%↓, 리포트 시각화+플레이스홀더 즉시)**; existing 해석은 5,082ms 즉시 표시(재생성 0). 게이트웨이 정상 작동 확인(claude-sonnet-4-6·~35s 느림 → 비차단 정당성 실증). 계약 0(aiChat·getInterpretation·saveInterpretation 재사용)·마이그 0. directive 2026-07-02 승인 |
| ADR-65 | 코치 리포트 해석 **검수 UI**(B③-B·Q5) | `InterpretationPanel` 에 검수 컨트롤 배선 — **'다듬기'**(구조화 편집기: 전체 인상·축별 읽기·돌봄 안부(선택)·성장 여지 textarea → `setCoachInterpretation`·edited_by 본인·edited_at now) · (코치 수정본일 때만)**'AI 원문으로'**(`clearCoachInterpretation` → coach_content=null → effective=AI 원문). `effective`=coach본 우선(InterpretationView coalesce), 출처 배지('코치가 다듬어 확정' vs 'AI 초안'). 저장/되돌리기 실패는 토스트(조용한 삼킴 금지)·제목/성장 빈값 가드. 신규 액션 `saveCoachInterpretationAction`·`clearCoachInterpretationAction`(계약 setCoachInterpretation·clearCoachInterpretation 래퍼 — 계약 델타 0). **권한 격리 실측**: `report_interpretations` RLS 4정책(SELECT·UPDATE·INSERT·DELETE) 전부 `is_cohort_coach(cohort_id, auth.uid()) OR is_admin(auth.uid())` → **참여자·비소유 코치 열람·수정 불가**(소유 코치+운영자만); page role 게이트(role=user→/home) 이중. 계약 0·마이그 0. directive 2026-07-02 확정(Q5 검수 단계 둔다). |
| ADR-66 | 이중 getUser dedup — page 검증 왕복 제거(S-1 보안·성능) | 요청당 Auth 왕복 2(proxy `getUser` + page `currentUser`의 `getUser`)를 **1로** 줄임. proxy가 검증한 신원을 헤더로 page에 전달 → page는 재검증 없이 `users` SELECT만. **신뢰 경계(핵심)**: proxy가 인입 `x-futurenow-verified-uid` 를 먼저 **strip** 하고 자기 검증값만 세팅(미들웨어 matcher가 정적 자산 외 **전 경로 커버** → 전수 strip) → 클라이언트 위조 무효(proxy만 세팅 가능). page `loadCurrentUser`: 헤더 있으면 `getUser` 생략·id로 SELECT, 없으면 `getUser` fallback. **role·email 미탑재**(민감·스테일 회피 — role은 SELECT 유지, 클레임화 배제 §1). 서버 팩토리 `createServerContext`(헤더 리더+주입)로 18 서버 호출부 마이그레이션(클라이언트 3곳은 브라우저 getUser fallback 유지). **proxy 세션 갱신 유지**(`getUser` 무변경 → 만료 토큰 refresh + refresh 쿠키 최종 response 보존). **보안 실증(로컬 next start)**: 위조 헤더 단독(쿠키 없음)→/home·/account **307 /login**(strip·위장 불가), 세션+위조 헤더→**실제 세션 신원 판정**(위조 무시), 미인증→/login(차단 유지). **측정 전후**: /home median 1573ms → 1596ms(warm-min 1141→899). page getUser 제거의 in-region 왕복 절감은 SSR 바닥(~1.5s) 대비 작아 median 노이즈 내이나, **왕복 수 2→1 결정적**(page getUser 소거·코드 명시). **프로덕션 위조-거부 재실증 통과**(Vercel 미들웨어도 strip 동작 확인 — 로컬과 동일). 계약 0·마이그 0. directive 2026-07-02 승인 |
| ADR-67 | 차수 하드삭제 + '인도자' 용어 통일 | **삭제**(`deleteCohort` 계약+코어+`deleteCohortAction`+UI 2단계 컨펌·위험색). 규칙: **예약 general 차수(JOINF)는 운영자 포함 삭제 금지**(앱 액션 가드·인프라 보호) · **운영자=임의 차수**(데이터 있어도·컨펌에 참여/응답 영향 규모 표시) · **코치(소유)=빈 차수만**(참여·응답 0 — 데이터 있는 차수를 코치가 지워 응답이 SET NULL 고아화되는 파괴를 코드 경계에서 차단, 데이터 있으면 마감 유도). RLS `cohorts_delete`=`coach_id=auth.uid() OR is_admin` 가 **소유**를 강제(하드 경계=소유권; 빈-판정·예약가드는 앱 레벨 product 가드 — 소유자 자기 데이터). 성공 시 차수 소멸 → 목록 이동. FK: enrollments/response_drafts CASCADE·responses/alerts/report_interpretations SET NULL. **마이그 0**(cohorts_delete 정책 기존). 초기 정리: loginheaven 빈 테스트 차수 2개 삭제(JOINF·타 계정 데이터 차수 보존). **용어 통일**: 사용자-노출 '코치'→'인도자'(인도자 콘솔·본부 인도자 신청/승격·로그인 안내·검수 출처 배지·AuthGate 신청·승격/승인 토스트·ROLE_LABEL). **유지(#3·#4 확정)**: 코드/DB 식별자(`role='coach'`·`coach_id`·`is_cohort_coach`·`listCohortsByCoach`)·`/coach` URL·KPC(외부 자격명 원문)·AI 시스템 프롬프트(★최박사 고정)·내부 주석. 계약 +`deleteCohort`. directive 2026-07-03 승인. |
| ADR-68 | 진입 플로우 출구 보완 — `/join` 전진밖에 없는 화면(A′ 정합) | A′-3(현관 복귀)이 auth 영역(login/signup/reset)만 덮어, **`/join` 진입 플로우 5개**(`CodeInput`·`CohortPreview`·`AuthGate`·`StartGuide`·`ProfileForm`)가 `flow` variant(back·홈·로고 전무·"진단 선형성")로 남아 출구가 없었음(전수조사). 진입 스텝은 **응답 전**이라 홈 이탈이 안전(가입·차수·draft 유지·재개 가능) → `sub` 헤더로 전환(우상단 **홈 아이콘=/home** + 가능한 곳 **‹뒤로=이전 스텝**). `AuthGate` 는 /join·/signup 공유라 **`onBack` 유무로 분기**(/join=sub 뒤로+홈, /signup=flow 유지 — SignupClient 의 A′-3 현관 링크가 출구). **`ResponseRunner`(응답 중)는 제외**(흐름상 홈 이탈 어색 — 문항 이전/다음+자동 저장으로 후진·보존). `Completion`(→/home)·auth 영역·그 외(sub ‹뒤로+홈 / root 로고=홈)는 기존 충족. 계약·마이그 0. directive 2026-07-03 승인. |
| ADR-69 | 개인 리포트 PDF 저장(A4) | 코치 개인 리포트(`/coach/cohort/[id]/report/[responseId]`)에 **'PDF로 저장'** 배선 — `window.print()` + `@media print`(`@page{size:A4}`·`print-color-adjust:exact`)로 브라우저 "PDF로 저장". **무거운 라이브러리·서버 헤드리스 없이** 벡터 텍스트·SVG 차트 그대로(래스터화 0·선명). `.no-print`(앱 크롬·검수 버튼·재시도 제외) / `.print-only`(브랜드 문서 헤더 `ReportPrintHeader`: 퓨처나우·"개인 진단 리포트"·대상·차수·회차·날짜)로 화면↔인쇄 분리. 패널 `break-inside:avoid`(카드 페이지 분할 방지)·`.report-print-root` max-width 해제(A4 폭). page 가 getCohort·listCohortMembers 로 헤더 메타 조회(소유 코치 RLS 통과·실패 폴백). 기존 디자인 토큰만(디자인시스템 §8 준수). 신규 파일 `ReportPrintButton`(client)·`ReportPrintHeader`. **인쇄 페이지 순서**(2026-07-03): 차트(1p) → 해석·코칭(2p) — 화면은 해석이 위(코치 편집 편의) 유지, **인쇄에서만 flex `order` 로 재배치**(`.report-charts-block` order 1·`.report-interp-block` order 2·DOM/화면 무변경). 계약·마이그 0. directive 2026-07-03 승인. |
| ADR-70 | 멤버 하드삭제(운영자 임의) — 본부 멤버 관리 | 운영자가 **임의 멤버**를 계정째 삭제(`deleteMember` 계약+코어+`deleteMemberAction`+MemberRow 세부 내 2단계 컨펌·위험색). `delete_user`(DEFINER, 마이그 `20260704120000`): `is_admin` 게이트 + **자기삭제 금지**, `DELETE FROM auth.users` 1회 → `users_id_fkey ON DELETE CASCADE` 로 public.users·하위 전량 연쇄. **연쇄 범위**: CASCADE=cohorts(소유)·enrollments·user_profiles·user_contacts·coach_applications·**groups/group_members(SAIL 공유)**; SET NULL=responses·results·report_interpretations.edited_by(응답 고아 보존·불변 유지). 즉 **코치 삭제 시 소유 차수·그 참여가 함께 소멸·응답 고아화** — 파괴적이라 세부(#2 활동)에 소유 차수·응답 수 표시 + 컨펌에 '인도 차수 N개 함께 삭제' 고지(**인지 삭제**). SAIL 공유 영향(groups cascade)은 지휘부 승인(2026-07-03). **라이브 검증(throwaway admin/victim코치/enrollee, `set_config` 임퍼소네이트)**: 가드 3종 PASS(non-admin→'admin only'·self→'cannot delete self'), happy-path 삭제 후 victim auth/public/cohort/enroll/profile/contact **0**·응답 user_id/cohort_id **SET NULL 고아 보존**·enrollee 계정 무영향. 잔여 0 정리. 계약 +`deleteMember`·마이그 +1. directive 2026-07-03 승인. |
| ADR-71 | 멤버 세부정보(신원+활동) — 본부 멤버 관리 | 본부 멤버 리스트에서 **이름 클릭 → 세부 펼침**(신원+활동). `MemberRow`(신규 client): 펼칠 때 `memberDetailAction`(신규 액션) 1회 조회·캐시 — **신원**=전화(`getPhone` 게이트)·프로필(`getProfile`: 성별·출생연도·종교·신앙연수), **활동**=`getMemberActivity`(계약+코어→`admin_member_activity` DEFINER, 마이그 `20260704120000`): 소유(인도) 차수·참여 차수·응답 수(운영자 `is_admin` 게이트로 users RLS 밖 enrollments/responses 안전 집계). 세부 펼침이 삭제(ADR-70)의 자리(영향 고지원). `gender` 표시값은 저장값 `'남'/'여'`→'남성'/'여성' 매핑(gender_two_values 정합 — 검증 중 'male'/'female' 오매핑 발견·수정). **라이브 검증**: `admin_member_activity(victim)` = owned[`MV검증차수`]·enrolled[`MV검증차수`]·responses 1·non-admin→'admin only'. 계약 +`getMemberActivity`·+`MemberActivity`·마이그 공유(ADR-70). directive 2026-07-03 승인. |
| ADR-72 | 개인 리포트 해석 **자동 사전생성**(진단 종료 시 · 비차단) | 참여자가 진단을 마치면 `finalizeResponse` 가 `after()`(next/server)로 코치 해석 초안을 **배경 생성·저장** → 코치가 이름 클릭 시 **즉시 열람**(첫 열람 ~수십초 지연 제거, ADR-64 지연생성을 사전화). after 는 참여자 응답 반환 **뒤** 실행이라 완료 UX 지연 0; /join `maxDuration=60` 으로 배경 aiChat 예산 확보. ctx 의 supabase 클라이언트는 생성 시 캡처된 `cookieStore`(클로저)라 after 에서도 참여자 JWT 유지. **저장 경로**: 참여자는 `report_interpretations` INSERT RLS(코치·운영자) 밖 → `save_report_interpretation`(DEFINER, 마이그 `20260704130000`) 신설: 자격=**응답 소유자 OR 차수 코치 OR 운영자**, 없을 때만(ON CONFLICT DO NOTHING·멱등), 저장/기존 **행 반환**(DEFINER 라 RLS 우회 반환 → 참여자 경로도 재조회 없이 뷰 구성). `saveInterpretation`(코어)를 이 RPC 로 전환 — 코치 지연생성 경로도 동형(자격에 코치 포함). **§7·§9.4 분리 유지**: 참여자는 '저장'만, **열람(getInterpretation SELECT RLS)은 여전히 코치·운영자 전용** → 참여자는 자기 임상 해석을 못 본다. **트레이드오프**: authenticated EXECUTE 라 참여자가 자기 응답 해석을 직접 RPC 로 1회 선점 가능(자기범위·코치 '다듬기'로 복구·타인 무영향) — 서비스롤 클라이언트(앱 전면 RLS 우회 신설) 회피한 최소 확대. 실패는 무해(코치 첫 열람의 지연 생성이 폴백). **라이브 검증(throwaway coach/P/P2·set_config·SET ROLE)**: 소유자 저장 성공(H1)·멱등(재저장 H1 보존)·비소유 차단('not authorized')·코치 생성(C2)·**참여자 열람 0/코치 열람 1**(§7). 잔여 0. 계약 0(saveInterpretation 재사용)·마이그 +1. directive 2026-07-03 승인. |
| ADR-73 | 참여자 휴지통 — 차수에서 제거(오염·오등록 정리) | 코치 콘솔 차수 상세 명단(먼저 챙길 분·응답 완료·아직 안 함)의 각 행에 **휴지통**(🗑) — 눌러 **2단계 컨펌** 후 그 참여자를 **이 차수에서** 제거. `remove_cohort_member`(DEFINER, 마이그 `20260709120000`): 자격=**해당 차수 코치 OR 운영자**(is_cohort_coach OR is_admin), 삭제=responses(→alerts·report_interpretations `response_id` ON DELETE CASCADE 자동 정리)·response_drafts·enrollments **이 차수 한정**. 계정·타 차수 데이터는 불변. **불변식 예외(§10)**: responses·alerts 는 일반 경로 불변이나, 오염·오등록 정리는 관리 작업이라 코치(자기 차수)·운영자 게이트 DEFINER 로만 삭제 허용(참여자·직접 테이블 경로 불변 유지). UI: `RosterRow`(신규 — ListRow + 휴지통), `RosterMember.userId` 추가(응답자 행 id=responseId 와 별도 참여자 식별), 서버 `canManageMembers`(운영자 OR 소유 코치)로 휴지통 노출 이중 게이트. 계약 `+removeCohortMember`. **라이브 검증(throwaway coach/P/X·set_config 임퍼소네이트)**: 비권한→'not authorized', 코치가 A에서 P 제거→응답·alert·해석(cascade)·draft·참여 0·**타 차수 B 무영향(1/1)**·**P 계정 보존**·운영자 경로 정상. 잔여 0. **초기 정리**: 실제 과제 '퓨처나우2026예봄'에 오염된 테스트 계정 '통통이'(0@0.com) 계정·응답·참여 완전 삭제(응답 10→9·고아 0). 마이그 +1. directive 2026-07-09 승인. |
| ADR-74 | 운영자 콘솔 = 전체 인도자 차수 감독(수퍼바이저 뷰) | 인도자 콘솔(`/coach`·`/coach/cohorts`)이 `listCohortsByCoach(me.id)`로 **본인 소유 차수만** 조회 → 소유 차수 없는 운영자에게 '차수 없음'으로 보이던 문제. 운영자는 인도자의 수퍼바이저이므로 **모든 인도자 차수**를 봐야 함. `listAllCohorts()`(계약+코어) 신설 — coach 필터 없는 cohorts SELECT, **RLS(cohorts_select `is_admin`)가 운영자=전체·그 외=자기 스코프**로 이중 강제(비운영자 호출도 안전). 두 콘솔이 `me.role==='admin' ? listAllCohorts() : listCohortsByCoach(me.id)`. 운영자 뷰는 각 차수 **소유 인도자 이름**(`CohortSummary.coachName`, `listUsers` id→name 맵)을 카드에 표시('인도자 …') + 헤딩('모든 인도자 차수'). 운영자는 어느 차수든 들어가 **참여자·진단내역 열람**(RLS 전부 `is_admin` — 검증 9/9)·**차수 삭제**(ADR-67 운영자=임의, 예약 체험 제외)·**참여자 제거**(ADR-73) 가능 → 감독 권한 완성. **라이브 검증(set_config 임퍼소네이트)**: 이승은(운영자)이 보는 차수 3/실제 3. 계약 +`listAllCohorts`·마이그 0. directive 2026-07-09 승인. |
| ADR-75 | 차수 멤버 신상정보 — 코치=자기 조원(§10 완화)·리포트 패널 + 참여자 전화 필수 수집 | 운영자·인도자가 회원 인적사항(이름·전화·이메일·성별·나이·종교·신앙연수·참여이력)을 열람. **(1) 수집**: 참여자 전화 0건이던 원인=가입 폼이 코치 신청 시에만 전화를 받음 → `AuthGate` 전화를 **전 참여자 필수**로 승격(JoinClient 가입 직후 `setPhone` 저장, SignupClient 는 기존 저장). **(2) 접근(§10·ADR-04 완화)**: 전화(`user_contacts`)는 본인·운영자만이었으나 `cohort_member_detail`(DEFINER, 마이그 `20260709150000`) 신설 — 자격=**운영자(전체) OR 해당 차수 코치 + 대상이 그 차수 실제 구성원(참여/응답)**. 코치가 남의 user_id 를 주입해도 구성원 검사로 차단. 참여 이력은 호출자 가시 범위 스코프(운영자=전체·코치=자기 차수). `getPhone` 자체는 무변경(본인·운영자) — 완화는 이 RPC 한정. **(3) 표시**: 개인 리포트 상단 `MemberProfilePanel`(화면 전용 `.no-print` — 연락처는 공유 PDF 미포함) — 전화 `tel:`·이메일 `mailto:` 링크. 본부 멤버 상세(ADR-71)는 이미 전화 표시(수집되면 채워짐). 계약 +`getCohortMemberDetail`·+`CohortMemberDetail`. **라이브 검증(set_config 임퍼소네이트)**: 코치가 자기 조원 열람 성공(전화 010-…·이름·이메일·참여이력)·비구성원 'not authorized'·운영자 성공·외부인 'not authorized'. 잔여 0. **전화 필수화는 신규 가입부터** — 기존 참여자는 다음 `/account` 보완 전까지 공백(백필 갭). 마이그 +1. directive 2026-07-09 승인. |
| ADR-76 | 개인정보 동의(멤버 수집·이용 + 인도자 보호 서약) + 주소·계좌 수집 | 개인정보보호법 정합. **`user_consents`**(마이그 `20260709160000`, `(user_id,type)` PK · RLS 본인 기록/조회 + 운영자 조회) — type: `privacy_use`(멤버 필수)·`sensitive_use`(민감 선택)·`coach_pledge`(인도자 서약). `CONSENT_VERSION`(앱 상수)으로 약관 개정 시 재동의 판정. **① 멤버 수집·이용(필수)**: 가입 폼(AuthGate) 필수 체크 — 미체크 시 가입 버튼 비활성. 보유·이용 **1년**. **② 민감정보(종교·신앙) 선택 동의**: PIPA 민감정보라 별도 동의 — 체크해야 종교·신앙 입력란 노출·수집(미동의 시 미수집). **③ 인도자 서약**: `CoachInfoGate` 서약 체크(needPledge) — 서약 전엔 콘솔·조원 신상 접근 불가(/coach 게이트가 phone·KPC·pledge 완비 요구). **소급(기존 회원)**: `/home` `ConsentGate`(privacy_use 최신 버전 미동의 시 홈 대신 동의 화면 렌더 → 기록 후 통과). **수집 확장**: 전화 필수(ADR-75)에 더해 **주소·계좌(개근장학금)** 선택 입력 → `user_contacts`(운영자·본인 격리, contacts_self/admin_read) — **인도자 비노출**(운영 목적, `cohort_member_detail` 은 phone 만), 본부 멤버 상세(운영자)만 표시. 계약 +`recordConsent`·`listMyConsents`·`getContactDetail`·`setContact` · 타입 `ContactDetail`·`ConsentType`·`ConsentRecord`. **라이브 검증(set_config·SET ROLE)**: 본인 동의 기록·조회 성공·**타인 기록 RLS 차단**('violates row-level security')·운영자 조회 성공. 잔여 0. **1년 자동 파기 잡은 후속**(이번 범위=동의·기간 기록까지). 마이그 +1. directive 2026-07-09 확정(문안·소급 승인). |
| ADR-77 | 코치 리포트 상세화 — 인도자 전용 숨은 층(함정·믿음) + 참여자 원응답(운영자 포함) | ORDER `CC_ORDER_coach_report_detail_v2`(2026-07-04) 실행. 두 공백을 **표시만**으로 닫음(채점·AI 입력·참여자 경로 불변). **2면 함정·믿음**(Phase 1): `labels.ts` +`TRAP_AXES`(D1 관성·D2 준비·D3 안주)·`FAITH_LABELS`(F1 의미·F2 실행). `FacilitatorPanel`(신규) — scoring 이 이미 낸 `trap`(주 함정 강조 + D1~3 원점수)·`faith`(값 또는 '무응답') 표시, ReportScreen 하단(주관식 다음), 중립 톤(care 금지 §2-4). **3면 참여자 원응답**(Phase 2): `resp.answers`(추가 조회 0)를 `copy.ts`(`itemPrompts`·`bipolarLabels`·`askPrompts`·`likertLabels`·`blockIntros`) 원문으로 섹션 렌더(들어가며·나침반·지금의 나·믿음·간격·주관식), ReportScreen 다음 접이식. **열람 범위(§4.3 최박사 확인=운영자 포함, 2026-07-13)**: 원응답=리포트 경로 권한(차수 코치+운영자) 재사용 — ADR-74 수퍼바이저·동의서(440f985) 열람주체 정합. 이에 진단지 약속을 정직하게 갱신: `StartGuide`·`ResponseRunner` '인도자 한 사람만 봅니다' → '인도자와 운영자만 봅니다'. **경계 준수**: `scoring.ts`·`interpretation.ts`(AI 입력 — 함정·믿음·원응답 전량 미입력, E1~E3 200자 클립만) 불변, 참여자 `MirrorView`/`participantMirror` 불변(정성 '믿음 한 줄'은 F1/F2 값·D코드 아님 → 유지). 테스트(§5): 패널 렌더·배치 순서·미러 회귀가드(D/F 코드·트랩 라벨·원응답 문항 부재)·AI 입력 가드·null 처리. **Phase 3(로스터 주 함정 태그) 완료**: 차수 상세 명단(RosterRow)에 주 함정 라벨(관성/준비/안주) 중립 pill — 소그룹 편성 참고. 채점은 futurenow-aware 페이지(`/coach/cohort/[id]`)가 이미 로드된 답안으로 사용자별 최신 응답 score(추가 쿼리 0·in-memory), `trap.primary`→라벨을 `trapByUserId` 로 제네릭 `buildCohortRoster` 에 주입(rosterModel 인스트루먼트 비결합 유지 — 문서의 'rosterModel이 채점' 대신 경계 보존형 채택). futurenow 차수만·응답자만·미주입 시 태그 0. 계약 0·마이그 0. directive 2026-07-04(v2 ORDER) 실행. |
| ADR-78 | 리포트 신상정보 버튼→팝업 + 주소 코치 열람 | 코치가 진단결과를 보다 조원 인적사항을 바로 확인(홈→멤버관리 왕복 제거). 개인 리포트 툴바 **'신상정보 보기'** 버튼 → 모달(`MemberProfileButton` 신규·client, ESC·배경·✕ 닫기)에 `MemberProfilePanel`(이름·전화·이메일·**주소**·성별·나이·종교·신앙연수·참여이력). 화면 전용(연락처 PDF 미포함). **주소 열람 확대(ADR-76 완화)**: `cohort_member_detail`(마이그 `20260713120000`, DROP+재생성으로 컬럼 추가)에 `address` 추가 — 목양 방문 목적상 자기 차수 코치·운영자에게 개방(동의서 440f985 열람주체=본인·인도자·운영자 정합·전화와 동일 스코프). **계좌(운영·장학금)는 미포함** — 본부 멤버상세(운영자·`getContactDetail`)만 유지. 기존 인라인 패널(ADR-75)을 버튼+팝업으로 전환. 계약 `CohortMemberDetail` +`address`. **라이브 검증(set_config 임퍼소네이트)**: `cohort_member_detail` 이 (name·phone·address) 반환·에러 0. 마이그 +1. directive 2026-07-13 승인. |
| ADR-79 | 운영자 임시 비밀번호 리셋 UI(계정 복구) | 이메일 발송(Resend 도메인 미검증)으로 자가 비번 재설정이 막힌 회원을 운영자가 직접 복구. 본부 멤버 상세(ADR-71 펼침) **신상정보 맨 아래**에 '비밀번호 리셋 (임시)' 입력칸+`[비번 리셋]` → **1단계 확인**(대상·설정값 명시) → '변경'. `admin_set_temp_password`(DEFINER, 마이그 `20260713140000`): `is_admin(auth.uid())` 게이트·최소 8자·`auth.users.encrypted_password = extensions.crypt(pw, gen_salt('bf',10))`(pgcrypto bcrypt). **auth.users 쓰기(SAIL 공유 테이블)**: 기존 비번 컬럼만 갱신(스키마 무변경)이라 SAIL 무영향 — 운영자 게이트 DEFINER 로만. 성공 시 설정 비번을 **토스트로 1회 표기**(운영자가 사용자에게 전달·저장 안 함) + 입력칸 비움, 로그인 후 변경 안내. **강제 변경(다음 로그인)은 후속** — 이번 범위=복구 경로 확립. 배선: 계약 +`setMemberPassword`·코어·`setMemberPasswordAction`·`MemberRow`(입력·확인 UI)·`AdminMembers`/`AdminClient`(`onSetPassword` 스레드, 토스트는 provider 있는 AdminClient 소유 — useToast 무프로바이더 예외 회피 부모핸들러 패턴). **라이브 검증(set_config·SET ROLE 임퍼소네이트·throwaway)**: 운영자 설정→비번 매칭 true·비운영자→'admin only'·8자 미만→'password must be at least 8 chars'. 잔여 0. 계약 +`setMemberPassword`·마이그 +1. directive 2026-07-13 승인. |
| ADR-80 | 회차 갈무리는 `responses` 밖에 둔다 — `checkins`·`cohort_sessions` 신설 | 7주 세미나 매 회차 종료 후 참여자가 스스로 정리하는 **갈무리 카드**. 진단이 아니라 **수정 가능한 문서**(채점·리포트·AI 입력 미배선). `responses`에 넣지 않는 3근거: (1) `responses`는 불변(UPDATE/DELETE 정책 없음), (2) `wave`가 pre/post로 잠겨 페어링 인덱스·채점·비교 파이프라인이 전체를 훑음 → 회차 값 혼입 시 사전-사후 비교 오염, (3) `cohorts.instrument_id` 단일값이라 별도 인스트루먼트 등록 불가. **테이블(마이그 `20260727100000`)**: `cohort_sessions`(차수별 회차 일정 — 날짜만, 편성은 코드 상수)·`checkins`(`UNIQUE(cohort,user,session)`+upsert — ADR-33 append 와 다른 규약, 성격=되돌아와 고쳐 쓰는 문서). **쓰기 전량 DEFINER RPC**(`checkin_save`/`checkin_submit`/`checkin_mark`·`seed_cohort_sessions`) — `is_cohort_member` 게이트. **D1(권한 격리)**: 이 프로젝트는 default privileges 로 신규 테이블에 authenticated 전체 write 를 자동 부여하므로, `checkins` write 를 **명시 REVOKE**(마이그 `20260727110000`) — 참여자의 `submitted_at` 위조·`edit_count`/`prompt_count`(1기 보정 근거) 조작 차단. SELECT 만 GRANT + DEFINER RPC 로만 쓰기(테이블 REVOKE 는 유효, 컬럼 REVOKE 무효와 다름). `has_content`는 checkin_save 가 쓰기 시점 계산(빈 행 존재≠작성 중 — 안내만 받은 사람 오분류 방지). `is_late`는 미저장·`submitted_at>closes_at` 파생. **일정 시드는 개설이 아니라 인도자가 날짜 아는 시점**(콘솔 회차 일정 UI) — `cohorts` 에 시작일 두면 `cohort_sessions` 와 이중 진실·플레이스홀더 날짜는 게이트 오작동. '일정 미등록'은 정상 상태(참여자=담담 안내·콘솔=조치 항목). **`my_cohorts` 8→11필드**(`open_session_no`·`open_session_submitted`·`open_session_has_content` 추가, `post_opened`·`joined_at` 보존 — DROP+CREATE 회귀 주의). **배포 순서(D2)**: `RETURNS TABLE` 변경이라 마이그→원격검증→앱 배포(역순 시 `openSessionNo=undefined`→`/checkin/undefined` 파손), 매퍼 `?? null`/`?? false` 방어. 계약 +`CohortSession`·`CheckinRecord`·`MyCohortSummary`+3필드·`CoreContext`+9메서드. **경계 zod**(§9·S4): 코어는 인스트루먼트 어휘 무지 — 일반 구조 한계(문자열 2000자·배열 8·32KB)만. **라이브 실증(set_config·SET ROLE 임퍼소네이트·throwaway 2차수)**: seed 7행·has_content 공백false/내용true·submit·**직접 INSERT/UPDATE 거부(permission denied)**·member 본인 SELECT 1·sessions INSERT RLS 거부·prompt 상한 2·타차수코치 0·담당코치 1·코치 UPDATE 거부·운영자 1·seed 멱등·잔여 0. `has_column_privilege` INSERT/UPDATE=false. 마이그 +2. directive 2026-07-27 승인. |
| ADR-81 | 회차 갈무리 화면 — 차수 홈 신설 + 1회차 카드 + 노출 정책(상시 진입로·모달 비강제) | 갈무리 진입로를 **세 층**으로: 현장 QR(주력)·인도자 카톡 링크(결석자)·앱 내 안내(부수). 앱 내 안내는 회차당 두 번 상한(`prompt_count` 서버 판정)·'나중에'에 비용 0. **차수 홈 신설**(`/my/cohorts/[cohortId]`) — 카드 하나에 진단 둘+갈무리 일곱 못 담음. **시각 위계 3단**: 이번 주 갈무리(accent·primary)·진단(중립·ghost)·지난 회차(접힌 줄) — 진단과 갈무리 동급 배치 금지(“매주 진단받는다” 오인→사회적 바람직성 방어 유입 차단). **1회차 카드**(`/checkin/[session]`): `session1.ts` 원문 상수, `ResponseRunner` 미재사용(순서 고정·제출 후 열림), 자동저장(디바운스 2s/blur)·**단일 버튼 save→submit**(R2, 한 서버액션 순차)·이탈경고 없음·완료 상태(자기 문장 되돌려주기). 필수 4칸 카운터(`checkinFilledCount`), confidence 슬라이더 미선택(`—`)→`null` 시작. **상태 판정**: 미작성(행없음 or `hasContent===false`)·작성중(`hasContent && !submitted`)·제출(`submitted`) — 빈 행 오염 방지(S2). **일정 미등록='준비 중'(정상)**: 참여자 담담 안내·인도자 콘솔이 조치 항목(회차 일정 UI: `seedCohortSessions` 시작일→7행·미등록 경고). **QR 짧은 경로**(`/c/[code]/[session]`): 코드→차수 해석→미인증 `/login?returnTo`→비멤버 `/join`→멤버 카드. **returnTo 배선 신설**(B3): `loginOutcome`+`safeReturnTo`(화이트리스트 상대경로만·절대URL/`//`/`\\`/스킴 거부→`/home`), 단위테스트로 오픈리다이렉트 방어 고정. 신규 위젯 `MultiChoiceChips`(인스트루먼트 중립·배타·max 축출). 목록 카드(`MyCohorts`) 버튼 우선순위에 '이번 주 갈무리' 2순위 삽입(사전진단 우선 유지). **범위**: 1회차만(2~7회차 문항·자동리마인드·조공개화면·AI요약·계측조회화면 제외). **전면 안내(Phase 6) 배너 UI 는 후속**(prompt_count 인프라·`markCheckinPrompted` 배선은 데이터계층서 완비). 테스트: `safeReturnTo`·`nextChipSelection`·`loginOutcome` returnTo·`interpretation` 어휘 회귀. 계약 0(ADR-80 재사용)·마이그 0. directive 2026-07-27 승인. |
| ADR-82 | 1회차 문안 v2 + 시드 카운트 반환 + 공유동의 인도자 대면 이관(라이브 후 개정) | 최박사 실화면 검토 3건을 한 배치로. **F1(시드 결함)**: `seed_cohort_sessions`가 `ON CONFLICT DO NOTHING`인데 액션이 무조건 `ok:true`라 재시드가 조용한 무효 → 반환형 **void→integer(삽입 행 수)**(마이그 `20260728100000`, DROP+재생성·REVOKE/GRANT 재부여·anon EXECUTE 없음 확인). 계약 `seedCohortSessions`만 `Promise<number>`(그 외 시그니처 불변)·액션 `{ok,inserted}`·0건 문구. 날짜 수정은 이미 회차별 편집 UI(`upsertCohortSessions`, ADR-81 후속 보완분)로 가능 — 편집기가 재시드를 대체. **F6(입력칸 미표시)**: `ui-input` 클래스 미정의로 필수 포함 6칸 안 보이던 것 — inline 박스 스타일(AuthGate `inputStyle`과 동일 토큰)로 이미 수정(ui- 전수 감사 미정의 0). Field 라벨을 `t-body-lg`→필드라벨(15/500)로 낮춰 '선택' 상자가 필수 구역보다 커 보이던 위계 역전 교정. **C2(문안 v2)**: 책 진행(재해석→존재가치) 순서로 재배치 — **바꿔 쓴 문장 쌍**(`desire_from`/`desire_to`, 신규 필수)·존재가치 선언문 틀·`scene` 은유 제거(카드는 혼자 열림)·`reframe`→`letter_line`(응답 0건이라 이관 없음)·2면 '한 걸음' 뜻 소개·3면 인도자 상자 라벨 질문형·**공유 동의 UI 삭제**. 필수 4→**5칸**(`checkinFilledCount`). 책 페이지 좌표는 **문장 끝 괄호**(책 배포됨·워크북 미배포라 '워크북' 금지). **공유 동의 → 인도자 개별 대면 이관**: 카드는 혼자·밤에 열려 자기개시에 최악, 쓰이지 않는 칸은 비용. `share_consent` **컬럼은 남기고 미사용 주석**(v1.2 여지). 인도자 현황 '나눔'(익명)→**'문장 모아 보기'**(실명+갈망·존재가치·기억) — 코치는 이미 갈무리 전량 열람(RLS)이라 새 노출 아님, 동의는 대면으로 질 높임(가이드 문서는 지휘부 몫). 테스트: `checkinFilledCount` 5칸·갈망쌍·금지어·`share_target` 부재. 마이그 +1(seed 반환형)·계약 1줄. directive 2026-07-28 승인. |
| ADR-83 | 편지 사진 첨부 — 참여자 기록 보관(비공개 Storage·경로 RLS·EXIF 제거) | 참여자가 종이에 쓴 '과거의 나에게 편지'를 촬영·첨부해 보관. **저장소 결정: Supabase Storage**(Cloudflare R2 대비 — 기존 RLS 헬퍼 재사용·같은 auth·최소 코드·소규모라 egress 차이 무의미. 대용량·고트래픽 되면 R2 재검토). **비공개 버킷 `checkin-photos`**(마이그 `20260728120000`) + **경로 규약** `{cohort_id}/{user_id}/{session_no}/{uuid}.jpg`. **Storage RLS**(`storage.objects`, `storage.foldername` 파싱): INSERT=본인(경로 user=uid)+차수 멤버 / SELECT=본인 OR 차수 코치 OR 운영자 / DELETE=본인 OR 운영자(인도자 삭제 불가) / UPDATE 없음. **열람 본인·인도자·운영자 · 삭제 본인·운영자 · 보관 본인 삭제 전까지 영구**(ADR-76 1년 파기의 명시적 예외). **업로드 바이트는 클라이언트 직접**(`LetterPhotos` — 브라우저 supabase): `createImageBitmap`+canvas 재인코딩으로 **EXIF(GPS 등 위치) 제거**·리사이즈(장변 2000px·jpeg 0.85)·장당 상한, **최대 3장**. 서빙은 **만료 signed URL**(1h). 코어 `+listCheckinPhotos`(list+sign, 코치 현황용 서버 경로)·`+deleteCheckinPhoto`(운영자). 인도자 '문장 모아 보기'에 사진 썸네일(운영자에게만 삭제 ×). 편지 문안을 현재형("촬영해 첨부하셔도 됩니다")으로 교체. **동의**: 업로드 지점 **고지 안내**(누가 보는지·삭제 전 보관·위치정보 제거)로 informed consent — 형식적 `photo_archive` 동의기록은 후속(user_consents CHECK 확장 필요). **고아 정리 gotcha**: 참여자/차수 하드삭제(CASCADE) 시 Storage 객체는 자동 삭제 안 됨 → 삭제 경로는 즉시 제거하나 **주기 sweep 백스톱은 후속**. 라이브 RLS 실증(본인/코치/타차수코치/운영자/외부인 업로드·열람·삭제). 마이그 +1·계약 +`CheckinPhoto`·+2메서드. directive 2026-07-28 승인. |
| ADR-84 | 참여자 이동/삭제(운영자) — 등록만 이동·소프트 삭제(휴지통)·집계 등록 기준 | 운영자가 참여자를 **A차수→B차수 / 미배정(체험 진단 JOINF) / 휴지통(삭제)** 로 옮긴다. **핵심 원칙: 등록(enrollment)만 이동, 응답·갈무리는 생성 차수에 남긴다(불변 보존).** `move_cohort_member(user, from, to)`(DEFINER·`is_admin` 게이트, 마이그 `20260728140000`): enrollment.cohort_id 이동, 대상에 이미 있으면 원본만 제거(병합), from 미등록이면 예외. **삭제 = 휴지통 차수로 이동**(소프트·복원 가능) — 휴지통은 시드된 특수 차수(코드 `TRASH`·운영자 소유). **복원 = 휴지통→미배정/차수로 이동**(응답이 원 차수에 그대로 있어 무손실). **집계 clean(#4)**: 이동/삭제된 사람의 응답이 DB에 남아도(불변) `buildCohortRoster`가 **등록 기준 필터**(등록된 멤버의 응답만 집계)로 원 차수 명단·통계에서 제외 — 인도자 '문장 모아 보기'도 등록 멤버만. **`my_cohorts`에서 휴지통 제외**(소프트 삭제된 사람이 '내 세미나'에서 휴지통을 보지 않도록). **`remove_cohort_member` 보강**(영구삭제=휴지통 비우기): ADR-80 이후 생긴 **checkins 미삭제 구멍**을 메움(checkins도 삭제). **UI**: 차수 상세(운영자)에 '참여자 이동' 섹션 — 이름별 대상 드롭다운(같은 진단 차수+미배정+휴지통, 현재 제외)+[이동]. 휴지통 차수를 열면 같은 UI로 복원(미배정 등으로 이동)·영구삭제(🗑). 권한 운영자 전용. **라이브**: 휴지통 존재·비운영자 차단('admin only')·이동·병합 검증. **후속**: 그룹 리포트 집계도 등록 기준 필터·Storage 사진 고아 sweep. 마이그 +1·계약 +`moveCohortMember`. directive 2026-07-28 승인. |
| ADR-85 | 회차 갈무리 세션 레지스트리 + 2회차 카드 + 되비추기 + 1회차 안전 보완 | 3~7회차를 **파일 하나 + 레지스트리 한 줄**로 늘리기 위한 일반화 + 2회차 신규. **레지스트리**(`instruments/futurenow/checkin/index.ts`): `CheckinSession` 타입 + `getCheckinSession(n)`(미등록 회차 `null`). `session1`을 이 형태로 통일 — 필드명 `identitySentence`→`identity`(문안·응답키 `identity_sentence` 불변), 판정 `checkinFilledCount`/`CHECKIN_REQUIRED_TOTAL`을 객체 내부(`filledCount`/`requiredTotal`)로 이관, `summaryFields` 추가(구조 통일이며 렌더 문자열 델타 0 — §7-2). **카드 일반화**: `CheckinCardClient`가 회차번호로 분기하지 않고 **블록 존재**로 렌더(`copy.today.desire` vs `futureArea`, `copy.step.lastStep`/`share` 유무). **지시서 §4-3 이탈(견고화·지휘부 보고)**: ORDER는 "`copy`를 prop으로 받는다"였으나 `copy`에 함수(`filledCount`·`cover.counter`)가 있어 서버→클라 prop 직렬화가 깨진다(digest 3203392472, 3bf0025에서 이미 겪은 함정) → 카드가 `getCheckinSession(sessionNo)`를 **직접 import**(레지스트리는 순수 모듈이라 클라 import 안전). §7-5 목표(`CHECKIN_SESSION_1` import 부재·블록 존재 렌더)는 그대로 충족. `page.tsx` 가드 `sessionNo!==1`→`getCheckinSession()===null`. 인도자 '문장 모아 보기' 열을 `summaryFields`로(회차별 열 전환 — 1회차 갈망/존재가치/기억, 2회차 영역/인생의 한 문장/장면). `SummaryField`는 단일키 또는 **한 쌍**(갈망 A→B) union으로 확장(ORDER의 `{key,label}[]` 힌트를 1회차 쌍 표현 위해 견고화). **2회차 문안**(`session2.ts`): ① 가슴 뛴 영역 — 기존 `MultiChoiceChips`를 `max=1`로 재사용해 **단일 문자열**(`future_area`) 저장(배열 아님·§7-8)+`future_line`, ② `identity_statement`(1회차 존재가치와 키 구분), ③ 마음(설렘·막막함…), ④ 심화(`future_scene`·`letter_line`—키·형식을 1회차와 같게 거울 구조·사진경로 회차별 분리), ⑤ 지난 한 걸음 결산 `last_step_result`(칩 단일선택=필수 1칸)+`last_step_note`(선택), ⑥ 다음 한 걸음(1회차 동일)+**공개 토글**(`step_private` 컬럼·`checkin_save`의 `p_flags->>'stepPrivate'` 기존 배선·양방향·기본 공개), self_note. **필수 6칸**. **되비추기(Phase 4·§6)**: `page`가 `getMyCheckin(cohortId, sessionNo-1)`(신규 코어 메서드 0)로 지난 존재가치 문장(그 회차 레지스트리 `identity.key`로 추출)·지난 한 걸음을 읽기전용 회색으로 카드에 전달 — ② 위 문장 되비추기(값 없으면 블록 생략), ⑤ 위 한 걸음 되비추기(없으면 대체 문구), 미제출이어도 값 있으면 표시·조회 실패 무해(`catch→null`). **1회차 안전 보완 6건(§3)**: self_note 보조문구 통일('꼭 칭찬이 아니어도…'—전 회차 공통), **사진 서버 상한**(마이그 `20260729100000` — `storage.buckets` file_size_limit 3MB·allowed_mime_types jpeg, 클라 리사이즈를 서버가 이중 방어), 사진 열람 고지+오류 분기(형식/크기), desire 보조문구·placeholder 교정, 슬라이더 미선택 흐림(opacity), confidence leftLabel '아직 자신 없음'. **§5-3 stale(보고)**: ORDER가 "그대로 둔다"던 1회차 공개 안내('나와 인도자만 봅니다…')는 ADR-82(`de1c840`)에서 이미 삭제됨 → 없는 채로 둠(§2-4 미지정 문자열 불변). **§9 일반화 경계 보고**: 3~7회차가 기존/이번 블록형(문장·칩단일·심화·한걸음·토글)만 쓰면 `sessionN.ts`+레지스트리 한 줄로 끝. 완전 새 입력 위젯이 나오면 그때 카드에 블록 분기 하나 추가 필요. **경미 보고**: 스텝 되비추기 caption('지난 시간의 한 걸음')은 §6가 스텝용 caption 미지정이라 서술형으로 신설. 사진 고지에 위치정보 제거 안심 문구를 꼬리로 보존(ORDER 문구+1절). **검증**: tsc 0·eslint 0(내 파일; `contracts/instrument.ts` 기존 경고 무관)·vitest 348(session2 신규 12)·build 성공. 버킷 상한 원격 실조회(3145728·`{image/jpeg}`). 계약 0(ADR-80 재사용)·마이그 +1(버킷). directive 2026-07-29(CC_ORDER_checkin_session2) 승인. |
| ADR-86 | 회차 갈무리 **전체 열람** — 본인 열람(read 모드) + 인도자 명단 행 펼침 | 두 공백을 함께 닫는다. **(1) 작성자 본인이 자기 갈무리 전 항목을 볼 방법이 0**(제출 후 done 화면은 `self_note`·`step_what`·`step_when` 3줄뿐 — 나머지는 '고쳐 쓰기'로 편집 폼을 열어야 보였고, 차수 홈의 '지난 회차 N개'는 링크가 아닌 회색 캡션이라 지난 회차 진입로 자체가 없었다). **(2) 인도자도 전 항목을 볼 방법이 0**(명단·한 걸음·문장 모아 보기 3섹션뿐 — `mood`·`mood_custom`·`letter_line`·`step_blocker`·`confidence`·`need`·`suggestion`·`future_line`·`last_step_*` 는 표시 경로가 없었다). **성격 규정: 새 노출이 아니라 이미 가진 권한(RLS)의 표면화** — `checkins_select` 가 이미 `user_id=auth.uid() OR is_cohort_coach OR is_admin` 이고, 저장 버튼 위 고지 `save.notice2`('적으신 내용은 인도자와 운영자가 읽습니다.' session1.ts:116·session2.ts:131)가 1·2회차 공통으로 이미 존재한다 → **문안(sessionN.ts) 델타 0**. **데이터는 이미 와 있었다**: `listCohortCheckins` 가 `CHECKIN_COLS`(answers jsonb 포함)를 `cohort_id`·`session_no` 두 조건으로만 select 한다(core/context.ts:1002-1010) → **계약 0·코어 0·마이그 0·신설 라우트 0·safeReturn 0**. **읽기모델**(`instruments/futurenow/checkin/readModel.ts` 신설): `buildCheckinRead(sessionNo, answers, flags, audience)` 가 레지스트리를 카드 순서로 순회해 `ReadBlock[]`(pair·text·list·scale·flag·note·group·hidden)를 만든다. 규율 셋 — ① 회차번호로 분기하지 않고 **블록 존재**로(ADR-85 동일 원칙) ② **응답 키 리터럴 0**(전부 `copy.*.key` 경유) ③ **한국어 문자열 리터럴 0**(라벨·보조문구는 전부 레지스트리 원문 — 문안 이중진실 금지. 소스 정규식 검사로 회귀 고정). 렌더러 `CheckinReadView.tsx` 를 참여자·인도자가 **공유**한다. **참여자(모드 둘·URL 하나)**: `done`→**`read`** 로 재정의. 초기 모드는 순수 함수 `resolveCheckinMode`(`checkin/[session]/mode.ts` 신설 · 단위테스트 7)가 정한다 — ① `?edit=1` → edit ② 행 없음 → edit(현장 QR 첫 진입) ③ **`!closed && 미제출` → edit**(열린 회차를 쓰다 만 사람은 이어 쓰러 온 것 — ADR-81 주력 경로 보존) ④ 마감된 빈 행 → edit(뒤늦게 쓰러 갈 길) ⑤ 그 밖 → read. **`closed` 조건이 두 요구를 동시에 만족시킨다** — '쓰다 만 지난 회차'는 읽기로, '쓰다 만 이번 주 회차'는 쓰기로 열린다(초안 검토에서 QR·목록 버튼이 읽기 화면에 착지하던 회귀를 이 규칙으로 닫았다). 작성 의도가 확정인 진입로(차수 홈 accent 버튼 미제출분 · `MyCohorts` '이번 주 갈무리')는 `?edit=1` 을 명시한다. 완료 문구(`done.title`)는 **`justSubmitted` 일 때만**(3주 전 갈무리에 '저장했습니다'는 거짓말). 전체 항목은 접힌 줄로 펼친다. 차수 홈 '지난 회차 N개' 캡션 → **접힘 목록 링크**(`PastSessionsClient` 신설 · 시각 위계 3단 최하위 유지 · 서버 왕복 0), 대상은 마감된 회차 중 **레지스트리 등록분만**(미등록 회차를 링크로 내보내면 '준비 중'에 부딪힌다. 캡션 문자열 불변, N 의미만 좁아짐). 차수 홈 accent 버튼은 **문구와 목적지를 일치**시킨다: 쓰러/이어 쓰기 → `?edit=1`, 제출됨 → '적으신 것 보기'(read). **계측 무오염(제1원칙)**: read 경로에서 `checkin_save`·`checkin_submit`·`markCheckinOpened` **미호출**, `deep_opened` 미갱신(심화를 처음부터 펼쳐 토글 자체를 없앤다 — `checkin_save` 의 `deep_opened` 는 단방향 OR 이라 한 번 true 면 영구). `markCheckinOpened` 는 **edit 모드 진입 시점**으로 좁힌다(ref 가드·1회) — 지난 회차를 '읽으러' 들어온 진입이 섞이면 `first_opened_at` 이 영구 오염된다(1회 고정·되돌릴 수 없음. ADR-80 1기 보정 근거). **되비추기(ADR-85 §6)는 read 에 싣지 않는다** — '지금 쓰는 것을 돕는' 작성 보조이지 기록이 아니고, 지난 회차 열람이 생겨 중복이다. `getMyCheckin(sessionNo-1)` **조회 자체를 edit 일 때만** 수행(왕복 감소). 그래서 read 의 '고쳐 쓰기'는 **상태 토글이 아니라 `?edit=1` 로의 실제 이동**이어야 한다 — `setMode('edit')` 로 두면 서버가 `prior` 를 다시 계산하지 않아 2회차 편집 폼이 1회차 기록이 있는데도 `mirrorEmpty`('지난 한 걸음이 남아 있지 않아요')라는 **거짓 문구**를 띄운다(초안 검토가 잡아낸 ADR-85 §6 회귀). **인도자**: 명단 행을 **그 자리에서 펼친다**(`RosterDetail` 신설 · 라우트 이동 0 · **서버 왕복 0** — 데이터가 이미 서버 메모리에 있다). 사람 축은 `?open={userId}`, 회차 축은 기존 `?session=N` 탭이 `open` 을 물고 간다. 펼친 내용은 **열었을 때만 렌더**한다(접힌 12명 전문이 DOM 에 상주하면 어깨너머 노출·Ctrl+F 면적이 커진다). **펼침 가능 여부는 '갈무리 행 존재'로만 판정한다(`hasRow`) — 내용 유무로 갈리면 익명 부채널이 된다**: 익명 '바라는 점'만 쓴 사람은 개인 상세가 비므로, 내용 기준으로 화살표를 감추면 명단만 훑어도 그가 익명 제보자임이 드러난다(초안 검토 지적). prop 은 **순수 데이터만** — `copy` 객체·함수를 경계 너머로 넘기지 않는다(ADR-85 digest 3203392472 재발 방지). 섹션 2개 신설: **부탁**(`need` · 명단 **위**, 돌봄 우선 · 수신자가 문안에 인도자로 명시된 유일한 자유서술이라 실명 — 지금까지 읽는 경로가 0이어서 **약속 불이행 상태였다**), **이름 없이 온 말**(익명 `suggestion` · 화면 최하단, 명단과 최대 이격 · 캡션은 참여자가 읽고 켠 고지 원문 그대로 · 정렬키 `checkin.id`(gen_random_uuid)라 명단순·`userId`·작성 시각과 무관하고 회차마다 순열이 달라진다). **'문장 모아 보기'는 덮어쓰지 않고 나란히 둔다** — ADR-82가 준 성격(나눔 도구·개별 대면 동의)과 펼침(목양 도구)은 목적이 다르다. `self_note` 는 펼침에만 나오고 `summaryFields`(낭독 후보)에는 넣지 않는다(코드 델타 0 — 지금도 없다). 펼침에 나눔 CTA·복사·내보내기·PDF 를 두지 않는다. **지휘부 확정 프라이버시 3건(2026-08-02)**: ① `self_note` 인도자 **실명 표시**(개별 비공개 약속 문구 없음 · notice2 포괄. 단 본인 화면 accent 인용구 장치는 유지) ② `suggestion` **참여자 토글 존중**(`suggestion_anon=true`→익명 섹션 / `false`→실명. 무조건 익명화하지 않는다. **익명분은 이름이 붙는 자리에 절대 두지 않는다**) ③ `step_private=true` → 인도자에게 **⑥ 블록 전체**(`step_what`·`step_when`·`step_blocker`) 제외 — 토글 문안이 '이번 한 걸음은 나만 볼게요'로 필드가 아니라 **블록**을 가리키므로, 표시 경로가 없던 `step_blocker` 만 새로 노출하면 참여자가 켠 토글을 우회하는 셈이다. 자리 표시는 **참여자가 켠 토글 원문 그대로**(신규 문안 0) — 인도자가 '안 썼다'와 '비공개로 썼다'를 구분해야 이탈 조기경보에 거짓 음성이 없다. ⑤ '지난 한 걸음 결산'(`last_step_result`·`last_step_note`)과 `confidence`(구분선 아래 3면 마무리)는 **사정권 밖** → 표시. `need` 는 익명화 대상이 아니다(익명 부탁은 성립하지 않는다 — 누구의 부탁인지 알아야 들어줄 수 있다). **권한 등급으로 뚫지 않는다** — 운영자도 코치와 동일(참여자에게 한 약속이지 역할 통제가 아니다). **표시 규율**: `confidence` 는 숫자+양끝 라벨만(막대·게이지·색·백분위·평균·정렬키 금지 — 문안이 '낮게 답하셔도 아무 일 없습니다'라 약속했고 ADR-80이 '채점 대상 아님'을 못박았다) **[ADR-94 정정 주: 근거 둘 중 앞엣것은 죽었다 — ADR-91 D 가 그 문안을 '낮게 적힌 숫자가 인도자에게는 가장 쓸모 있습니다…'로 교체했다. 그러나 뒤엣것(ADR-80 '채점 대상 아님')은 문안과 무관하게 살아 있고, 금지 항목 여섯이 공유하는 성질(숫자를 등급으로 바꾸는 표현)도 그쪽을 가리킨다. 따라서 **이 규율은 유지된다.** 원 인용을 지우지 않고 정정 주로 남기는 이유는, 지우면 '근거 하나가 죽었다'는 사실 자체가 문서에서 사라져 다음 사람이 같은 부분 인용을 반복하기 때문이다.]**, `mood` 는 집계·분포·추이 금지(ADR-81 '매주 진단받는다' 오인 차단), `last_step_result` 는 경고색·판정·정렬키 금지(ADR-85 '네 칸 무게 동일'), `contact_request` 는 `help`('짧은 안부 연락입니다. 코칭 세션이 아닙니다.')를 함께 실어 '코칭 신청' 오독을 막는다. 계측 원값(`edit_count`·`first_opened_at`·`prompt_count`·`has_content`)은 어느 화면에도 노출하지 않는다. **ADR-84 필터 보정(범위 밖 1줄 · 승인)**: `steps` 에만 빠져 있던 등록멤버 필터를 채워 신설 섹션들과 기준을 맞춘다(이동·삭제된 참여자의 `need` 가 실명으로 되살아나지 않게). **`viewed_at` 계측 컬럼 신설은 명시적으로 기각한다** — 제1원칙이 '열람은 계측을 오염시키지 않는다'인데 열람용 계측을 새로 만드는 것은 자기모순이다. 필요해지면 별건으로 올린다. **회차 확장**: 3~7회차는 `sessionN.ts` + 레지스트리 한 줄이면 열람 화면 **0줄 수정**(완전히 새로운 입력 위젯이 나올 때만 `ReadBlock` kind 하나 증가 — ADR-85 §9가 예고한 경계). **신규 문안 4건**(전부 degrade 경로 있음): 참여자 '적으신 것 모두 보기'·'적으신 것 보기', 인도자 섹션 제목 '부탁'·'이름 없이 온 말'. **§6.2 가시성 매트릭스에 갈무리 4행 추가**(코드에만 있는 프라이버시 규칙을 남기지 않는다). **사진은 '적은 것'으로 친다** — 글은 한 줄도 없이 종이 편지만 촬영해 붙인 갈무리가 빈 화면이 되지 않도록 열람 게이트를 `blocks.length > 0 || photos.length > 0` 로 둔다(초안 검토가 잡은 사진 삼킴). **구현 후 다중 에이전트 검토(4렌즈 19에이전트)에서 확인된 결함 5건을 푸시 전 전부 수정**: ① 사진 삼킴(뷰·카드 두 게이트) ② `prior` 미재계산(고쳐 쓰기를 앵커 이동으로) ③ QR·목록 진입이 읽기에 착지(모드 규칙에 `closed` 도입) ④ 익명 부채널(`hasRow` 판정) ⑤ 테스트 공백(`mode.test.ts` 7 · `CheckinReadView.test.tsx` 9 신설). 기각 5건. **검증**: tsc 0 · eslint 0(내 파일. `contracts/instrument.ts` 기존 경고는 무관) · vitest **380**(`readModel.test.ts` 26 — 20키 전량 노출·라벨 문자단위 일치·리터럴 0 소스검사·가시성 3정책·회차 확장 / `mode.test.ts` 7 / `CheckinReadView.test.tsx` 9) · `next build` 성공. 신설 7 · 수정 6 · 문서 1. 계약 0 · 코어 0 · 마이그 0. directive 2026-08-02 승인. |
| ADR-87 | 갈무리도 참여자를 따라 이동 (ADR-84 개정) + 편지 사진 귀속을 경로에서 갈무리로 이관 | **지휘부 결정 2026-08-02: 갈무리는 사람에게 귀속된다.** ADR-84 의 '등록만 이동, 응답·갈무리는 생성 차수에 남긴다'를 갈무리에 한해 뒤집는다 — 갈무리는 ADR-80이 규정한 **수정 가능한 문서**이고, 진단 응답(불변·사전사후 페어링·채점 파이프라인 대상)과 성격이 다르다. `responses`·`response_drafts` 는 종전대로 불변·잔류. **이동**(`move_cohort_member`): enrollment 에 더해 `checkins` 도 옮긴다. 대상에 같은 회차가 이미 있으면 그 행이 참여자의 현재 기록이므로 원본을 버린다(enrollment 병합 규약과 동일 · 이중 등록 상태에서 양쪽에 쓴 드문 경우에만 발생). 부수 효과로 **휴지통 이동·복원이 무손실**이 된다(갈무리가 함께 다녀온다). ADR-84 의 등록 기준 집계 필터는 그대로 두되, 이제 고아 갈무리가 생기지 않으므로 이중 방어가 된다. **라이브 실증에서 잡은 결함 둘을 후속 마이그레이션으로 고쳤다(적용 이력 보존 · CLAUDE §5)**: **(F1)** `checkins` 가 `(cohort_id, session_no)` 로 `cohort_sessions` 를 참조하는 FK 를 가져, **일정이 없는 차수로는 이동이 통째로 실패**한다 — 휴지통·미배정(JOINF)·미시드 차수 모두 `cohort_sessions` 0행이라 **갈무리 보유자의 삭제가 막히는 프로덕션 파손**이었다(마이그 `…100100`). 해법: 옮길 회차의 일정이 대상에 없으면 **원 차수 일정 행을 복사**해 FK 를 충족시킨다(있으면 대상 것을 존중). 잔여 주의 — 미시드 차수로 옮기면 원 차수 날짜가 먼저 박히고 이후 `seed_cohort_sessions`(ON CONFLICT DO NOTHING)가 그 행을 건너뛰므로, 인도자가 회차별 날짜 편집기(ADR-82)로 바로잡는다. **운영 권고: 참여자를 옮기기 전에 대상 차수 일정을 먼저 등록한다.** **(F2)** Supabase 는 `storage.protect_delete()` 트리거로 **`storage.objects` 직접 DELETE 를 금지**한다('Use the Storage API instead') → DB 레벨 고아 sweep 은 성립하지 않을 뿐 아니라, 그 트리거가 붙어 있는 동안 **차수 삭제가 통째로 막혔다**(마이그 `…100200` 로 제거·`remove_cohort_member` 를 ADR-84 형태로 원복). **사진**: 물리 경로를 옮기지 않는다 — Storage 는 객체의 실제 저장 키에 `name` 을 포함하므로 `storage.objects.name` 만 UPDATE 하면 DB 와 파일이 어긋나 다운로드가 깨진다(진짜 이동은 Storage API 의 copy+delete). 대신 **접근 판정을 경로의 차수에서 `checkins` 로 이관**한다: SELECT 정책이 `path[2]=user_id`·`path[3]=session_no` 로 갈무리 행을 찾아 `is_cohort_coach(k.cohort_id)` 를 본다(uuid/int 캐스팅 없이 text 비교 — 형식이 어긋난 경로에서 정책이 예외를 던지면 버킷 전체가 막힌다). 그래서 **갈무리가 이동하면 열람 권한이 자동으로 따라가고 떠난 차수 인도자는 자동으로 접근을 잃는다.** 경로가 옛 차수 접두어에 남아 prefix list 로는 못 찾으므로 **`checkin_photo_paths(cohort,user,session)` RPC 신설**('그 회차 갈무리가 지금 이 차수에 있는가'로 게이트 후 이름 반환 · 서명은 앱). `listCheckinPhotos` 구현만 교체(**계약 시그니처 불변**). INSERT·DELETE 정책 불변(업로드 시점엔 경로 차수=현재 차수라 정확하고, DELETE 는 본인 OR 운영자라 차수 무관). **고아 사진 회수(ADR-83 미해결분)는 전부 앱 Storage API 경로로**: `removeCohortMemberAction` 이 RPC 호출 **전에** 회차별 사진을 지운다(갈무리를 먼저 지우면 어느 회차였는지 알 수 없어진다). 사진 회수 실패가 참여자 삭제를 막지 않게 감싼다. **라이브 실증(더미 차수 3개·실행 후 전량 정리)**: 일정 0인 대상으로 이동 성공·일정 2행 자동 충족·갈무리 2건 이동·enrollment 이동 / **떠난 차수의 비운영자 코치: 갈무리 0 · storage SELECT 0 · RPC 0**(경로는 옛 차수 그대로인데 접근만 끊김 — 이 ADR 의 핵심 명제) / 갈무리 보유 코치: RPC 1 / 프로덕션 사진 1장 회귀 확인(소유·담당 코치 1, 비담당 코치 0). 정리 후 프로덕션 무결성 재확인(1기 12명·14건 불변 · 사진 1 · 잔여 더미 0 · 문제 트리거 0). **ADR-86 확대 노출 역할별 실측(선행)**: 담당코치/운영자 14건 전량 · 비담당 코치 본인 1건(타인 0) · 참여자 본인 2건(전 차수 통틀어 2건) · 비담당 코치 사진 0. 마이그 +3 · 계약 0 · 코어 1메서드 구현 교체. directive 2026-08-02 승인. |
| ADR-88 | 접힘 블록 공용 부품(`Disclosure`) + 요약 줄 + 목적을 찾는 세 질문(2회차) | **문제**: 심화 헤더가 `d11d3cb`·`bf86b13` 두 차례에 걸쳐 화살표를 우측방향으로 돌리고 두껍게 했는데도 실사용 검토에서 **여전히 '누를 수 있는 줄'로 분간되지 않았다.** 아이콘 하나로 풀리지 않는 문제라 구조를 바꾼다. **`core/ui/Disclosure`(신설)**: 줄 전체가 버튼(`space-between`) · 왼쪽 제목+뱃지+요약 줄 · **오른쪽에 '펼치기'/'접기' 글자**+꺾쇠(열리면 180° 회전) · 최소 52px(`--tap-min` 44 보다 크게 잡아 몸으로 알리는 값) · 배경 `--color-surface-2`(hover `--color-surface-sunken`) · focus `2px --color-accent` · 열렸을 때만 헤더 아래 hairline · `prefers-reduced-motion` 존중 · **여백 위아래 `--space-6` 대칭**(초안에서 `margin-top` 만 주고 아래를 빠뜨려 다음 문항이 상자에 달라붙었다 — 비대칭은 눈에 안 띄면서 화면을 답답하게 만든다). **핵심은 아이콘이 아니라 글자다** — '펼치기'/'접기'가 지금 열려 있는지까지 말해 준다. 영문·마우스 은유를 쓰지 않는다(대부분 폰에서 탭한다). **부품 규율 둘**: ① **계측을 모른다**(ADR-86 제1원칙) — `onToggle` 콜백만 노출하고 `deep_opened` 기록은 심화 호출부에만 남긴다(단방향 OR 라 한 번 true 면 영구). 기본 펼침 블록·인도자 상자는 열림을 기록하지 않는다. ② **문안을 갖지 않는다** — 제목·요약·뱃지 문구는 전부 레지스트리(`sessionN.ts`)가 준다. **적용 범위(축소 판단·승인)**: 저장소의 `aria-expanded` 보유 파일은 다섯(`MemberRow`·`RawAnswers`·`PastSessionsClient`·`RosterDetail`·`CheckinCardClient`)이나, 갈아탄 것은 **문항 블록뿐**이다. 나머지는 규격이 맞지 않아 대상 밖 — `PastSessionsClient` 에 52px·surface-2·hairline 을 입히면 ADR-81 이 정한 시각 위계 3단 최하위(캡션·muted·카드 없음)가 깨지고, `RosterDetail` 은 명단 행 자체가 컨트롤이라 구조가 다르다. **'선택' 뱃지 — ADR-82 의 반전이 아니라 조건 추가**: ADR-82 가 뱃지를 지운 대상은 **접힌** 블록이었고 그 판단은 유효하다(접혀 있다는 사실 자체가 건너뛸 수 있음을 말하므로 뱃지가 군더더기). 그러나 **기본 펼침 블록은 ADR-82 가 검토한 적 없는 경우**다 — 빈 입력칸 셋이 펼쳐져 있으면 필수로 읽히고, 하단 '필수 N칸 남음'은 저장 시점의 신호인데 불안은 읽는 시점에 생긴다. → **접힘 블록은 뱃지 없음(ADR-82 유지), 기본 펼침 블록에 한해 표기.** 부수로 뱃지가 선택 prop 이 되어 부품이 단순해진다. **요약 줄(`deepen.summary`·`facilitatorBox.summary`)**: 접힌 상태에서 안에 무엇이 있는지 한 줄 — 열기 전에 알아야 여는 판단이 선다. 1회차 '집에 남은 기억 · 과거에게 쓴 편지' / 2회차 '5년 뒤의 한 장면 · 미래에게서 온 편지(인터스텔라 편지)' / 인도자 상자 공통 '부탁 · 세미나 제안 · 연락 요청'. (2회차 요약 줄의 괄호 부기와 `future_scene` 보조문구 '어떤 방'→'어떤 장소'는 지휘부 문안 교정 2026-08-03.) **인도자 상자에서는 안전장치다** — 그 안의 '연락 요청'은 의견함이 아니라 **돌봄 채널**이라, 제목만 달면 거기 있는 줄 모른 채 지나간다. **`facilitatorBox.defaultOpen` 회차별 설정**: 기본 접힘, **7회차만 `true`**(마지막 회차의 세미나 제안은 다음 기수 설계의 최대 수확처다). 지금 구조를 만들지 않으면 7회차에서 하드코딩하게 된다. **목적을 찾는 세 질문(2회차 전용·신규 3키)**: `purpose_alive`·`purpose_ache`·`purpose_fit`. 책의 논리 순서(세 질문 → 교차점 → 한 문장)대로 ① 뒤 ② 앞. **기본 펼침**(수업 중 시간이 부족해 숙제로 나갈 가능성이 커, 접어 두면 존재를 모른 채 넘어간다) + '선택' 뱃지. **필수는 6칸 그대로**(세 칸을 비워도 저장·제출된다 — 테스트로 고정). 은사·부르심 해설은 카드에 넣지 않는다(그 대목은 책과 인도자 스크립트가 맡는다. 갈무리는 성찰 카드이지 묵상집이 아니고, 이 카드는 이틀 뒤 혼자 열린다). **책 페이지 참조는 미확정이라 붙이지 않는다.** **ADR-86 열람 파급**: `readModel` 에 목적 묶음 블록 추가 → **노출 정책 20키 → 23키**. 본인·인도자 모두 표시(`save.notice2` 고지 근거), **`summaryFields`(나눔 후보)에는 넣지 않는다** — 재료이지 대표문장이 아니다(테스트로 고정). **문안 델타**: 1회차는 **기존 문자열 diff 0**(요약 줄 1건 추가만) — 헤더 형태만 바뀐다. 2회차 `facilitatorBox.title` 은 '선택 · 하고 싶은 말이 있을 때만' → '**인도자에게 하고 싶은 말**'(1회차는 불변). 상단 카운터(`cover.counter`)는 부활시키지 않는다(`d11d3cb` 결정 유지 — 렌더 경로 0건 확인). **회귀 게이트(지휘부 요구·D1 직후)**: `session1.ts` 문안 diff 0 · 1회차 필수 5칸 유지 · 1회차 심화·인도자 상자에 뱃지 없음 · 실제 CSS 로 렌더한 1회차 확인 파일 제출 후 승인. **선행 문서 정정 기록**: `CC_ORDER_checkin_session2`(v1)·`CC_GUIDE_checkin_session2_spec` 의 착수 순서(Phase 1~4)는 **폐기**한다 — ADR-85·86·87 로 이미 완료된 범위를 덮어쓴다. 원인은 클론 한 벌(`6dc85d3`, 7-28)로 세 문서를 나흘에 걸쳐 발행한 것이며, '감사 전 fresh clone' 규율을 발행에는 적용하지 않았다. **지시서는 틀리면 이미 있는 것을 덮어쓰므로 감사보다 위험하다 — 앞으로 지시·가이드·메모도 발행 직전 clone 을 기준선으로 명시한다.** 문안 원문·필드 키·계약 규격은 유효하므로 폐기하지 않는다. **검증**: tsc 0 · eslint 0(내 파일) · vitest **392**(`Disclosure.test.tsx` 신규 8 · `readModel` 목적 4 추가) · `next build` 성공. 신설 2 · 수정 5 · 계약 0 · 코어 +1부품 · 마이그 0. directive 2026-08-03(CC_MEMO 정정 3건) 승인. |
| ADR-89 | 갈무리 QR 비멤버 처리 — `/join`(사전진단) 대신 담담한 안내로 정지 (ADR-81 개정) | 2회차 배포 직전 실사용에서 발견. `https://future.yebom.org/c/HMT7Z/2` 를 **그 차수 소속이 아닌 사람이 열면 사전진단 화면이 떴다.** 원인은 ADR-81 이 설계한 흐름의 마지막 분기 — 비멤버를 `/join?cohort={id}` 로 보내는데, 그 라우트는 `initialCohortId` 를 받으면 **가입자 러너로 재진입**해 진단이 시작된다(`join/page.tsx` §7). **두 가지가 틀렸다.** ① **목적지-의도 불일치**: 이 링크의 목적지는 '그 회차 갈무리'다. 갈무리를 쓰러 온 사람 앞에 수십 분짜리 사전진단이 열리는 것은 비용이 크고, 자기가 무엇을 누른 것인지 알 수 없게 만든다. ② **무단 자기등록 표면**: 갈무리 링크는 현장 QR·인도자 카톡으로 옮겨 다니는데(ADR-81 이 규정한 세 진입로), 링크만 가지면 **누구나 실명제 차수에 스스로 등록**되고 진단까지 시작됐다. 차수는 실명제이고 인도자가 명단을 관리한다는 전제(§10·ADR-75)와 어긋난다. **바꾼 것**: 비멤버는 리다이렉트하지 않고 **그 자리에서 멈춘다** — 차수 이름 + '참여자 명단에 없어요' + '인도자에게 문의해 주세요' + [홈으로]. 같은 파일의 '코드를 찾을 수 없어요' 안내와 동일한 형태다(담담한 안내·비난 없음·§0.4). 차수 이름 노출은 새 누출이 아니다 — 코드 보유자에게는 `/join?code=` 미리보기가 이미 이름을 보여 준다. **잃는 것과 대안**: 2회차부터 합류하는 신규 참여자가 QR 로 자기가입하는 경로가 사라진다. 인도자가 명단에 등록하거나, 참여자가 기존 코드 참여 경로(홈 → 코드로 참여 → `/join`)를 쓴다 — 그 경로는 그대로 살아 있으므로 기능 손실이 아니라 **자동 유발이 사라진 것**이다. 실명제 차수 운영에는 오히려 맞다. **불변**: 미인증 시 `/login?returnTo=/c/{code}/{n}` 은 그대로다(`safeReturnTo` 화이트리스트 1번 정규식이 이 형태를 이미 허용 — 로그인 후 원래 링크로 복귀). 코드 해석 실패 안내·멤버의 카드 리다이렉트도 불변. `/join` 라우트 자체는 손대지 않았다. **신규 문안 2줄**(차수명 + '참여자 명단에 없어요' / '인도자에게 문의해 주세요') — **지휘부 승인 2026-08-03**. (ADR-90 이 이 판단을 정책으로 승격 — '미확정 참조는 넣지 않는다'와 같은 계열.) QR 자기가입 경로를 닫는 트레이드오프도 함께 승인(늦은 합류는 인도자 등록 또는 기존 코드 참여 경로). 계약 0 · 코어 0 · 마이그 0 · 라우트 0. 검증: tsc 0 · eslint 0 · vitest 392. directive 2026-08-03 승인. |
| ADR-90 | 블록 타입 일반화(모양 슬롯·`order`·`Mirror`·`group`) + 3회차 갈무리 | **문제**: `CheckinSession` 이 슬롯을 **회차 이름**으로 나눠 둬(`desire`·`futureArea`·필수 `identity`) 3회차가 세 군데서 걸렸다 — 3회차엔 정체성 문장이 **없고**, ERRC 짝은 `desire` 와 같은 모양이며, 되비추기가 **세 곳**(①·심화①·⑤)이고, 블록 순서가 2회차와 다르다. 슬롯을 회차마다 늘리면 7회차에 여덟 개가 되어 '회차 추가 = 파일 하나 + 한 줄' 목표가 무너진다. **해법 — 슬롯 이름을 회차가 아니라 '모양'으로**: `desire`→**`pairText`**(+`connector?`) · `futureArea`→**`areaPick`** · `identity` **선택 슬롯화** · **`question`** 신설(한 칸 서술 + `badge`). **`today.order: SlotName[]` 로 렌더 순서를 데이터화** — 지금까지 클라이언트 선언 순서가 곧 화면 순서라 회차마다 다른 순서를 표현할 수 없었다. **카드와 `readModel` 이 같은 `order` 를 훑는다**(열람 순서가 작성 순서와 어긋나면 안 된다). `mood` 도 `order` 에 넣는다 — '언제나 마지막' 특례를 두면 묶음의 끝을 데이터로 말할 수 없다. **되비추기를 자리에서 블록 속성으로**: `identity.mirror: boolean`·`lastStep.mirrorEmpty: string` → `Mirror{label, keys[], empty?}` 를 `areaPick`·`identity`·`question`·`pairText`·`deepen.fields[]`·`lastStep` 어디에나 붙인다. **`keys[0]` 은 앵커다 — 앵커가 비면 나머지 값이 있어도 되비추지 않는다.** 이 규칙이 없으면 `step_what` 은 비고 `step_when` 만 저장된 초안(자동저장이 부분 저장하므로 실제 도달 가능)에서 '무엇을' 없이 '언제'만 한 걸음으로 되비춰져 화면이 달라진다 — **초안 검토 20 에이전트 중 4개 렌즈가 독립적으로 잡은 회귀**이며, 판정을 `slots.ts`(순수 함수)로 빼 9 케이스로 고정했다(출력은 원문, 존재 판정에만 trim). 되비추기 재료가 3필드 다이제스트에서 **지난 회차 `answers` 전체**로 바뀌었다(`Mirror.keys` 가 임의 키를 지목하므로) — 본인 자신의 지난 답이라 노출 범위 변화 없음, **조회는 edit 모드에서만**(ADR-86 유지). **묶음 이정표 `group`**: 이중 STEP 회차(3~5)는 1면 안에서 화제가 한 번 바뀌어, 표시가 없으면 참여자가 세 번째 문항에서 걸린다. 표지 부제를 쪼개 쓰므로 **새 어휘도 STEP 용어 노출도 없다**. 뜻은 '이 블록**부터**'가 아니라 '이 블록이 **속한** 묶음'이다. **렌더 규칙 한 문장이 네 전이를 덮는다 — 현재 블록의 `group` 이 직전과 다르면 경계를 그린다(값 있으면 hairline+캡션, 없으면 hairline만). 면의 첫 블록이면 hairline 을 생략하고 캡션만.** 없음→A(캡션) · A→A(없음) · A→B(선+캡션) · **A→없음(선만 — 묶음이 닫힌다)**. 이 마지막 경우가 없으면 `mood`(묶음 밖)가 습관 묶음에 딸린 것처럼 읽힌다. 캡션은 제목이 아니라 이정표라 `.t-micro`(12px·`--color-text-muted`) — 라벨 15·보조 13 아래 한 칸. **단일 STEP 회차(1·2·6·7)는 `group` 이 없어 경계가 생기지 않는다 → 신규 hairline 0건**(테스트로 고정). **부품 적용 범위**: 공용 `Disclosure`(ADR-88) 규격은 건드리지 않았다. **1·2회차 문안 회귀 증명**: 슬롯 이름과 배치가 바뀌어 파일 diff 로는 증명할 수 없으므로, **변경 전 한국어 리터럴 집합을 스냅샷(`copyBaseline.json`)으로 박고 삭제·변경 0 을 테스트로 잠갔다**(추가는 허용·열거). 1회차 **증감 0**, 2회차는 되비추기 캡션 2건이 클라이언트 하드코딩에서 레지스트리로 이관된 것뿐이며 **바이트 동일 확인**. **망라성 가드**: `SlotName` 이 늘면 카드 `renderSlot`·`readModel` switch·`ALL_SLOTS` 세 곳이 동시에 컴파일 실패한다 — 없으면 새 슬롯이 조용히 누락돼 참여자가 쓴 답이 열람에서 사라진다(신호 0). **3회차 문안**(`session3.ts` · STEP 3 현재 직면 + STEP 4 습관 재구성): ① 간절한 영역(`gap_area`+`gap_want`) — **`future_area` 를 재사용하지 않는다**(2회차 '가슴 뛴 영역' ≠ 3회차 '간절한 영역'. 둘이 다를 때가 인도자에게 가장 값진 정보인데 같은 키를 쓰면 그 차이가 덮인다) ② 오늘의 질문(`stuck_named` · 선택 · 접힘으로 감싸지 않음 — 그 회차의 핵심 경험을 받는 자리) ③ 습관 짝(`habit_stop`→`habit_start` · connector '↓ 그 자리에' · **둘 다 채워야 1칸** — 제거는 창조와 짝을 이룬다는 원칙을 구조로 강제) ④ 마음(묶음 밖). 심화 `identity_gap`·`speech_habit`. **필수 6칸 유지** — 이중 STEP 이라 옮겨 적기가 둘이어서 필수가 하나 늘 자리인데 **그 증가분을 서술 질문에서 회수**한다(옮겨 적기는 이관이라 값이 싸고 서술은 비싸다). `'함정'` 등 **사람을 판정하는 낱말을 카드에 쓰지 않는다** — 카드는 이틀 뒤 혼자 열리고 그때 판정어는 자기 낙인이 된다. `mood` 의 '오기'를 '해볼 만함'으로 교체(자기를 낮게 보는 작업이 세 번 걸리는 주간이라 부정 낱말 과반이면 골라 놓고 더 가라앉는다). **책 페이지 참조는 미확정이라 붙이지 않았다**(ADR-89 정책 승격: **미확정 참조는 넣지 않는다 — 확정된 값만 카드에 오른다**. 틀린 페이지는 없는 것보다 나쁘다). **나눔 후보 열 기준을 한 문장으로 확정**: `summaryFields` 에는 **나눌 수 있는 문장만** 넣는다 — 범주 낱말(`gap_area`)과 자기개시가 깊은 문항(`stuck_named`·`identity_gap`)은 제외하고, **비어 있을 가능성은 배제 사유가 아니다**(인도자가 훑어 고르는 도구이므로 빈 칸은 그냥 빈 칸이다). 3회차 열 = `gap_want` · `habit_stop→habit_start` · `speech_habit`. 쌍(`from→to`)은 **교체·변환**을 뜻하므로 습관 짝에는 참이고 영역+바람에는 거짓이라 쓰지 않는다. `speech_habit` 은 관찰 가능한 습관이라 얕고, 세 번 자기를 낮게 보고 나온 주간의 다음 회차를 가볍게 여는 재료가 된다. **`readModel` 노출 정책 23키 → 30키**(신규 7: `gap_area`·`gap_want`·`stuck_named`·`habit_stop`·`habit_start`·`identity_gap`·`speech_habit`. 전부 본인·인도자 표시 — `save.notice2` 근거). **선행 지시서 기준선 사고 재발 방지**: `CC_ORDER_checkin_session3` 는 발행 직전 fresh clone(`78b47b0`)으로 대조해 발행됐다(ADR-88 이 기록한 교훈의 첫 적용). **검증**: tsc 0 · eslint 0(내 파일) · vitest **442**(`slots.test.ts` 신규 21 · `session3.test.ts` 신규 19 · `copyRegression.test.ts` 4) · `next build` 성공 · 지시서 §4 문안 17건 문자열 대조 일치 · 금지어 0 · `함정` 0 · 책 참조 0. 신설 5 · 수정 7. **계약 0 · 코어 0 · DB·마이그레이션 0 · 라우트 0**. 게이트: Phase 1 승인 후 Phase 2 착수(지휘부 2026-08-03). **배포 후 1·2·3회차 실기기 확인 필요** — 렌더 HTML 은 ADR-82 `ui-input` 종류의 사고를 잡지 못한다. directive 2026-08-03(CC_ORDER_checkin_session3 + 정정 메모) 승인. |
| ADR-91 | 1기 실측 보정 4건 — 필수 공란 제출 차단 · 복귀 안내 구현 · 마음 낱말 · 완충 문구 | **1기(11명) 1·2회차 실측이 두 구조 결함을 드러냈다.** ① **1회차 제출 8건 중 3건이 2·3면을 통째로 건너뛴 채 제출**됐다(`step_what`·`confidence`·`self_note` 동시 결측 — 2회차 1건 포함 총 4건). 현장 클로징에서 QR 로 열어 1면을 채운 뒤, 맨 아래 버튼에 경고가 없으니 그 자리에서 눌러 끝내 버린 것이다. ② **`prompt_count > 0` 인 행이 0건** — `markCheckinPrompted` 는 ADR-80 이 코어에 만들어 뒀는데 **호출하는 화면이 없었다.** 돌아오게 만들 장치가 미구현이라 두 결함이 겹쳐 절반 가까이가 미완성으로 굳었다. **실측 수치 정정(지시서 §1 오기)**: 세 칸 동시 결측은 1회차 3건(37.5%)이지 4건이 아니며, 4건은 두 회차 합산이다. `아직 모르겠음`은 **제출된 1회차 6/7(86%)**이다(각주: **미제출 초안 1건을 포함하면 7/8**, 전 회차 mood 응답 기준으로는 7/10). 갈무리는 제출을 완결로 보는 문서이고 초안은 아직 마음이 정해지지 않은 상태일 수 있어 제출분을 기준으로 삼는다 — 지휘부 집계 6은 제출분, 클코1 집계 7은 초안 포함이었고, 지시서의 `6/10`은 분자(제출분)와 분모(전체)가 섞인 값이었다. 어느 기준이든 지시서가 적은 55%보다 높다. **관찰**: 필수는 절반이 비는데 선택은 6~7할이 찬다(심화 펼침 8/11 · 못 하게 될 때 7/11 · 편지 한 줄 6/11 · 목적 세 질문 2/2). **부담을 피하는 집단이 아니라 마음이 가는 곳에 쓰는 집단**이다. 그래서 A·B(구조)를 고치고 C·D(문안)는 되돌릴 수 있게 둔다. **A — 필수 공란 제출 차단**: 원칙은 '**막는 것은 제출이지 저장이 아니다**'. 갈무리는 한 번에 끝내는 서식이 아니라 며칠에 걸쳐 고쳐 쓰는 문서라, 벽을 세우되 가둬서는 안 된다. 저장 버튼은 **언제나 눌린다**(비활성 버튼은 고장으로 읽힌다) — 누른 뒤가 갈린다. 빈 필수가 있으면 **저장 버튼 위 인라인 패널**(모달 아님 — 3분짜리 카드에 포커스 트랩·스크롤 락을 들이는 것은 과하고, 저장소에 쓸 만한 모달도 없다)이 뜨고 **빈 칸의 라벨을 그대로** 나열한다(숫자만으로는 어디로 갈지 모른다). `채우러 가기`→첫 빈 칸으로 스크롤+포커스 · `나중에 이어 쓰기`→차수 홈(제출하지 않는다). **판정 일원화가 이 조치의 핵심 구조다** — `filledCount`·`missingLabels`·`missingKeys` 를 손으로 각각 쓰면 세 회차 × 세 함수가 어긋날 수 있고, 어긋나면 '제출을 막았는데 무엇이 비었는지는 못 알려 주는' 상태가 된다. **하나의 `required` 선언에서 전부 파생**시켜(`required.ts` 신설) 그 가능성을 구조로 없앴다. 기존 `filledCount` 테스트가 그대로 통과하는 것이 파생 구현의 동치 증명이다. 결측 라벨은 **레지스트리 원문**이다 — 처음엔 `…(책 49~52쪽) — 바꾸기 전`처럼 합성했다가 **ADR-90 리터럴 잠금이 새 문안 2건을 잡아내** 원문(`바꾸기 전`)으로 되돌렸다(지시서 §3-2 예시는 축약형이나 §8-5 가 '라벨 원문'을 요구하므로 후자를 따른다). **다만 `required` 선언에는 라벨이 문자열로 다시 적히므로**, 문안 쪽만 고치고 선언을 안 고치면 두 곳이 어긋난다 — 리터럴 잠금은 baseline 대비 '변경'만 보므로 이 어긋남은 못 잡는 사각지대다. 지휘부 감사가 **2회차 대조 누락**을 짚었고(슬롯 이름을 열거하는 방식이라 회차가 늘면 반복될 누락이었다), **'결측 라벨이 그 회차 문안 어딘가에 실제로 있는가'로 일반화**해 세 회차를 `ALL` 순회로 덮었다 — 4~7회차가 자동으로 포함된다. 음성 대조로 이빨을 확인했다(라벨 한 글자만 흐트러뜨려도 세 회차 모두 검출 · 대조 라벨 7·8·9개). **`confidence` 논리 구멍 보정**: 필수가 아니라 `filledCount` 가 세지 않으므로 그것만 빈 사람에겐 패널이 영영 안 뜬다(실측 `●——` 2건이 그 경우) → 조건을 넓히되 **필수가 다 찼으면 주 버튼이 `이대로 제출`**이 되어 막지 않는다. **빈 칸 표식** 조건은 `hasContent || gateSeen` 이고 둘 다 필요하다 — `hasContent`(서버)는 다음 진입에도 살아 있어 주 조건이고, `gateSeen`(클라)은 `hasContent` 가 **로드 시점 스냅샷**이라 edit 중 갱신되지 않는 한 세션을 덮는다. 처음 여는 사람은 둘 다 거짓이라 표식이 없다(시작이 무거워지지 않게). 버튼 위 문구는 `필수 N칸 남음`→**`아직 {n}칸이 비어 있어요`**('필수·남음'은 서식 어휘고 갈무리는 서식이 아니다). **B — 복귀 안내 구현**: `/home` 에 배너 신설(`CheckinPrompt`). 노출 조건 `prompt_count === 0`(첫 진입) 또는 `=== 1 && 마감 6시간 전 이후`. 상한 2는 RPC 가 강제한다. `나중에`에 **어떤 비용도 붙이지 않는다**(죄책감 문구·재확인·카운트다운 금지). `/my/cohorts` 에는 두지 않았다 — 차수가 하나면 차수 홈으로 리다이렉트하므로 실효 지점이 `/home` 이다. **조회 비용**: `my_cohorts` 가 `prompt_count` 를 반환하지 않아 대상이 있을 때 `getMyCheckin`·`listCohortSessions` 각 1회가 는다. 11명 규모라 감수하고, 기수가 늘면 RPC 에 얹는다(계약·마이그 변경을 피하려는 의도적 선택). 차수 홈 '작성 중' 줄에 **남은 칸 수**를 더한다(미완성 제출은 '돌아올 이유'가 없어서 생겼다). **B4**: `checkin_mark('prompt')` 는 행이 없으면 INSERT 하므로 배너만 본 '미작성' 참여자에게 인도자 명단의 빈 펼침 화살표가 생긴다 → `hasRow` 를 `hasContent || submittedAt` 으로 좁혔다. (`first_opened_at` 은 'prompt' 종류가 건드리지 않으므로 ADR-86 계측은 안전하다 — RPC 설계가 옳았다.) **C — 마음 낱말**: `아직 모르겠음`이 '내 마음을 모르겠다'와 '이 목록에 맞는 게 없다'를 한데 담아 **가장 싼 탈출구**로 쓰였다(선택자 중 직접 쓰기 0명·필수 결측 다수). 뒤엣것으로 좁혀 **`딱 맞는 말이 없음`**으로 바꾸고, 고르면 직접 쓰기 placeholder 가 안내로 바뀐다(강제하지 않는다). 배타는 유지(목록이 안 맞는다면서 다른 낱말을 함께 고르는 것은 모순). **3회차부터만 교체한다** — `MultiChoiceChips` 는 `options` 에 있는 값만 그리고 `nextChipSelection` 의 배타 필터는 `exclusive` 문자열만 걷어내므로, 1·2회차 옵션을 바꾸면 이미 그 낱말을 고른 **7명의 답이 화면에서 사라지고** 저장값에 유령 값이 남는다. ADR-86 이 지난 회차 링크를 만들어 이제 실제로 열리는 경로다. 2기 시작 전에 바꾸면 저장값이 없어 안전하다. **D — 완충 문구를 '허락'에서 '용도'로**: 실측이 근거를 지웠다(자신감 값 2·5·7·8 평균 5.5 로 부풀림 없음 · placeholder 를 베낀 사람 0명 · 평균 18.6자로 각자 자기 문장). 없애지 않고 문법을 바꾼다 — 정직성 확보 효과는 같고 자세가 반대다(능동적인 사람은 안전보다 쓸모에 반응한다). 실행 자신감 `help` → '낮게 적힌 숫자가 인도자에게는 가장 쓸모 있습니다…'(1·2·3), 3회차 지난 걸음 `note.help` 에서 허락절 제거, `self_note.placeholder` 를 **회차별로**(label 은 이미 회차별인데 예시만 고정이던 설계 누락). **§6-2 는 손대지 않는다** — 연락 요청·익명 안내·'꼭 칭찬이 아니어도 됩니다'는 5주차에 실제로 무너진 사람이 여는 문이라 거기까지 딱딱해지면 소수를 잃는다. 분량 면제·오해 방지 문구도 정서 완충이 아니라 지시라 그대로 둔다. **D 가 ADR-90 리터럴 잠금을 깨뜨려 `copyBaseline.json` 을 재생성했고**(session2 83→85), 교체가 되돌아가지 않도록 `copyRegression.test.ts` 에 명시 단언을 더했다(옛 문구 부재 + 새 문구 존재 + §6-2 보존 + 1·2회차 `아직 모르겠음` 유지). **검증**: tsc 0 · eslint 0(내 파일) · vitest **471**(`required.test.ts` 신규 20 · session3 C·D 5 · copyRegression 재작성) · `next build` 성공. 신설 4 · 수정 8. **계약 0 · 코어 0 · DB·마이그레이션 0**. A 는 게이트로 승인 후 B·C·D 착수(지휘부 2026-08-06). **배포 후 실기기 확인 필요** — 게이트 패널·복귀 배너·`채우러 가기` 스크롤은 정적 검증이 닫지 못한다. directive 2026-08-06(CC_ORDER 실측 보정 4건 + 정정 메모) 승인. **후속(같은 날)**: 지휘부 감사가 결측 라벨 대조에서 **2회차 누락**을 짚었다 — `required` 선언에 라벨이 문자열로 다시 적히므로 문안 쪽만 고치고 선언을 안 고치면 이중 진실이 되는데, 리터럴 잠금은 baseline 대비 '변경'만 보므로 이 어긋남은 못 잡는 **사각지대**다. 슬롯 이름을 열거하는 방식이라 회차가 늘 때마다 손으로 추가해야 했고 그래서 빠졌다 → **'결측 라벨이 그 회차 문안 어딘가에 실제로 있는가'로 일반화**해 `ALL` 순회로 바꿨다(4~7회차 자동 포함). 음성 대조로 이빨 확인(라벨 한 글자 훼손 시 세 회차 모두 검출 · 대조 라벨 7·8·9개). **미리보기 라우트**(→ ADR-92 로 공식화·이전). |
| ADR-92 | 갈무리 카드 미리보기 — 인도자 콘솔 정식 기능 | **문제**: 카드 라우트의 `opens_at` 게이트에는 **역할 우회가 없다**(설계대로). 그래서 아직 열리지 않은 회차를 운영자도 열 수 없는데, 인도자는 클로징 스크립트를 짜기 위해 카드가 무엇을 묻는지 알아야 한다. 회차마다(4~7) 반복되는 수요다. **일정을 임시로 당기는 방법은 쓰지 않는다** — 되돌리기 전에 참여자가 열면 미공개 회차가 그대로 노출된다. **처음엔 `/preview/checkin`(개발용)으로 냈다가 공식화하면서 폐기하고 콘솔 보호 라우트로 옮겼다**(`/coach/cohort/[cohortId]/checkin/preview`). 근거: `/preview` 계열은 파일 첫 줄에 스스로 '운영 라우트 아님'이라 선언한 자리이고 `PROTECTED_PREFIXES` 밖이라 **인증이 없다**. 공식 UI 가 그것을 링크하면 (a) 선언과 모순되고 (b) **아직 확정 전인 4~7회차 문안이 링크만 알면 열린다** — ADR-89 가 세운 '미확정 참조는 넣지 않는다'와 같은 계열의 문제다. 진입로를 둘로 두지 않기 위해 개발용 라우트는 삭제했다. **접근 범위 — 운영자 전용으로 좁히지 않는다(지휘부 승인)**: 실제로 필요한 사람은 인도자이고, 회차 일정을 정하는 것도 인도자다. 게이트는 회차 현황 화면과 **동일**하게 둔다(`role === 'user'` → `/home`). 노출도 늘지 않는다 — 코치는 이미 그 차수 참여자의 **답 전체**를 본다(ADR-86). 문항 문안은 그보다 훨씬 덜 민감하다. **구현**: 복제본이 아니라 **실제 `CheckinCardClient` 를 그대로 렌더**한다(회람용 HTML 처럼 따로 그리면 드리프트가 생긴다). `preview` 플래그가 **서버 쓰기를 네 곳에서 막는다** — 자동저장·제출·`markCheckinOpened`·사진 위젯(브라우저 Storage 직접 호출). 미리보기가 `checkins` 행을 만들거나 계측을 오염시키면 안 된다(ADR-86 제1원칙). 제출을 눌러도 게이트 패널과 완료 화면까지 흐름은 다 보이되 서버에는 아무것도 남지 않는다. 되비추기는 토글로 두 경우(지난 회차를 쓴 사람 / 안 쓴 사람)를 다 보여 준다. **고지를 두 곳에** 둔다 — 상단 배너는 스크롤하면 사라지므로 저장 버튼 곁에 '미리보기 — 저장되지 않습니다'를 한 번 더(적은 것이 남는 줄 알고 쓰다가 잃는 일이 없게). **자리**: 회차 일정 편집 행의 '링크 복사' 옆 눈 아이콘 — 인도자가 날짜를 정하는 자리라 맥락이 맞고 회차별이라 대상이 분명하다. **회차 확장**: 목록을 레지스트리에서 뽑으므로 4~7회차가 등록되면 이 화면은 **0줄 수정**으로 따라온다. 계약 0 · 코어 0 · DB 0. 검증: tsc 0 · eslint 0 · vitest 473 · build 성공. directive 2026-08-06 승인. |
| ADR-93 | 개발용 미리보기 4종 공개 노출 차단 — /preview 게이트 | **결함**: `/preview` · `/preview/console` · `/preview/entry` · `/preview/report` 넷이 `PROTECTED_PREFIXES` 밖이고 페이지 게이트도 없어 **인증 없이 운영 도메인에서 열렸다.** 파일 첫 줄에 스스로 `운영 라우트 아님`이라 선언해 놓고 실제로는 공개돼 있었다(ADR-92 가 `/preview/checkin` 을 콘솔로 옮긴 것과 **같은 판단을 나머지 넷에 적용**). 신규 작업의 결함이 아니라 디자인 시스템 확인용으로 만든 초기 라우트가 그대로 남은 것이다. **실측한 노출 규모 — 우려보다 한 단계 크다**: 사용자 데이터는 없지만(stub 컨텍스트) 나가는 것이 사업의 핵심 자산이다. `/preview` 는 `futurenowFlow` 를 **클라이언트로** import 하므로 러너 첫 화면만이 아니라 **`copy.ts` 의 `itemPrompts` 27개 전량**이 정적 청크에 실려 나갔다(프리렌더 `preview.html` 13.5KB + 청크). `/preview/report` 는 **104.7KB** 프리렌더 본문에 리포트 구조와 명명(§9.4 `시들음`·`원씽`·`번성`·`나침반`)을 그대로 담았다. `/preview/entry` 26.5KB(진입 퍼널 문안) · `/preview/console` 24.3KB(콘솔 레이아웃·돌봄 신호). §7 이 참여자 렌더 경로에서 구인명·강의 어휘를 막는 동안 이 경로가 인증 없이 전부 내보내고 있었다. **판단 — 지우지 않고 게이트한다**: 넷 다 복제본이 아니라 **실물 컴포넌트를 그대로 렌더**하므로(`ResponseRunner`·`ReportScreen`·`GroupView`·`_screens/*`) 드리프트가 0이고, 지우면 §4·§5·§7·§8 의 디자인 확인 경로를 잃는다. **구현 — 페이지마다 넷 다는 대신 `src/app/preview/layout.tsx` 하나**. 세션은 미들웨어(`PROTECTED_PREFIXES` 에 `/preview` 추가), 역할은 레이아웃(`role === 'user'` → `/home`, 게이트 기준은 ADR-92 인도자 콘솔과 동일)이 막는 **이중 방어**다. 레이아웃 한 자리로 둔 것은 `PROXY_MATCHER` 불변식과 같은 사고 — **신규 미리보기 라우트가 opt-in 없이 기본 보호되고, 뚫으려면 명시적으로 손대야 한다.** `dynamic = 'force-dynamic'` 으로 프리렌더를 금지한다(게이트를 걸었는데 정적 HTML 이 남으면 의미가 없다). 회귀 잠금: `proxy.guard.test.ts` 가 네 라우트를 **개별로** 못 박고 `/previewer` 접두 오매칭도 함께 막는다. **검증(CLAUDE §9 규율 — 200 을 통과로 보지 않는다)**: build 에서 넷 다 `○`(static) → `ƒ`(dynamic) 전환 · 프리렌더 HTML 4개 **소멸** · 실서버 미인증 요청 넷 다 **307 → /login**, 본문 6바이트, 문항·명명 0 · 정적 프리렌더 HTML(`/`·`_not-found`·`_global-error`)이 로드하는 청크 중 문항 원문 포함 **0**. **잔여 — `/join`(별건, 미조치)**: 공개 라우트 전수 조사에서 `/join` 만이 미인증 상태로 문항 원문 청크를 내보낸다(`JoinClient.tsx` 가 `futurenowFlow` 를 클라이언트로 import). `/`·`/login`·`/signup`·`/reset`·`/reset/confirm`·`/c/[code]/[session]`·404 는 모두 깨끗하다. 이 건은 참여자 진입 퍼널을 건드리므로 판단을 올렸고 **→ ADR-95 에서 `감수`로 종결**했다. 계약 0 · 코어 0 · DB 0. 검증: tsc 0 · eslint 0(기존 경고 1, 미접촉 `contracts/instrument.ts`) · vitest **474** · build 성공. directive 2026-08-06(보정 지시 — /preview 공개 노출). |
| ADR-94 | 3회차 책 페이지 확정 부착 + 실행 자신감 명단 노출 **기각** | **A — 책 페이지 다섯이 최종 조판 확정치로 붙었다**(지휘부 선언 2026-08-07). ADR-88·89 의 `확정된 값만 카드에 오른다` 조건이 이로써 해소된다. `gap_area` 94~95 · `stuck_named` **96~104** · `identity_gap` 108~111 · `pairText`(습관 짝) **117~118** · `speech_habit` 126~133. `stuck_named` 는 초안(96~103)에서 한 쪽 늘었다 — 참조는 `거기 쓴 것을 옮겨라`가 아니라 **`기억이 안 나면 여기를 펴 보라`는 좌표**이고 카드 문항이 겨누는 문장이 104쪽 상단에 있다. 반 쪽이 다음 활동에 걸치는 대가가 문장을 잘라 내는 대가보다 싸다. `pairText` 는 117~118 을 **나누지 않는다** — 사분면은 117쪽 펼침면 오른쪽 끝, 짝 원칙은 118쪽 다음 펼침면 왼쪽이라 현장에서 왼쪽 두 칸만 채우는 일이 여기서 생기고, 카드가 두 칸을 한 칸으로 세는 설계가 그 다리다. **부착 자리는 다섯이 아니라 여섯** — `gap_area` 만 `REQUIRED_3`(필수 선언)과 `areaPick.label`(렌더)에 같은 문자열로 두 벌 있다. 양쪽 다 붙인다(1·2회차 관례 동일). **결측 패널에 책 쪽수가 딸려 나오는 것은 의도로 확정** — `어디를 펴 보면 되는지`가 함께 나오는 편이 ADR-91 A `채우러 가기`의 취지에 맞다. 표기는 **문장부호 뒤 + 반각 공백 1칸 + 문자열 맨 끝**(마침표·물음표 동일), 1·2회차 10건과 코드포인트 단위 일치. **금지 테스트를 조용히 지우지 않고 뒤집었다** — `session3.test.ts` 의 `not.toMatch(/책 d+/)` 는 ADR-88·89 가 세운 의도된 문이라, 삭제하면 승인된 정책을 코드에서 몰래 되돌리는 것이 된다. 2회차 선례대로 `toContain` 다섯 열거 + 표기 규칙 단언 + `gap_area` 양쪽 일치 단언으로 교체했다. **`copyBaseline` 에 `session3` 을 넣었다** — `3회차는 잠금 대상이 아니므로 갱신이 필요 없다`는 사실이지만 **필요 없다는 것과 안 하는 게 옳다는 것은 다르다**(그때까지 3회차 문안 전체가 회귀 보호 밖이었다). 스냅샷은 참조를 **붙인 뒤** 뽑았다(먼저 뽑으면 참조 없는 상태를 잠그고 즉시 깨진다). `copyRegression` 순회를 세 회차로 넓히고, 회차 간 마음 낱말 차이(1·2회차 `아직 모르겠음` / 3회차 `딱 맞는 말이 없음`, ADR-91 C 의 의도된 차이)를 양방향으로 못 박았다. 음성 대조로 이빨 확인 — `96~104` 를 초안값 `96~103` 으로 한 글자 되돌리자 **세 테스트가 검출**. **B — 실행 자신감을 인도자 명단에 올리는 안은 기각**(지휘부 2026-08-07). 클코1 이 `ADR-86 금지의 근거가 ADR-91 D 로 무너졌다`고 반박했으나 **부분 인용이었다** — ADR-86 의 근거는 둘이고(문안 약속 + ADR-80 `채점 대상 아님`), 앞엣것만 죽었다. 금지 항목 여섯이 공유하는 성질(숫자를 등급으로 바꾸는 표현)도 뒤엣것을 가리키며 임계 강조도 같은 계열이다. **규율 명문화: 승인된 ADR 의 근거를 다룰 때는 전부 인용한 뒤 각각을 따로 판정한다.** 기각의 실질 근거는 셋 — ① **도구가 이미 있다**(ADR-86 펼침의 `scale` 블록, 서버 왕복 0)이고 인도자는 갈무리를 읽으려 어차피 전원을 펼치므로 추가 비용이 없다, ② 실측이 작다(2회차 제출 2건 · 전 DB `confidence` 실측값 6개 · 3 이하 실참여자 제출분 1건 — **8/9 에 펼칠 대상은 두 명**), ③ 문안의 약속은 인도자의 펼침과 4회차 블록 0 절차가 이행한다. **ADR-86 표시 규율을 개정하지 않는다. `RosterEntry` 에 `confidence` 를 더하지 않았다.** **재고 조건을 못박는다** — 한 회차 제출이 **8건 이상**이고 그중 **3 이하 응답이 3건 이상**일 때 다시 올린다(둘 중 하나라도 미달이면 올리지 않는다). 조건 판정에 B 가 필요해지지 않도록 **판정 SQL 을 여기 둔다**: `select session_no, count(*) filter (where submitted_at is not null) as 제출, count(*) filter (where submitted_at is not null and (answers->>'confidence')::int <= 3) as 삼이하 from checkins where cohort_id = :id group by 1 order by 1;`. **대체 소항목 2건**(B 기각과 무관하게 8/9 에 인도자가 실제로 겪을 것): ① **회차 기본 선택** — `sessions[0]`(=1회차) 고정이라 8/9 에 열면 1회차를 보면서 3회차를 준비하게 된다. `defaultSessionNo` 신설(순수·단위테스트 8) — 열린 회차 → 없으면 마지막으로 마감된 회차 → 둘 다 없으면 첫 회차. 열린 것이 여럿이면 **회차 번호가 큰 쪽**(현 일정은 창이 안 겹치지만 일정 편집이 임의 날짜를 허용한다). ② **`--color-care` 두 줄 제거** — 지각과 연락 요청이 같은 앰버로 뭉개져 인도자가 두 신호를 구별하지 못했다. 토큰 참조를 걷어내 fallback 이 살아나면 **지각=muted / 연락 요청=navy** 로 갈린다(연락 요청은 돌봄 채널, 지각은 단순 사실). **문안 드리프트 정정** — `readModel.ts` 주석의 옛 문구 인용을 현행으로 고치고, ADR-86 본문에는 **원 인용을 지우지 않고 정정 주**를 달았다(지우면 `근거 하나가 죽었다`는 사실이 사라져 다음 사람이 같은 부분 인용을 반복한다). 회람용 `futurenow_checkin_session3_review.html` 은 **검토 시점 스냅샷**임을 상단에 명기하고 동기화 대상에서 제외했다(정본이 둘이면 그것이 드리프트의 원인 — 최신 문안은 ADR-92 미리보기로 본다). **이월**: `copy.wrap.confidence.min/max` 죽은 선언(카드가 0·10 을 하드코딩, 전역 grep 0건)은 B 가 없어져 당장 문제가 아니다 — 4회차 작업 때 되살리거나 걷어낸다. 1·2회차 마음 낱말 통일도 2기 시작 전(저장값이 없을 때). **실측 기준 명시**: `실기수 제출분 10건(1·2회차 합산) 중 6건 미응답, 2026-08-07 기준`(1회차 단독은 8건 중 5건 · 전체 코호트는 11건 중 6건 · 초안 포함은 22건 중 16건 — 기준을 안 적으면 과거의 6 vs 7 혼선이 재발한다). **관찰(범위 밖·지휘부 처리)**: 1회차 11명 개시·8명 제출 → 2회차 6명 개시·2명 제출. 마지막 초안 진척이 61시간 전이라 이탈이 `confidence` 미응답보다 큰 신호다. 계약 0 · 코어 0 · DB·마이그레이션 0. 검증: tsc 0 · eslint 0 · vitest **487**(474→487) · build 성공. directive 2026-08-07(CC ORDER + CC MEMO 정정) 승인. |
| ADR-95 | `/join` 문항 원문 노출 — 감수(코드 소지자와 동등한 노출로 본다) | **사실**: `/join` 은 공개 라우트인데 `JoinClient.tsx` 가 `futurenowFlow` 를 **클라이언트로** import 해, 사전진단 문항 원문 전량(`copy.ts` `itemPrompts` 27개)이 미인증 방문자에게도 내려가는 청크에 실린다. 러너는 인증 뒤(`step==='runner'`)에야 그려지지만 **번들은 첫 로드에 함께 나간다.** ADR-93 이 `/preview` 를 닫으며 발견했고, 공개 라우트 전수 조사(`/`·`/login`·`/signup`·`/reset`·`/reset/confirm`·`/c/[code]/[session]`·404)에서 **유일하게 남은 자리**다. **결정 — 고치지 않는다(지휘부 2026-08-07).** 근거: 차수 코드를 가진 사람은 어차피 문항을 전부 보므로, 노출의 실질 증분은 `코드 없이 누구나`이고 그 차이가 이 사업에서 감수할 수 없을 만큼 크지 않다. 사용자 데이터·리포트 구조·채점 가중치는 이 경로로 나가지 않는다(그것이 ADR-93 이 닫은 `/preview` 와 다른 점이다). **세 선택지를 놓고 고른 것이다** — ① `next/dynamic` 지연 로드: 초기 HTML 에서 청크가 빠지지만 이름이 loadable 매니페스트에 남아 **진짜 게이트가 아니다**(문턱만 올림). ② 스키마를 인가 후 서버에서 내려주기: 실제로 닫히지만 `ResponseRunner` 의 `schema` prop 계약에 닿는 구조 변경이라 §0.3 승인 사항이고 진입 퍼널 회귀 검증이 따른다. ③ 감수. **①을 쓰지 않은 이유가 중요하다** — 닫히지 않았는데 닫힌 것처럼 보이는 상태가 감수보다 나쁘다. 감수는 기록으로 남지만 반쪽 조치는 다음 감사에서 `이미 처리됨`으로 읽힌다. **코드에 표식을 남긴다** — `JoinClient.tsx` 의 해당 import 위에 `의도적으로 남겨 둔 것이며 되돌리려 하지 말 것` 을 근거와 함께 적었다. 결정을 기록만 하고 코드에 남기지 않으면, 다음 사람이 `실수`로 보고 고치려다 진입 퍼널을 건드린다(ADR-93 이 `/preview` 를 지우지 않고 게이트한 것과 같은 사고 — 값싸고 명백한 것은 닫고, 값이 비싼 것은 **명시적으로** 감수한다). **재검토 조건(지휘부 확정 2026-08-07)**: `/join` 에 인스트루먼트 모듈을 새로 `import` 하는 변경은 이 ADR 을 다시 읽고 한다. 리포트 해석 문안·채점 가중치·기준표가 이 경로로 나가면 감수의 전제가 무너진다. **ADR-93 이 `/preview` 에서 닫은 것이 정확히 그것이다.** 초안에 있던 `문항 세트 상품화` 조건은 **뺐다** — 재검토 조건은 **코드에서 관찰 가능해야** 한다. `import` 한 줄은 diff 에 드러나지만 사업 가정의 변화는 드러나지 않고, 조건을 가정에 걸면 그 가정이 바뀔 때 아무도 이 ADR 을 다시 읽지 않는다. 코드 0줄 · 계약 0 · 코어 0 · DB 0(주석과 문서만). directive 2026-08-07. |
| ADR-96 | 참여자 원문을 코드 저장소에 두지 않는다 — `docs/` 유입 차단 | **결함**: 로컬 `docs/` 에 62분 참여자 세션 녹취록(실명 포함·110KB)과 워크북·진행자 스크립트북이 있었는데 `.gitignore` 가 막지 않았다. 저장소는 **public** 이다(`loginheaven-jpg/futurenow-platform`). 이력 유입은 0건이라 아직 막을 수 있는 상태였으나 **무방비**였다 — 다음 커밋에서 `git add .` 나 `git add -A` 가 한 번 나오면 들어가고, **그러면 되돌릴 방법이 없다.** ADR-90 이래 여러 차례 `docs/ 는 커밋에서 제외했다`고 보고했으나 그것은 매번 손으로 뺀 것이었고 구조적 방어가 아니었다. **판단 착오의 기록**: 클코1 은 이 건을 `처분 결정 대기`로 묶어 미뤘다. 처분(별도 private 저장소 / 저장소 private 전환 / 유지)은 결정이 필요했지만 **보호는 결정이 필요 없었다.** 급한 것과 결정이 필요한 것을 한 덩어리로 보면 급한 것이 결정 속도에 묶인다 — 되돌릴 수 없는 위험은 처분과 분리해 **먼저** 막는다. **조치**: ① `.gitignore` 에 `/docs/` — 앞 슬래시로 저장소 루트에 앵커한다(없으면 하위 디렉터리의 다른 `docs` 까지 함께 막힌다). ② 로컬 `docs/` 를 저장소 밖으로 **이동**(삭제 아님) — `C:devjindan-private-docs`, 5개 파일 전량. ③ §6.0 규율 명문화. **private 전환은 하지 않는다(지휘부)**: 필요한 것은 저장소 성격을 바꾸는 것이 아니라 **그 파일을 저장소에 두지 않는 것**이다. private 으로 바꿔도 협업자가 늘면 접근이 함께 넓어지고 git 이력은 여전히 지우기 어렵다. **녹취록은 버전 관리가 필요한 물건이 아니다.** **실측**: `git log --all -- docs/` 빈 출력 · `--diff-filter=A` 에서 `docs/` 파일 추가 **0건**(이력 무오염 증명) · `git check-ignore -v` 가 `docs/` 와 녹취록 파일 모두 무시 판정 · `git add docs/` **거부**됨(`-f` 없이는 불가) · 이동 후 저장소 내 `docs` 부재. 코드 0줄 · 계약 0 · 코어 0 · DB 0. directive 2026-08-07(최우선 지시). |
| ADR-97 | 지시서·보고서를 저장소에서 유통한다 — `docs/` 를 allowlist 로 뒤집음 | **지시**(2026-08-07): 작업지시서는 `docs/tasks/`, 검토·완료 보고서는 `docs/reports/` 에 `.md` 로 둔다. **취지 수용** — 채팅은 휘발되고 지휘부는 fresh clone 으로 감리하는데(ADR-88), 지시서와 보고서가 저장소에 없으면 **감리 대상과 감리 근거가 따로 논다.** 저장소 루트에 흩어져 있던 `CC_ORDER_*`·`CC_PLAN_*`·`CC_REPORT_*` 4건도 이 폴더로 모을 자리가 생긴다(이관은 지시 대기 — 옮기면 기존 ADR 의 경로 인용을 함께 갱신해야 한다). **충돌**: 30분 전 ADR-96 이 `/docs/` 를 통째로 막아, 도착한 지시서가 실제로 차단돼 있었다. **해법은 되돌리기가 아니라 뒤집기** — `/docs/*` + `!/docs/tasks/` + `!/docs/reports/`. 종전이 `docs 를 막는다` 였다면 이제는 `docs 는 전부 막되 두 자리만 연다` 이므로 **ADR-96 보다 강한 자세**다: 녹취록·상담 기록이 `docs/` 에 다시 떨어져도, **새 하위 폴더를 만들어 떨어져도** 자동으로 걸린다. **문법 함정 — 단순화 금지**: git 은 디렉터리 자체가 제외되면 그 안의 negation 을 보지 않으므로 `/docs/` + `!/docs/tasks/` 는 **동작하지 않는다.** 반드시 `/docs/*`(한 겹만 제외)여야 하며, 이 사실을 `.gitignore` 주석에 남겼다. **양방향 실측**: 허용 3(`docs/tasks`·`docs/reports`·도착한 지시서 파일) 전부 추적 가능 · 차단 3(`docs/녹취록-테스트.txt`·**새 하위 폴더** `docs/원문/상담기록.md`·`docs/무엇이든.md`) 전부 `check-ignore` 판정. **두 폴더의 내용에도 §6.0 이 걸린다** — 공개 저장소이고 그 사실은 바뀌지 않았다. 보고서는 실측 수치·집계·문안만(수치는 **분자·분모 기준과 기준 시점**을 함께 — ADR-94), 지시서는 더 위험하다(도착분에도 녹취 인용 2건이 있었다. 이번엔 이름이 없어 통과했으나 같은 형식으로 한 번 섞이면 그대로 공개된다). **규율**: 지시서에 실명·연락처·식별 가능한 정황이 섞여 오면 **커밋하지 않고 먼저 보고한다.** 두 폴더의 `README.md` 에 규율·파일명(`YYYY-MM-DD-<슬러그>-검토/완료.md`)·§11 보고 규격을 적었다. **보고 채널은 병행으로 잡았다** — 채팅에 요약, 파일에 전문(즉시 읽을 것과 나중에 감리할 것은 분량이 다르다). 코드 0줄 · 계약 0 · 코어 0 · DB 0. directive 2026-08-07. |
| ADR-98 | 3회차 갈무리 개정 1차 — 우당탕탕 신설 · 습관 짝 순서 반전 · 문안 4 | **근거**: 3회차 실강(2026-08-09·143분) 녹취와 코치 검토. **개정 1 — `rough_project` 신설**(1면 `areaPick` 둘째 줄·**선택**·필수 6칸 불변). 인도자가 카드에 적으라고 지정한 항목이 카드에 없었다. 필수로 올리지 않은 것은 **과제 시점이 어긋나기** 때문이다(갈무리 제출은 이틀 안, 명명은 다음 주까지) — 필수면 아직 정하지 못한 사람이 카드를 닫지 못한다. 책 참조도 붙이지 않는다(98쪽은 바로 아래 `stuck_named` 가 이미 참조하는 96~104 안이고, 참조가 여섯이 되면 카드가 색인처럼 읽힌다). **타입: `areaPick.line` → `lines: readonly CheckinField[]`.** `line2` 같은 임시 필드를 더하지 않은 이유는 ADR-90 과 같다 — 슬롯을 회차마다 늘리면 7회차에 무너진다. 1·2회차는 한 줄짜리 배열이 될 뿐 **문안이 한 글자도 바뀌지 않아** 리터럴 잠금에 무영향(양방향 단언으로 확인). 렌더·`readModel` 두 곳이 순회로 바뀌었다. **개정 2 — 습관 짝 기입 순서 반전**(시작할 것 위 · 없앨 것 아래). 사분면 좌측 상단이 Eliminate 이고 사람은 위에서부터 채우므로, 짝 맞추기를 나중에 요구하면 **이미 자책 목록이 완성된 뒤**다. 배치가 아니라 **순서**가 만든 결과다. **키는 바꾸지 않는다** — 저장값·결측 판정·나눔 열이 그대로 산다. `to.help` 삭제(연결선 `↓ 그 자리를 만들려면` 이 같은 논리를 진다). **`REQUIRED_3` 도 순서와 라벨 문자열을 함께 고쳤다** — 지시서는 순서만 말했으나 라벨도 바뀌므로, 한쪽만 고치면 결측 안내가 화면과 다른 문안을 읽어 준다(`gap_area` 와 같은 이중 기재. ADR-91 일반화 테스트가 잡는다). 즉 개정 2 의 실제 수정 지점은 다섯이 아니라 **일곱**이었다. **개정 3·4·5 — 문안**: 심화① 부정 서술(`~이 아닙니다`)을 긍정형으로(삭제 의견은 미수용 — 심화 블록의 유일한 자책 방지 장치이고 실강에서 그 위험이 발현됐다) · 심화② 축약 · 한 걸음 `help` 가 우당탕탕을 잇는다(**대체는 미수용** — 4회차 결산이 `step_what`·`step_when` 을 되비추므로 대체하면 회차 간 사슬이 끊기고, 층위도 다르다). **개정 1·5 는 묶음**이다(5의 문구가 1의 칸을 가리킨다). **`summaryFields` 넷째로 우당탕탕 — 자리는 가운데가 아니라 마지막**(클코1 판단): 선택 항목이고 과제 시점이 `다음 주까지`라 **빈 칸이 가장 많이 날 항목**이라, 가운데면 빈 칸이 목록 한복판에 생겨 읽는 흐름이 끊기고 끝이면 있는 사람만 덧붙는 모양이 된다. 짝의 `{from:habit_stop, to:habit_start}` 는 **의미 방향**이라 화면 기입 순서와 별개로 유지. 열람(`readModel`)은 반대로 **카드 순서를 따른다** — 열람은 카드를 되비추는 것이다. **배포 시점이 이 건의 실제 쟁점이었다**(지시서·초판 검토서 모두 놓쳤다): 3회차는 **당일 00:00 에 이미 열렸고** 실강이 오전이라 참여자가 쓰는 중일 수 있는데, 개정 2 는 값을 보존하면서도 **화면에서 두 칸의 자리를 바꾼다** — 이미 위 칸에 적은 사람이 다시 열면 자기 문장이 아래로 내려가 있다(ADR-91 C 와 같은 계열, 값은 살지만 눈에 더 띈다). 지휘부가 **감수하고 당일 배포**를 택했다 — 개정 2 의 목적이 `자책 목록이 완성되기 전에 짝을 맞추게 한다` 인데 미루면 이번 주 참여자가 정확히 그 상태로 한 주를 보낸다. 자리 이동은 한 번 놀라고 끝나지만 자책은 남는다. **`copyBaseline` session3 재생성**(85→88) — ADR-94 가 방금 잠근 자리라 문안 일곱 곳 변경이 곧바로 걸렸고, 이는 사고가 아니라 **잠금이 작동한 것**이다. 재생성 뒤에는 무엇이 왜 바뀌었는지가 스냅샷에서 사라지므로 ADR-91 D 선례대로 **명시 단언**(옛 문안 부재 + 새 문안 존재 + 1·2회차 무영향)을 함께 달았다. 음성 대조: `connector` 와 `REQUIRED_3` 순서를 되돌리면 **네 테스트가 검출**. **미결(지시서 §4·이월)**: 여섯 번째 영역(신앙 축) 6축 승인 대기 · 마음 낱말 `조급함` 은 3회차 제출 데이터로 4회차에 판단 · 한 걸음 동질화는 스크립트북 사안 · 워크북 개정안 승인 시 `identity_gap` 108~111 → 121~123(그때 `session3.test.ts` 열거 단언과 baseline 을 **함께** 고쳐야 한다). 계약 0 · 코어 0 · DB·마이그레이션 0. 검증: tsc 0 · eslint 0 · vitest **496**(489→496) · build 성공. directive 2026-08-09(GALMURI_ORDER_S3_rev1). |

---

## 12. 용어집

- **코어 / 런타임**: 채점하지 않는 1층 공유 인프라(인증·차수·코치·응답봉투·알림·UI).
- **인스트루먼트(진단)**: 코어에 꽂히는 전용 모듈(퓨처나우·SAIL).
- **계약(contract)**: 진단이 코어에 제공하는 4종 구현 규격(응답흐름·채점·리포트·알림).
- **봉투(envelope)**: `responses`의 코어 소유 메타. 속(answers·subjectProfile)은 진단 소유.
- **wave**: 사전(pre)·사후(post). 단발 진단은 null.
- **돌봄/Red Flag**: 위기 신호 → 인도자 즉시 알림.
- **인도자 / 코치**: 화면·안내·문서·AI 프롬프트에 노출되는 역할명은 **'인도자'**다. 코드 식별자·DB 컬럼·RPC·라우트는 `coach`를 유지한다(마이그레이션 위험 대비 편익 없음). '코치'라는 낱말은 워크북 STEP 1의 은유 — 참여자가 자기 인생을 대하는 태도 — 를 가리킬 때만 쓴다. AI 프롬프트(`interpretation.ts`)는 화면 어휘를 따른다(출력 오염 방지 — `INTERPRETATION_SYSTEM_PROMPT`·`buildInterpretationInput` 회귀 단언으로 고정). `CoreForbiddenError` 메시지의 '코치'도 '인도자'로 교체(refineActionError는 '가능합니다' 접미사 매칭이라 정제 유지).
