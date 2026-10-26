# 5·6회차 갈무리 — 신호와 경험 연결

사용자 요청(2026-10-26): 저장소와 현재 작업 폴더를 최신 상태로 맞추고, 5회차의 신호 복수 입력·중복 질문 삭제와 6회차 경험 리마인드를 함께 수정해 배포한다.

## 변경 결과

| 범위 | 결과 | 상태 |
|---|---|---|
| 5회차 신호 입력 | 신호–행동 최대 8쌍, 추가·삭제, 먼저 해볼 한 가지 표시 | 완료 |
| 5회차 질문 정리 | 환경 깨달음 질문과 별도 다음 실천 입력 삭제. 짧은 실천 안내로 마무리 | 완료 |
| 5회차 필수 판정 | 5묶음. 한 쌍 이상 완성, 추가한 반쪽 쌍은 안내, 빈 추가 줄은 무시 | 완료 |
| 6회차 리마인드 | 5회차 신호 목록을 불러와 선택한 신호의 경험 질문 | 완료 |
| 6회차 경험 | 상황이 와서 실행함 / 상황은 왔지만 실행하지 못함 / 상황이 오지 않음 / 기억나지 않음 + 선택 서술 | 완료 |
| 6회차 맥락 보존 | 경험과 선택한 신호 원문을 함께 저장. 대상을 바꾸면 이전 경험 답 초기화 | 완료 |
| 기존 기록 | 삭제한 문항의 과거 답, 기존 6회차 결산과 비공개 실천을 보존 | 완료 |
| 표시 경로 | 작성·완료·재열람·회기 홈·인도자 상세/문장 모음·미리보기 연결 | 완료 |

6회차의 앞으로 90일 실천은 그대로 유지한다. 5회차의 `relief`, `step_what/step_when/step_blocker`는 새 입력에서만 제거했으며 저장 데이터를 삭제하지 않았다. `step_private`의 기존 가시성 약속은 유지한다. 신호 입력은 기존에도 공개 영역이었다.

## 변경 파일

- 문안·등록: `session5.ts`, `session6.ts`, `checkin/index.ts`, 생성한 `copyBaseline.json`.
- 반복 쌍과 열람: `pairs.ts`, `readModel.ts`, `slots.ts`.
- 작성·제출: `CheckinCardClient.tsx`, `SignalPairs.tsx`, `actions.ts`.
- 관련 화면: 회기 `dashboard.tsx`, 인도자 `checkin/page.tsx`, `CheckinPreviewClient.tsx`.
- 검증: `pairs.test.ts`, 회차 5·6 테스트, `CheckinPreviewClient.test.tsx`, `actions.test.ts`, `scripts/checkinSignals.mjs`.
- 문서: `architecture.md` ADR-200, `futurenow_copy_principles.md`의 해당 회차 예외, 본 보고서.

전 항목 완료. `/contracts`, 코어 저장 계약, DB 스키마·RLS·마이그레이션은 변경하지 않았다. 첫 쌍은 종전 키를 사용하고 추가 쌍도 기존 경계에서 허용하는 문자열 값으로 저장한다.

## 검증 근거와 한계

검증일: 2026-10-26. `node scripts/verify.mjs` 결과는 아래에 전문을 붙였다. 타입 오류 0, 린트 오류 0(기존 경고 3), 테스트 **1797 통과 / 87 스킵 / 1884 총**, **157 파일 통과 / 7 파일 스킵 / 164 총**, 프로덕션 빌드 성공.

최초 전체 실행의 실패 2건은 `.env.local` 파일 부재로 QA 안전 관문 모듈을 import하지 못한 것이다. `.env.example`을 로컬에 복사한 후 해당 5검사 및 전체 검증이 통과했다. 자격 증명은 추가·출력·커밋하지 않았다.

`node scripts/checkinSignals.mjs`는 실제 `CheckinCardClient`를 Chromium에서 실행한다. Next 내비게이션·사진과 서버 액션을 테스트 대역으로 두고 서버 액션의 저장 봉투를 브라우저 저장소에 기록한다. 이는 **실제 운영 DB 저장 검증과 구분**한다.

- 390px 모바일: 신호 2쌍 입력 → 둘째 선택 → 제출 → 재진입 시 입력·선택 복원.
- 첫 쌍 삭제 시 남은 쌍과 선택의 이동 확인.
- 6회차: 5회차 선택이 기본값 → 경험 선택만으로 신호 원문 저장 → 다른 신호로 변경 시 이전 답 초기화 → 새 경험 제출.
- 6회차 90일 계획과 경험이 각각 저장되고 재열람에 나타남.
- 5회차 기록이 없어져도 6회차에 저장된 신호 원문은 유지.
- 모바일·1280px 데스크톱 가로 넘침 없음, 브라우저 예외 0.
- 입력·열람·서버 제출 테스트로 기존 답변과 비공개 실천의 보존 확인.
- 추가 쌍 검증을 무시하는 변이를 실제로 심은 뒤 관련 테스트가 실패하는 것을 확인하고 원본 복원.

운영 로그인용 QA 자격과 DB 통합 검사 자격은 이 작업 환경에 없으므로 로그인 후 실DB 쓰기·역할별 RLS 실측은 수행하지 않았다. 권한 및 저장 경로는 변경하지 않았으며 실참여자 데이터 쓰기는 하지 않았다.

## 동기화와 배포 확인

출발점은 원격 `main`의 `262c985`이며 빈 `C:\dev\FUTUREnow`에 clone했다. `fix/session5-6-if-then`에서 작업한 후 검증한 변경을 `main`에 병합·push했다. 배포 대상은 기존 Vercel `futurenow-platform` 프로젝트의 production, 도메인은 `https://future.yebom.org`이다. 새 프로젝트·환경·스키마는 만들지 않았다.

Vercel 연결 도구의 팀 상세 조회는 403(팀 범위 권한 제한)이므로 기존 GitHub `main` 자동 배포를 사용한다. 배포를 증명하는 값은 고정하지 않고 아래의 원격 및 운영 신원을 대조한다.

```powershell
git ls-remote origin main
Invoke-RestMethod https://future.yebom.org/api/version
node scripts/postdeploy.mjs
```

`postdeploy.mjs`의 로그인 검사는 QA 자격이 없으면 실패로 보고한다. 이 제한을 배포 실패 또는 로그인 기능 결함과 혼동하지 않는다. 운영 반영 여부는 `/api/version`의 커밋·브랜치·production 신원을 원격 `main`과 맞춰 판정한다.

2026-10-26 배포 실측(아래 값은 이 시점의 증거이며 현재 헤드 조회를 대신하지 않는다):

- 구현 커밋: `dc73a2a` (`git log --oneline fix/session5-6-if-then`).
- 최초 배포 병합 커밋: `723fef9818c2e7777fc9778224ad3cbc2e15be63` (`git ls-remote origin main`).
- GitHub의 Vercel 상태: `success`.
- 운영 `/api/version`: `commitShort=723fef9`, `ref=main`, `env=production`, `deploymentId=dpl_4W7qETPwunn7Ye6bNdvn9wbERzao`.
- 빌드 시각: API가 반환한 `2026-10-26T01:49:19.116Z` (한국 시각 2026-10-26 10:49).
- 공개 현관·소개·모집 캐시·가입 딥링크 정상, 가입 POST 1회/6초(상한 3), 미인증 `/feed`는 로그인으로 이동하고 본문 누출 0.
- `postdeploy.mjs`에서 미실행으로 남은 것은 로그인 착지 3경로 한 항목이다. 이유는 `QA_USER_EMAIL/PASSWORD` 부재이며 통과로 표시하지 않았다.

이 배포 증거를 추가하는 후속 커밋은 보고서만 바꾸며 기능 코드는 동일하다. 후속 커밋의 최종 운영 반영도 원격 `main`과 `/api/version`을 대조한다.

## 완주 검증 출력


```text
── tsc ──
오류 0

── eslint ──
78:3  warning  Unused eslint-disable directive (no problems were reported from 'react-hooks/purity')
  23:8  warning  Unused eslint-disable directive (no problems were reported from '@next/next/no-html-link-for-pages')
✖ 3 problems (0 errors, 3 warnings)
  0 errors and 2 warnings potentially fixable with the `--fix` option.

── vitest ──
Test Files  157 passed | 7 skipped (164)
      Tests  1797 passed | 87 skipped (1884)
   Duration  6.29s (transform 10.84s, setup 0ms, import 26.83s, tests 10.16s, environment 33ms)

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
