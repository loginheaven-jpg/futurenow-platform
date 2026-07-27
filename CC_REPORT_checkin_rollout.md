# CC REPORT — 회차 갈무리 + 인도자 명칭 롤아웃 완료 보고 (클코1)

> 작성: 클로드코드1 · 2026-07-27 · 수신: 지휘부 · 감리 클로드
> 기준 커밋: `ef21cfc` → 완료 커밋 3건(아래). 대상 지시서: `CC_ORDER_facilitator_naming` v4 · `CC_ORDER_checkin_data_layer` v4 · `CC_ORDER_checkin_ui_session1` v4
> 판정: **세 ORDER 실행·검증·푸시 완료.** 잔여(라이브 브라우저·실기기 QR·전면안내 배너 UI)는 §5 명시.

---

## 0. 커밋 (GitHub main)

| ORDER | 커밋 | 요지 |
|---|---|---|
| 1 명칭 | `f4a1758` | 화면·AI 어휘 코치→인도자(코드 식별자 불변) |
| 2 데이터 | `1b8d130` | checkins·cohort_sessions·RPC·계약·코어(마이그 2건 원격 적용) |
| 3 화면 | `a69a80a` | 차수 홈·1회차 카드·QR·인도자 현황·returnTo |
| 문서 | `5a60f48`·`989b38d` | 작업계획(감리용) |

배포 순서(D2) 준수: **ORDER 2는 마이그레이션 원격 적용·라이브 검증 완료 후 앱 push.**

---

## 1. ORDER 1 — 인도자 명칭 (완료)

**변경 파일**: `src/core/context.ts`(CoreForbiddenError 3건) · `src/instruments/futurenow/report/interpretation.ts`(시스템·유저 프롬프트 4곳) · `interpretation.test.ts`(이중 회귀 단언) · `architecture.md §12`(용어집).

**Phase 1 분류표**(전수): A(사용자 노출) 3 = context.ts 340·372·421 / B(AI 프롬프트) 4 = interpretation.ts 18·34·36·70 / C·D(불변) ~178줄(주석·식별자·`'김코치'` 픽스처). **사용자 노출 JSX '코치' 0건.**

**검증**: tsc 0 · eslint clean · vitest(interpretation 12개, 신규 2 포함) · build ✓. `refineActionError`는 '가능합니다' 접미사 매칭이라 교체 후 정제 유지 확인.

**라이브(§5-8)**: 프롬프트 레벨 검증 완료(테스트가 시스템·유저 프롬프트에 '코치' 부재 고정). **AI 해석 초안 실생성 확인은 후속** — 기존 캐시 초안은 구 프롬프트 산물, 다음 자연 생성부터 '인도자' 반영(프롬프트가 출력 어휘를 결정하므로 리스크 0).

---

## 2. ORDER 2 — 데이터 계층 (완료·DB 라이브 검증)

**마이그레이션**(원격 적용·`schema_migrations` 기록·repo 정합 2↔2):
- `20260727100000_checkin_data_layer` — cohort_sessions·checkins(+has_content)·RPC 4종(checkin_save/submit/mark·seed_cohort_sessions)·my_cohorts 8→11필드
- `20260727110000_checkins_revoke_write` — **D1 강제**(아래 §4 이탈 참조)

**계약**: `MyCohortSummary` +3필드(openSessionNo·openSessionSubmitted·openSessionHasContent, **post_opened·joinedAt 보존**) · `CohortSession`·`CheckinRecord` 신설 · `CoreContext` +9메서드.
**코어**(`src/core/context.ts`): 9메서드 구현(쓰기 전량 RPC 경유)·매퍼 방어(`?? null`/`?? false`, D2)·saveMyCheckin 경계 zod.
**테스트**: `checkins.test.ts` 10 + `listMyCohorts` 매핑 갱신 + 픽스처 2건.

**RLS/RPC 라이브 실증 15/15**(set_config·SET ROLE 임퍼소네이트·throwaway 2차수, 잔여 0):

| 케이스 | 결과 |
|---|---|
| seed 7행 / has_content 공백false·내용true / submit | 7 / false·true / set ✓ |
| **참여자 직접 INSERT·UPDATE(submitted_at 위조)** | **permission denied(D1)** ✓ |
| 참여자 RPC(checkin_save/submit) write | 성공 ✓ |
| 참여자 본인 SELECT / cohort_sessions INSERT | 1 / RLS 거부 ✓ |
| prompt_count 상한(mark prompt×3) | 2 ✓ |
| 타차수 코치 SELECT / 담당 코치 SELECT·UPDATE | 0 / 1·거부 ✓ |
| 운영자 SELECT / seed 멱등 | 1 / 7 ✓ |

`has_column_privilege`: checkins SELECT=true, INSERT/UPDATE/DELETE=**false**. `createCohort` diff 부재(수용 §8).

**검증**: tsc 0 · eslint clean · vitest 304 · build ✓.

---

## 3. ORDER 3 — 갈무리 화면 (구현·검증 완료, 잔여는 §5)

| Phase | 산출 | 상태 |
|---|---|---|
| 1 위젯 | `MultiChoiceChips`(+`nextChipSelection` 테스트 5) | 완 |
| 2 차수 홈 | `/my/cohorts/[cohortId]/page.tsx`(상태별 시각 위계) | 완 |
| 3 목록 카드 | `MyCohorts.tsx` 우선순위(이번 주 갈무리 2순위·차수 홈 링크) | 완 |
| 4 갈무리 카드 | `/checkin/[session]`(page+CheckinCardClient+actions·자동저장·save→submit·완료상태·준비중/미개시 게이트) | 완 |
| 5 QR + returnTo | `/c/[code]/[session]` + `safeReturn.ts`·loginOutcome·login page/client(오픈리다이렉트 방어 테스트) | 완 |
| 6 전면 안내 배너 | markCheckinPrompted 인프라 완비 · **배너 UI 후속** | 부분 |
| 7 인도자 현황 | `/coach/cohort/[id]/checkin`(명단·한 걸음·나눔·일정 시드) + CohortDetail 링크 | 완 |
| 8 ADR-81 | architecture.md | 완 |

**문안**: `session1.ts`에 §3 원문 상수(임의 윤문 없음)·`checkinFilledCount`. 금지어(설문·진단·지각·미제출) 참여자 화면 미사용. confidence 슬라이더 미선택(`—`)→null 시작.

**검증**: tsc 0 · eslint clean(경고 0) · vitest **316** · build ✓(신규 4 라우트 컴파일). 단위테스트: safeReturnTo(오픈리다이렉트 3종 차단)·nextChipSelection·loginOutcome returnTo·MyCohorts 우선순위.

---

## 4. 계약(`/contracts`) 대비 이탈 — 3건(전부 견고화 방향, 사유 명시)

1. **D1 강제용 REVOKE 마이그 신설**(`20260727110000`). ORDER는 "checkins에 SELECT만 GRANT"를 전제했으나, **이 프로젝트는 default privileges로 신규 테이블에 authenticated 전체 write를 자동 부여**(responses 등 동일). GRANT SELECT만으로는 write가 남아 참여자가 PostgREST로 submitted_at 위조 가능 → **명시 REVOKE로 D1 강제**(테이블 REVOKE는 유효, 컬럼 REVOKE 무효와 다름). CLAUDE §5대로 새 마이그레이션. 라이브로 거부 확인.
2. **saveMyCheckin 경계 zod = 일반 구조 한계**(문자열 2000자·배열 8·32KB). ORDER §4.4 S4의 예시(mood≤2·confidence 0..10)는 futurenow 어휘라 **코어에 넣으면 §2·§7(코어의 인스트루먼트 어휘 무지) 위반**. 보안 의도(무제한 JSONB 차단)는 일반 한계로 충족, 인스트루먼트별 의미검증은 인스트루먼트/앱 층 몫으로 남김.
3. **/join returnTo 미배선**(로그인 경로만 완료). QR 비멤버 경로는 정상 join 흐름으로 저하(멤버 경로=주 경로는 완비). 후속 배선 권장.

계약 형상 자체(MyCohortSummary·CoreContext·신규 타입)는 ORDER 발신 그대로 — 임의 변경 0.

---

## 5. 막힌 지점·판단 필요·잔여

- **전면 안내 배너 UI(Phase 6)**: 서버 인프라(`prompt_count` 상한·`markCheckinPrompted`)는 데이터계층서 완비·검증됨. 홈/목록 진입 배너 렌더 UI만 후속. 기능 핵심(카드·저장·현황)은 배너 없이 동작.
- **라이브 브라우저 하이드레이션·문안 스크린샷 대조(수용 §2·§3)**: 인증 세션·실브라우저가 필요해 이 세션에서 미실시. build 성공+단위테스트로 대체. **지휘부 실계정 확인 권장.**
- **실기기 QR 리허설(수용 §11·§7)**: 실기기 필요 — 미실시. `safeReturnTo`·QR 라우트·login returnTo는 단위테스트+빌드로 검증. **현장 전 실기기 1회 필수.**
- **AI 초안 실생성 확인(ORDER1 §5-8)**: 다음 자연 생성 시 반영(프롬프트 고정 확인 완료).
- **회차 일정 개별 행 조정 UI**: seed(7행 일괄)는 완비, `held_at`/`opens_at`/`closes_at` 개별 수정 UI는 후속(`upsertCohortSessions` 계약·RLS 준비됨).

---

## 6. architecture.md 정합

ADR-80(갈무리 분리·D1·D2)·ADR-81(화면·노출정책) 추가(물리적 오름차순 확인) + §12 용어집 '인도자/코치'. 문서-코드 드리프트 0.
