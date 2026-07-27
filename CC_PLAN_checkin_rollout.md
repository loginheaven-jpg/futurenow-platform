# CC PLAN — 회차 갈무리 + 인도자 명칭 롤아웃 (클코1 작업계획)

> 작성: 클로드코드1(클코1) · 2026-07-27
> 수신: 지휘부 · **감리 클로드**(매 단계 클론·감리)
> 감사 기준 커밋: `ef21cfc` (main, 2026-07-18)에서 분기
> 대상 지시서(v3, 지휘부 발신):
> - `CC_ORDER_facilitator_naming` v3 — 인도자 명칭 교체(화면 문자열 한정)
> - `CC_ORDER_checkin_data_layer` v3 — 회차 갈무리 데이터 계층
> - `CC_ORDER_checkin_ui_session1` v3 — 회차 갈무리 화면·1회차 카드

이 문서는 세 지시서(v3)에 대한 **클코1의 수용 판정 + 실행 계획**이다. 코드 변경은 아직 없다. 착수 게이트(§4)를 지휘부가 승인하면 이 계획대로 진행한다.

---

## 0. 요약

- 세 지시서 v3를 **수용**한다. 2차 검토 지적(R1·R2·R3·R4)이 모두 정확히 반영됐다.
- 착수를 막지 않는 **교정 3건**(R5 + nit 2)은 실행 중 반영한다(문서 재순회 불요).
- 프리플라이트 2건 완료: **마이그레이션 드리프트 0**, **naming 전수 분류 확인**(사용자 노출 '코치' 0건).
- 착수 게이트: **naming Phase 1 분류표 승인** 1건.

---

## 1. 수용 판정 (v3)

지난 검토(B1·B2·B3·S1·S2·S3·S4·P1·P2·P3·P4)는 v2에서, 잔여(R1·R2·R3·R4)는 v3에서 해소됐다.

| 지적 | v3 처리 | 판정 |
|---|---|---|
| R1 seed 시점 모순 | 데이터 §4-4 주석 + UI Phase4·7 + 수용 §8("`createCohort` 미호출"). 옵션(b) 채택, 두 문서 일치 | 해소 |
| R2 save→submit 순서 | UI Phase4 "한 서버 액션 내 순차" + 데이터 §3.2 주석 + 수용 11-d | 해소 |
| R3 hasContent 출처 | `checkins.has_content` **컬럼 승격**(checkin_save가 기록) + `my_cohorts.open_session_has_content` | 해소 |
| R4 심볼명 | `buildInterpretationInput(SCORES_FIXTURE)` 확정(interpretation.ts:43 export) | 해소 |

D1(쓰기 GRANT 제거 → DEFINER RPC 전용)과 returnTo 앨로우리스트(오픈리다이렉트 방어)는 견고화 방향으로 정확.

### 프리플라이트 실측
- **마이그레이션 드리프트 0** — repo 최근 8개와 원격 `schema_migrations` 정확히 일치. 새 갈무리 마이그는 `20260713140000_admin_set_temp_password.sql` 이후 타임스탬프만 부여.
- **naming 전수 분류** — 런타임 문자열은 `core/context.ts:340·372·421`(CoreForbiddenError) + `interpretation.ts:18·34·36·70`뿐. 나머지 ~178줄은 트레일링 `//` 주석·식별자·`'김코치'` 픽스처. **사용자 노출 JSX '코치' 0건.**

---

## 2. 수용을 막지 않는 교정 (실행 중 반영)

| # | 내용 | 처리 |
|---|---|---|
| **R5** | 데이터 수용 §3 첫 항목 "참여자 본인 `checkins` INSERT/UPDATE 성공"이 D1(§5·§6·§7)과 충돌. D1으로 테이블 write GRANT가 없어 **직접 INSERT/UPDATE는 거부가 정상** | 검증을 "`checkin_save`/`checkin_submit` RPC로 본인 행 생성·수정 성공 + 직접 테이블 write는 거부 + SELECT는 성공"으로 실증 |
| **Nit1** | §4.2 "두 값"/§4.3 "두 필드" 문구는 낡음 — 상세표·코드블록·수용 §4는 **3필드(총 11)**로 정확 | 코드블록 기준 구현(`openSessionNo·openSessionSubmitted·openSessionHasContent`) |
| **Nit2** | `open_session_has_content`는 열린 회차 행 부재 시 `COALESCE(...,false)` 필요 | 구현 시 반영 |

---

## 3. 실행 계획

**전제.** 세 ORDER는 순차(naming → data-layer → ui). 각 ORDER = 구현 + `tsc`/`eslint`/`vitest`/`build` + 라이브 검증 + git push + CLAUDE §11 보고 + `architecture.md` 동기화. 계약 변경(`MyCohortSummary`+3, `CoreContext`+9메서드, `CohortSession`·`CheckinRecord` 신설)은 **본 ORDER가 지휘부 발신이므로 CLAUDE §1 승인 충족**.

### ORDER 1 — 인도자 명칭 (선행)

| Phase | 산출 | 검증/게이트 |
|---|---|---|
| 1 분류 | 전수 4갈래 분류표(§3.1) | **지휘부 승인 게이트** |
| 2 교체 | A 3건(context.ts) + B 4건(interpretation.ts) | 조사결합 주의 · C·D diff 부재 |
| 3 회귀 | system + user 프롬프트 이중 단언 | vitest 통과 |
| 4 문서 | `architecture.md` §12 용어집 "인도자/코치" | DoD |

#### 3.1 Phase 1 분류표 (첫 게이트 산출물)

| 갈래 | 건수 | 내용 | 처리 |
|---|---|---|---|
| **A. 사용자 노출** | **3** | `core/context.ts:340·372·421` `CoreForbiddenError('차수 …는 코치 또는 운영자만 가능합니다')` | '인도자'로 교체. `refineActionError`는 '가능합니다' 접미사 매칭이라 안전 |
| **B. AI 프롬프트** | **4** | `interpretation.ts:18·34·36·70`(시스템 3 + 유저 프롬프트 `buildInterpretationInput` 1) | '인도자'로 교체. 나머지 규칙 불변 |
| **C. 식별자·DB·라우트** | 다수 | `coach_id`·`/coach/*`·`coachName`·`role='coach'`·`CoachInfoGate` 등 | 불변 |
| **D. 주석·픽스처** | ~178 | 트레일링 `//` 주석 전량 + `'김코치'` 픽스처 | 불변 |

사용자 노출 JSX '코치' 0건 → 화면 스윕 없음. Phase 2 착수 시 전체 grep 재실행으로 무누락 재확인.

### ORDER 2 — 데이터 계층

| Phase | 산출 | 검증 |
|---|---|---|
| 1 마이그 | `cohort_sessions` · `checkins`(+`has_content`) · RPC 4종(`checkin_save`/`checkin_submit`/`checkin_mark`/`seed_cohort_sessions`) | set-diff 재확인 후 적용 |
| 2 RPC | `my_cohorts` 8→**11필드**(`post_opened`·`joined_at` 보존) | 재생성 전후 필드 대조 |
| 3 계약 | `domain.ts`(+3필드·2타입) · `core-context.ts`(+9메서드) | tsc |
| 4 서버 | `core/context.ts` 9메서드(zod 경계 · 쓰기 RPC 경유) | 신규 단위테스트 |
| 5 ADR | **ADR-80**(물리적 출현 순서 재확인) | 오름차순 |

**RLS 실증(역할별 실계정 · R5 반영):**
- 참여자: `checkin_save`/`checkin_submit` RPC로 본인 행 생성·수정 **성공** / 직접 테이블 INSERT·UPDATE **거부** / 본인 SELECT 성공 / 타인 SELECT 실패 / `cohort_sessions` INSERT 실패
- 담당 인도자: 차수 `checkins` SELECT 성공 / UPDATE 거부
- 타 차수 인도자: SELECT 실패
- 운영자: 전체 SELECT 성공
- `has_column_privilege`로 `authenticated`의 `checkins` INSERT·UPDATE 부재 확인
- 참여자 PostgREST 직접 UPDATE로 `submitted_at` 위조 거부 확인
- `checkin_save` 공백 answers → `has_content=false`, 한 글자 → `true`
- `checkin_mark(...,'prompt')` 3회 → `prompt_count` ≤ 2
- `seed_cohort_sessions` 7행 + 재호출 멱등(`DO NOTHING`) + `createCohort` diff 부재

### ORDER 3 — 갈무리 화면 (1회차)

| Phase | 산출 |
|---|---|
| 1 | `MultiChoiceChips` 위젯(인스트루먼트 중립) |
| 2 | 차수 홈 `/my/cohorts/[cohortId]`(상태별 시각 위계 · `hasContent` 판정) |
| 3 | 목록 카드 버튼 우선순위(`MyCohorts.tsx`) |
| 4 | 갈무리 카드 `/checkin/[session]`(자동저장 · save→submit · '준비 중' 상태) |
| 5 | QR `/c/[code]/[session]` + **returnTo 배선(앨로우리스트 · 오픈리다이렉트 방어)** |
| 6 | 전면 안내(모달 대체 · `prompt_count` 상한 · `openSessionHasContent` 문구 분기) |
| 7 | 인도자 회차 현황 `/coach/cohort/[cohortId]/checkin` + **회차 일정 UI(seed · 개별수정 · 미등록 경고)** |
| 8 | **ADR-81**(갈무리 노출 정책) |

**검증:** 실브라우저 하이드레이션(fetch 200 불충분) + §3 문안 대조(스크린샷) + 금지어(설문·진단·지각·미제출) + 낱말칩 동작 + 슬라이더 미선택 시작 + 오픈리다이렉트 방어 단위테스트 + **QR 실기기 리허설**.

---

## 4. 착수 게이트 (지휘부 승인 대기)

1. **ORDER 1 Phase 1 분류표(§3.1) 승인** — 승인 시 naming Phase 2부터 세 ORDER 순차 완주.
2. 계약 변경은 ORDER 자체로 승인됨(CLAUDE §1) — 별도 승인 불요, 확인만.

각 ORDER 완료 시 커밋 해시·변경 파일·검증 결과·`architecture.md` 반영을 §11 규격으로 보고한다.

---

## 5. ADR 번호 예약 (물리적 순서 재확인 후 확정)

- **ADR-80** — 회차 갈무리는 `responses` 밖에 둔다(별도 `checkins`·`UNIQUE+upsert`·DEFINER 쓰기).
- **ADR-81** — 갈무리 노출 정책(상시 진입로 + 모달 비강제 · 3층: QR/카톡/앱내안내).
- naming — `architecture.md` §12 용어집 "인도자/코치" 항목(별도 ADR 대신 용어집).
