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
| `/account` | 로그인(3페르소나) | 내 정보(Step 2.5·**A2 완결**). 이름=`setName`(users.name)·전화=`setPhone`(user_contacts)·**프로필(성별·생년·종교·신앙연수)=`setProfile`**·**(코치)KPC=`setMyCoachKpc`**·비번=`updateUser`. 프리필=`getProfile`/`getMyCoachKpc`. role 쓰기 경로 없음(2.S2 봉쇄). 게이트 미인증→/login |
| `/admin` | 운영자 | 두 섹션 구분(A3) — **승인 대기**(`listCoachApplications('pending')`→`decideCoachApplication` 승인/거절, 승인 시 user→coach 원자 승격) + **멤버 관리**(`listUsers`+`setUserRole` 승격/강등, 이름 클릭→세부 `memberDetailAction`[신원+활동] ADR-71, 세부 내 하드삭제 `deleteMember` ADR-70). 운영자 게이트(§8.6) |
| `/join` | 참여자 | preview→enroll→runner→finalize(거울). 코드 진입(참여자 가입 결속). **`?code=` 초대 링크 deep-link(A5)**. **`?wave=post` 사후 진입(B-2)** — getSchema(post)·wave='post' 저장(기본 pre). `?cohort=` 재진입과 함께 실림. **general 체험(D-2·ADR-63)**: CodeInput 하단 '체험 진단 시작하기' → `onCode(GENERAL_CODE='JOINF')`(딥링크 동형) → CohortPreview `isGeneral`(인도자·인원 숨김·체험 문구) → 기존 enroll→runner 합류. 사전 wave 고정(general 사후 없음) |
| `/coach` | 코치/운영자 | 차수 목록 = **운영자 `listAllCohorts`(전체 인도자 차수·소유자명 표시)** / 인도자 `listCohortsByCoach(me.id)`(ADR-74) + 차수별 `buildCohortRoster`(먼저 챙길 분=`listAlerts` care/red_flag). `/coach/cohorts`(모든 차수)도 동일 분기. **(운영자) 승인 대기 N건 배너→/admin**(콘솔 진입 시). admin 로그인 착지는 **/home**(loginOutcome 전원 /home·ADR-51) — 홈 '본부' 카드에 승인 대기 건수 노출(ADR-59, 배너와 이원) |
| `/coach/new` | 코치/운영자 | `createCohort` |
| `/coach/cohort/[cohortId]` | 코치/운영자 | `getCohort`·`listEnrollments`·`listResponses`·`listAlerts`·`listCohortMembers` → 3숫자·3묶음 + 관리(마감·정원=`updateCohort`, **사후 진단 개시=`openPostWave`**·ADR-55). **명단 행 휴지통=`removeCohortMember`**(차수에서 제거·2단계 컨펌·소유 코치/운영자만·ADR-73). **뒤로=진입 출처(`?from=` 콘솔/목록, 기본 목록·A′-4)** |
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
- **진입 흐름(§7) + 코치 콘솔(§8)** — **앱 레이어**(`src/app/_screens/`, 코어 UI·인스트루먼트를 합성). 진입(갱신 2026-07-01): **공개 소개 현관(`/`)** → `/join`: 코드입력(CodeInput)→차수 미리보기(CohortPreview + 세미나 소개)→로그인/가입(AuthGate, 이름·전화 미요구 ADR-03)→시작 안내(StartGuide, 보안 고지·버튼=동의)→**참여 프로필(ProfileForm, ADR-32)**→러너→**완료(Completion 갈망 거울, ADR-27)→자기 홈(A-2)**. 콘솔: 홈(먼저 챙길 분 최상단·돌봄 우선)·차수 개설(3스텝)·차수 상세(3숫자+명단 3묶음)·모든 차수. **인도자 화면만 의미색(저채도 `--care-*`), 참여자 진입 화면 경고색 배제.** 미리보기 `/preview/entry`·`/preview/console`. **CohortPreview 메타 타입은 앱 로컬**(`_screens/types.ts`) — 계약 승격은 보류(아래).
- **응답 위젯 5종 + 러너**(§4): 나침반=세그먼트바(중앙 유지)·리커트=행스택+척도 sticky+도트22px(히트44px)·간격=슬라이더+숫자·주관식=텍스트영역·체크=행토글(경고색 금지·골드 선택). `src/core/response/ResponseRunner.tsx`(시각부: 블록 흐름·위젯 렌더·진행·필수 게이팅·제약무작위 배열[`ordering.ts`]·완료 시 `saveResponse`). 참여자 화면 경고색 배제(§0.4). 미리보기 라우트 `/preview`.
- **리포트 시각화 5종 + 배치**(§5·§6, B③ 구현 완료): 나침반=덤벨·간격=레이더(사후 네이비13% 면+사전 회색 점선)·GROW+F=충전막대(사후 네이비·사전 회색)·활력=띠 이동(시들음/중간/번성 저채도 구간+상태배지)·돌봄 신호=조건부 배너(저채도 `--care-*`). 배치: 돌봄→헤드라인(활력·나침반)→깊이(간격·GROW)→주관식, 데스크톱 2×2/모바일 1열. **본문 시각물 네이비·회색, 의미색은 돌봄 배너에만.** 명명(시들음·원씽)은 리포트에서만(§9.4). `src/instruments/futurenow/report/*` + `report.tsx`(ReportPlugin: renderScreen·renderGroup·renderPdf[react-pdf, 서버 전용]). 미리보기 `/preview/report`. **InstrumentModule 최종 조립** = `src/instruments/futurenow/index.ts`.
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

---

## 12. 용어집

- **코어 / 런타임**: 채점하지 않는 1층 공유 인프라(인증·차수·코치·응답봉투·알림·UI).
- **인스트루먼트(진단)**: 코어에 꽂히는 전용 모듈(퓨처나우·SAIL).
- **계약(contract)**: 진단이 코어에 제공하는 4종 구현 규격(응답흐름·채점·리포트·알림).
- **봉투(envelope)**: `responses`의 코어 소유 메타. 속(answers·subjectProfile)은 진단 소유.
- **wave**: 사전(pre)·사후(post). 단발 진단은 null.
- **돌봄/Red Flag**: 위기 신호 → 인도자 즉시 알림.
