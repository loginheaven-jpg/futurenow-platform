# 3회차 SEED 12개 액션아이템 반영

확정 HTML 시안과 2026-10-13 채팅 결정을 소스에 반영했다. 띠 문구는 “오늘 발견한 변화의 걸림돌과, 생각·말·행동에서 바꿀 실천을 기록합니다.”이다.

## 변경 파일과 상태

| 파일 | 상태 | 결과 |
|---|---|---|
| `src/instruments/futurenow/checkin/session3.ts` | 완 | SEED 12개 문안·키·예시, 필수 8묶음, 함정 질문·보조문구·띠 문구, 습관 짝·심화·비공개 체크 작성 숨김 |
| `checkin/index.ts`·`slots.ts` | 완 | SEED 슬롯·작성 숨김 속성. `/src/contracts`와 다른 인스트루먼트 내부 타입 |
| `checkin/readModel.ts` | 완 | 본인·인도자 상세 열람에 SEED 전량. 숨긴 챕터의 옛 답과 비공개 플래그는 계속 존중 |
| `CheckinCardClient.tsx`·`SeedActions.tsx`·`SeedActions.module.css` | 완 | 모바일 1열·큰 화면 2열, 입력·자동저장·빈칸 이동·한 걸음 선택·카운터 |
| `checkin/[session]/actions.ts` | 완 | SEED 회차의 필수 판정 서버 확인. 빈 초안은 저장하며 제출만 차단 |
| `checkin/copyBaseline.json`·`copyRegression.test.ts` | 완 | 생성기로 기준선 갱신. 승인한 함정 문안 두 문장만 예외. 다른 회차 문안 델타 0 |
| `session3.test.ts`·`session4.test.ts`·`required.test.ts`·`slots.test.ts`·미리보기 테스트·액션 테스트 | 완 | 새 필수 항목, 실제 렌더, 과거 답 공존, 서버 제출, 기존 회차 연결 검증 |
| `scripts/verifyCheckinSeed.mjs` | 완 | 운영 DB의 QA 회기에서 12개 키 저장·수정·재조회·제출·권한 검증. 전 과정 롤백 |
| `scripts/checkinSeedBrowser.mjs` | 완 | localhost:3013 실제 카드·서버 액션·운영 DB·재방문·인도자 상세 열람 검증. QA 기록 원복 |
| `docs/tasks/session3-seed-addition-v1.html` | 완 | 띠 문구를 확정 문구로 교체 |
| `architecture.md`·`futurenow_copy_principles.md` | 완 | §9.7·ADR-198, 함정 교재 명칭과 범위 안내의 승인 예외 |

## DB와 기존 기록

운영 프로젝트의 `checkins.answers`는 JSONB이며 `checkin_save`는 응답 키를 제한하지 않는다. 새 문자열 12개를 현재 RPC로 저장·재조회할 수 있음을 실제 호출로 확인했다. **DB 스키마·마이그레이션·RPC·RLS·코어·계약 변경 0**. 질문 내용을 DB 컬럼으로 늘리거나 과거 답을 새 키로 옮길 필요가 없다.

기존 `habit_start`·`habit_stop`·`speech_habit` 답을 삭제하지 않으며 열람에서 계속 보인다. 새 작성에는 두 챕터가 나오지 않는다. 기존 `submitted_at`과 `step_private`를 유지한다. 비공개 체크를 화면에서 뺐다는 이유로 저장된 비공개 선택을 false로 덮지 않는다. 기존 제출은 읽을 수 있으며 재편집하여 제출할 때는 새 필수 항목을 채운다.

나눔 후보는 바라는 것·우당탕탕 프로젝트·새로 시작할 행동이다. SEED 상세는 열두 답 전량을 읽는다. 비공개 대상인 `step_what`을 나눔 후보 열에 넣지 않는다. 4회차의 영역·프로젝트·한 걸음 되비추기와 여정의 `gap_want` 연결은 유지한다.

## 검증 (2026-10-13)

- `node scripts/verifyCheckinSeed.mjs`: SEED 12개 저장·수정·제출·재조회, 과거 답·비공개 값 보존, 본인·담당 인도자·운영자·제3자 RLS 통과. authenticated 직접 INSERT/UPDATE 권한 없음 확인. 트랜잭션 롤백.
- `node scripts/checkinSeedBrowser.mjs`: 390px 모바일에서 12개 입력칸, 두 챕터와 비공개 체크 부재, 빈칸 이동, 액션아이템 선택, 제출, DB 저장, 본인 읽기·편집 재방문, 인도자 12개 상세 열람 통과. 가로 넘침·페이지 오류 0. QA 기존 기록 원복.
- `node scripts/regenCopyBaseline.mjs --verify`: 델타 0.
- `git diff --check`: 통과.
- 완주 검증: 타입 오류 0, 린트 오류 0·경고 3, **테스트 1783 통과 / 87 스킵 / 총 1870**. **Test Files 156 passed / 7 skipped / 총 163**. 빌드 성공. 아래는 `node scripts/verify.mjs` 출력 전문이다.

## 문서·계약·배포 상태

`architecture.md` §9.7와 ADR-198에 새 구조·키·저장 방식·기존 기록 보존·검증 명령을 반영했다. `/src/contracts` 변경·계약 이탈 없음. 인스트루먼트 내부 `CheckinSession`만 확장했다.

시안 구현 검증은 로컬 수정 코드와 운영 DB의 QA 자료로 실행했다. 이 보고서의 최초 작성 시점에는 운영 배포 전이었다. 이후 사용자 요청 “자체 테스트 후 이상없으면 배포하세요”에 따라 재검증하고 운영 배포를 진행한다. 재검증 출력은 `2026-10-13-session3-seed-배포전검증.txt`, 최종 배포 결과는 `2026-10-13-session3-seed-배포.md`에 기록한다. DB 선행 작업은 없다.

```text

── tsc ──
오류 0

── eslint ──
77:3  warning  Unused eslint-disable directive (no problems were reported from 'react-hooks/purity')
  23:8  warning  Unused eslint-disable directive (no problems were reported from '@next/next/no-html-link-for-pages')
✖ 3 problems (0 errors, 3 warnings)
  0 errors and 2 warnings potentially fixable with the `--fix` option.

── vitest ──
Test Files  156 passed | 7 skipped (163)
      Tests  1783 passed | 87 skipped (1870)
   Duration  7.93s (transform 15.63s, setup 0ms, import 42.18s, tests 9.80s, environment 29ms)

  스킵 사유 — 전부 **의도된 옵트인**이다:
    tests/membership.integration.test.ts         실DB 옵트인 — RUN_RLS_INTEGRATION=1 일 때만 돈다
    tests/feed.integration.test.ts               실DB 옵트인 — 같은 스위치
    tests/rls.integration.test.ts                실DB 옵트인 — 같은 스위치
    tests/defaultPrivileges.integration.test.ts  실DB 옵트인 — 같은 스위치(pg_default_acl 실측)
    tests/memberDirectoryMask.integration.test.ts 실DB 옵트인 — 같은 스위치(마스킹 규칙을 함수에 먹인다)
    tests/workbookPhotos.integration.test.ts     실DB 옵트인 — 같은 스위치 + QA 계정 env(「인도자 열람」 역할별 판정 · 적용 전이면 본문을 트랜잭션 안에서 적용)
    tests/feedReactionsMulti.migration.test.ts   적용 전 전용 하네스 — 원장을 보고 스스로 건너뛴다(이미 적용됨)
    tests/site.snapshot.test.tsx                 캡처 산출 옵트인 — 출력 디렉터리가 있을 때만 돈다

── next build ──
성공
Route (app)                                       Revalidate  Expire
┌ ○ /                                                     5m      1y
├ ○ /_not-found
├ ○ /about
├ ƒ /account
├ ƒ /admin
├ ƒ /admin/approvals
├ ○ /api/version
├ ƒ /c/[code]/[session]
├ ƒ /c/[code]/values
├ ƒ /coach
├ ƒ /coach/cohort/[cohortId]
├ ƒ /coach/cohort/[cohortId]/checkin
├ ƒ /coach/cohort/[cohortId]/checkin/preview
├ ƒ /coach/cohort/[cohortId]/group
├ ƒ /coach/cohort/[cohortId]/matrix
├ ƒ /coach/cohort/[cohortId]/member/[userId]
├ ƒ /coach/cohort/[cohortId]/report/[responseId]
├ ƒ /coach/cohort/[cohortId]/values
├ ƒ /coach/cohorts
├ ƒ /coach/new
├ ƒ /contact
├ ƒ /feed
├ ƒ /home
├ ƒ /home/assessments
├ ƒ /join
├ ƒ /library
├ ƒ /library/[id]
├ ƒ /library/[id]/file
├ ƒ /library/[id]/thumb
├ ƒ /login
├ ƒ /my/cohorts
├ ƒ /my/cohorts/[cohortId]
├ ƒ /my/cohorts/[cohortId]/checkin/[session]
├ ƒ /my/cohorts/[cohortId]/journey
├ ƒ /my/cohorts/[cohortId]/report
├ ƒ /my/cohorts/[cohortId]/values
├ ƒ /my/values
├ ƒ /news
├ ƒ /news/[id]
├ ƒ /pending
├ ƒ /preview
├ ƒ /preview/console
├ ƒ /preview/entry
├ ƒ /preview/report
├ ƒ /preview/site
├ ○ /recruit                                              5m      1y
├ ƒ /reset
├ ƒ /reset/confirm
└ ƒ /signup
O 네 지표 전항 통과 — 위 출력 전문을 그대로 보고에 붙인다

```
