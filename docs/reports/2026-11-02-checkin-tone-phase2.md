# 갈무리 문안 정비 — 후속 반영 및 통합 검증

검증일: 2026-11-02 (한국 시각)

## 순서와 범위

6회차 우선 반영은 PR #1로 병합되었고, 운영 배포 커밋 `443b42b5636b0971a216f3d4c83251176f80938d`에 대해 GitHub Vercel 상태가 success인 것을 확인했다.

- 운영 배포 확인: https://vercel.com/chois-projects-6fad4da6/futurenow-platform/5aq18i9iYMF6GF4fNtMKA8mBGNy4
- 이 단계는 그 커밋 위에서 1~5회차 문구 22개와 공통 화면 안내 4개를 교체한다.
- 합계는 6회차 12개 + 나머지 회차 22개 + 공통 4개 = 화면 문구 38개다.
- 새로운 문구는 경험·판단·실행 결과·보완점·다음 행동을 구체적으로 기록하게 한다.
- 응답 키, 필수/선택 구성, 선택지, 저장·제출 로직, 과거 응답, 비공개·익명 설정, DB와 계약은 변경하지 않았다.
- 숨겨진 과거 문항 및 6회차 legacy 문구는 임의 변경하지 않았다. 한 가지 실천에 집중하는 설계와 편지의 핵심 문장 옮기기는 보존했다.
- 문안 기준선은 생성 스크립트로 갱신했다. 이 단계에서는 1~5회차 22개만 교체되고 6회차 델타는 0이다.
- 문안 원칙과 architecture §9.7·ADR-202를 함께 갱신했다.

## 변경 파일

- `architecture.md`
- `futurenow_copy_principles.md`
- `src/app/(member)/my/cohorts/[cohortId]/checkin/[session]/CheckinCardClient.tsx`
- `src/app/_screens/CheckinPrompt.tsx`
- `src/app/coach/cohort/[cohortId]/checkin/preview/CheckinPreviewClient.test.tsx`
- `src/instruments/futurenow/checkin/copyBaseline.json`
- `src/instruments/futurenow/checkin/copyRegression.test.ts`
- `src/instruments/futurenow/checkin/session1.test.ts`
- `src/instruments/futurenow/checkin/session1.ts`
- `src/instruments/futurenow/checkin/session2.ts`
- `src/instruments/futurenow/checkin/session3.test.ts`
- `src/instruments/futurenow/checkin/session3.ts`
- `src/instruments/futurenow/checkin/session4.ts`
- `src/instruments/futurenow/checkin/session5.ts`

## 검증 출력 전문

`node scripts/verify.mjs`를 중첩 프로세스가 정상 동작하는 실행 환경에서 수행했다. 종료코드는 0이다. 아래는 사람이 집계를 옮겨 적지 않고 실행 로그 전문을 삽입한 것이다.

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
      Tests  1799 passed | 87 skipped (1886)
   Duration  7.44s (transform 7.24s, setup 0ms, import 16.66s, tests 4.54s, environment 20ms)

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

추가 관련 검사: `node_modules/.bin/vitest run src/instruments/futurenow/checkin 'src/app/coach/cohort/[cohortId]/checkin/preview/CheckinPreviewClient.test.tsx' --reporter=dot` → 17파일/402검사 통과. 실제 카드 서버 렌더에서 첫 방문·지난 실천·마감 안내·복귀 안내의 분기와 연결 링크를 확인했다. `git diff --check`도 통과했다.

## 검증 범위

기존 DB 및 캡처 관련 옵트인 검사는 보고된 조건대로 스킵되었다. 운영 참여자 데이터에는 쓰기를 수행하지 않았다. Chromium 설치 파일을 받지 못해 브라우저 클릭·화면 캡처를 통과했다고 보고하지 않는다. 변경은 문자열에 한정되며 관련 카드 렌더 및 링크 단언은 실행했다.

## 배포 확인 방법

이 후속 PR의 병합 커밋에 붙는 Vercel 상태가 success인지 확인한 뒤 완료로 판정한다. 교재·작성 지침의 원본 문서 수정은 별도 변경 결과로 보고한다.
