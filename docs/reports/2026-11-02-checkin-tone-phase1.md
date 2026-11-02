# 6회차 갈무리 문안 정비 — 1차 반영

검증일: 2026-11-02 (한국 시각)

## 승인과 범위

사용자가 승인한 비교표에 따라 6회차를 먼저 수정하고 배포한다. 1~5회차와 공통 화면은 다음 단계에서 반영한다.

- 6회차의 표시 문구 12개를 구체적인 경험·이유·행동·실행 조건을 기록하도록 교체했다.
- 응답 키, 필수/선택 구성, 선택지, 이전 답변 연결, 과거 기록 열람, 비공개·익명 권한은 변경하지 않았다.
- 문안 원칙과 architecture ADR-201을 함께 갱신했다.
- 문구 기준선은 `node scripts/regenCopyBaseline.mjs --write`로 재생성했다. 1~5회차 변화는 0이고 6회차만 12개 교체됐다.
- 기존 순수 QA 안전관문 테스트가 `.env.local` 없이 실행되지 않아 해당 파일 읽기만 테스트에서 격리했다. 운영 스크립트나 환경파일, DB는 변경하지 않았다.

## 변경 파일

- `architecture.md`
- `futurenow_copy_principles.md`
- `src/app/coach/cohort/[cohortId]/checkin/preview/CheckinPreviewClient.test.tsx`
- `src/instruments/futurenow/checkin/copyBaseline.json`
- `src/instruments/futurenow/checkin/session6.test.ts`
- `src/instruments/futurenow/checkin/session6.ts`
- `tests/qaCohortSunset.test.ts`

## 검증

기본 실행 환경에서 `scripts/verify.mjs`의 중첩 JavaScript 프로세스가 빈 출력을 반환했다. 이 결과를 통과로 세지 않고 같은 검사를 직접 실행해 종료코드와 출력을 확인했다.

- `node_modules/.bin/tsc --noEmit`: 종료코드 0.
- `node_modules/.bin/eslint .`: 종료코드 0. 오류 0, 기존 경고 3개.
- `node_modules/.bin/vitest run --reporter=dot`: 종료코드 0. 아래는 실제 출력에서 추출한 집계다.
- `node_modules/.bin/next build`: 정상 실행 환경에서 종료코드 0. 아래 빌드 출력 참조.
- `node_modules/.bin/vitest run src/instruments/futurenow/checkin 'src/app/coach/cohort/[cohortId]/checkin/preview/CheckinPreviewClient.test.tsx' --reporter=dot`: 17파일/400검사 통과. 실제 카드 렌더에서 새 문구와 옛 안내의 부재를 검사했다.
- `git diff --check`: 종료코드 0.

```text
 Test Files  157 passed | 7 skipped (164)
      Tests  1797 passed | 87 skipped (1884)
   Start at  09:34:21
   Duration  7.14s (transform 6.96s, setup 0ms, import 15.89s, tests 4.52s, environment 18ms)
```

7개 스킵 파일/87개 스킵 검사는 실제 DB·계정 또는 캡처 산출 조건을 필요로 하는 기존 옵트인 검사다. 이번 문안 변경을 검증하기 위해 운영 참여자의 응답을 쓰거나 수정하지 않았다.

실제 Chromium 브라우저 실행은 설치 파일 다운로드가 유효한 ZIP으로 반환되지 않아 실행하지 못했다. 서버 렌더 검사와 빌드 통과를 브라우저 클릭 검증으로 표현하지 않는다.

### ESLint 출력

```text
/workspace/scratch/56da2a711da1/futurenow-platform/src/app/(member)/my/cohorts/[cohortId]/dashboard.tsx
  78:3  warning  Unused eslint-disable directive (no problems were reported from 'react-hooks/purity')

/workspace/scratch/56da2a711da1/futurenow-platform/src/app/not-found.tsx
  23:8  warning  Unused eslint-disable directive (no problems were reported from '@next/next/no-html-link-for-pages')

/workspace/scratch/56da2a711da1/futurenow-platform/src/contracts/instrument.ts
  14:48  warning  'P' is defined but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (0 errors, 3 warnings)
  0 errors and 2 warnings potentially fixable with the `--fix` option.
```

### 운영 빌드 출력

```text
Attention: Next.js now collects completely anonymous telemetry regarding usage.
This information is used to shape Next.js' roadmap and prioritize features.
You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
https://nextjs.org/telemetry

▲ Next.js 16.2.9 (Turbopack)

  Creating an optimized production build ...
✓ Compiled successfully in 4.8s
  Running TypeScript ...
  Finished TypeScript in 8.2s ...
  Collecting page data using 8 workers ...
  Generating static pages using 8 workers (0/6) ...
  Generating static pages using 8 workers (1/6) 
  Generating static pages using 8 workers (2/6) 
  Generating static pages using 8 workers (4/6) 
✓ Generating static pages using 8 workers (6/6) in 197ms
  Finalizing page optimization ...

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


ƒ Proxy (Middleware)

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

## 배포 확인 방법

배포 완료 여부는 이 변경을 병합한 커밋의 GitHub Vercel 상태와 운영 도메인에서 제공되는 자산으로 확인한다. 현재 보고서는 배포 전에 만든 검증 기록이며, 배포 결과는 후속 완료 보고에 기록한다.
