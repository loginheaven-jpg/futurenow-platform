# 저장소 동기화 · 문서 반영 — 완주 보고

> 발주(2026-10-01): 「새로운 PC의 대화창에서 개발을 진행해도 문제가 없도록 소스를 GitHub 와 동기화하고,
> 그간의 개발내역을 문서에 반영하라」 → 「보류 및 미결작업은 `plan.md` 에 반영하고, 개발이력문서 등
> 모든 문서를 GitHub 에 올려라」

## 0. 먼저 — **소스는 이미 동기화돼 있었다. 문제는 다른 데 있었다**

실측(2026-10-01): 작업 트리 변경 **0** · `main` 과 `origin/main` **같음**(앞선 커밋 0 · 뒤처진 커밋 0).
즉 「코드가 안 올라가 있다」는 아니었다.

**실제 구멍은 「클론만으로 설 수 있는가」였다.**

| 구멍 | 무엇이 문제였나 |
|---|---|
| `.env.example` 이 낡았다 | 실제로 쓰는 키 **열 하나 중 둘**만 적혀 있었다(QA 계정 여섯 · `SUPABASE_DB_URL` · `SUPABASE_SERVICE_ROLE_KEY` 누락). 새 PC 는 무엇을 받아야 하는지 알 길이 없었다 |
| `README.md` 가 create-next-app 기본 문서였다 | 「어느 문서를 먼저 읽는가 · 무슨 명령으로 검증하는가 · 무엇을 절대 하지 않는가」가 저장소 어디에도 **입구 형태로** 없었다. `CLAUDE.md`·`architecture.md` 에 흩어져 있었다 |
| 시한 알람이 빨간 채였다 | `tests/qaCohortSunset.test.ts` 가 **일부러** 울고 있었다(§3) — 새 클론에서 테스트가 하나 실패한 채 시작된다 |

### ★ 재다가 **더 큰 것**이 나왔다 — `.env.example` 은 저장소에 없었다

`.gitignore` 의 `.env*` 가 **예시 파일까지 막고 있었다.** 실측: `git ls-files .env.example` → **0** ·
`origin/main` 에도 **0**. 즉 README 가 가리키는 파일이 **클론에는 존재하지 않았다** —
낡은 것이 아니라 **아예 없었다.** 아무도 몰랐던 이유는 간단하다: 로컬에는 파일이 있었고, 잠금이 없었다.

→ `!.env.example` negation 으로 **그 한 파일만** 열고(값이 든 `.env.local` 은 그대로 막힌다),
   `tests/envExample.test.ts` 로 **셋을 잠갔다**: negation 이 살아 있는가 · 값이 섞이지 않았는가 ·
   **소스가 실제로 읽는 비밀·계정 키가 전부 적혀 있는가**(손목록이 아니라 읽는 구문에서 뽑아 대조).
   키 제거·값 기입 두 변이를 심어 **둘 다 우는 것**을 확인했다.

## 1. 「새 클론으로 실제로 선다」를 **재서 확인했다**

말로 「될 것이다」가 아니라 **임시 폴더에 새로 클론해서** 돌렸다(2026-10-01):

```
git clone https://github.com/loginheaven-jpg/futurenow-platform.git <임시폴더>
npm ci            → 성공
npm run build     → 성공(exit 0)
npx vitest run    → Test Files 1 failed | 154 passed | 7 skipped (162)
                    실패 하나 = qaCohortSunset 시한 알람(§3) — 코드 결함이 아니다
```

검증이 끝난 뒤 **임시 클론은 지웠다**(그 안에 `.env.local` 사본을 두었기 때문이다 — 지금 남은 것 0).

## 2. 고친 문서

| 파일 | 무엇 |
|---|---|
| `.env.example` | **실측 기반으로 다시 썼다.** 키마다 「무엇에 쓰는가」와 ⑴ 앱 구동용 둘 / ⑵ 검증 도구용 여덟을 갈랐다. 재는 법(`grep -rl "<키>" src scripts tests …`)도 적었다. **저장소가 읽지 않는 키 넷**도 그 사실과 함께 적었다 — 없어도 아무것도 안 깨진다는 것을 모르면 다음 사람이 찾아 헤맨다 |
| `README.md` | **입구로 다시 썼다**: ⑴ 읽을 순서(규율 → 사양 → 보류 → 디자인 → 문안) ⑵ 새 PC 네 줄 ⑶ 명령 표 ⑷ 바꿀 때의 순서 요지 ⑸ 절대 하지 않는 것 ⑹ 열려 있는 것의 포인터. **규칙 본문을 복사하지 않고 가리킨다**(불변식 23) |
| `plan.md` | **§2-A 신설** — 최근 라운드가 남긴 **후속 여섯 · 판단 대기 여덟**을 근거 보고서와 함께 표로 모았다(§4) |
| `docs/reports/CC_REPORT_workbook_photos.md` | **§8 덧붙임** — 배포 2주 뒤 운영 실측(§5) |
| `tests/qaCohortSunset.test.ts` | 시한을 옮기고 **사유를 파일에 남겼다**(§3) |
| `.gitignore` · `tests/envExample.test.ts` | 예시 파일 한 장만 열고 **잠갔다**(위 ★) |

## 3. 빨간 시한 알람 — **재고 답했다**

`qaCohortSunset` 은 「QA 기수가 실기수 옆에 남는 것」을 막으려고 **날짜가 지나면 스스로 우는** 장치다.
오늘(10/01)이 기한(09/19)을 지나 울고 있었다. 알람이 요구하는 순서대로 했다:

1. **실제로 쟀다** — `node scripts/qaCohort.mjs status` → **QA 기수 0개 · 가상 회원 0명.**
   이 알람이 막으려던 일(도구가 세운 `QAAAA`·`QABBB` 가 남는 것)은 **일어나지 않았다.**
2. **남아 있는 `[QA] 검증 전용` 한 기수는 이 도구가 세운 것이 아니다** — 상주 검증 자산이고
   **지휘부가 그대로 두라고 지시했다.** 실브라우저 검증이 실기수를 건드리지 않는 유일한 길이라,
   지금 걷으면 검증이 실기수로 내려간다.
3. **도구도 알람도 걷지 않고 기한만 옮겼다** → **2026-11-30**(2기 6회차 카드가 닫힌 뒤 다시 본다).
   **사유를 상수 주석과 커밋에 남겼다** — 미루는 일이 눈에 보이는 것이 이 잠금의 목적이기 때문이다.
4. **물려 봤다** — 새 기한에서는 통과하고, 지난 날짜로 되돌리면 다시 운다.

> **추인 청구**: 기한을 11/30 으로 옮긴 것과 그 사유가 지휘부 뜻과 같은지 확인해 주시기 바란다.
> 「지금 치운다」가 뜻이면 상주 QA 기수 처리와 **검증을 어디서 돌릴지**를 함께 정해야 한다.


## 4. `plan.md` §2-A — 보류·미결을 한자리에 모았다

**목록을 새로 만들지 않고 보고서에서 끌어왔다.** 각 줄에 근거 보고서를 달았다 — 표는 색인이고 전문은 보고서다.

- **후속 여섯**(할 일이 정해져 있고 시점만 남은 것): 해제 사진의 주기 정리 · 형식 동의 기록(`photo_archive`) ·
  마무리 체크 자동 알림 · 6회차 옛 키 폴백 철거 · 실DB 데이터에 기댄 통합 단언 하나 · QA 기수 일몰 다음 점검
- **판단 대기 여덟**(사람이 정해야 넘어가는 것): 실기기 카메라 확인 · '워크북' 예외를 문안 규범에 적을지 ·
  1기 6회차 일정 불일치 · 제출 하강의 표적 · v3 §9 소급 여부 · QA 운영자 승인·비밀번호·삭제 ·
  마무리 체크 wave 자막 실브라우저 확인 · 부품 수 세는 규칙 둘

## 5. 운영 실측 — 워크북 사진은 **쓰이고 있다** (2026-10-01 · 개수만)

| 무엇 | 값 |
|---|---|
| 2기 1회차 워크북 사진 | **6장 · 세 사람**(처음 09-23) |
| 1기 편지 사진(옛 자리) | 1회차 1장 · 2회차 1장 — 회차당 한 사람 |
| 미리보기 생성 | 6 — 새 원본 **전부** |
| 「인도자 열람」 해제 | **0** |

접힌 심화 블록 안이던 때는 회차당 한 사람이었고, 맨 위로 올린 뒤 한 회차에 세 사람이 올렸다.
실기기에서 올라가고 미리보기도 전부 생성됐다 — 기기 확인 과제는 「막혀 있는가」가 아니라
**「카메라가 바로 열리는가」** 로 좁혀진다. 질의문은 보고서 §8 에 그대로 적어 두었다.

## 6. 검증 — `node scripts/verify.mjs` 출력 전문 (2026-10-01)

eslint 경고 셋은 이번 변경과 무관한 기존 것이다(`dashboard.tsx:77` · `not-found.tsx:23` · `contracts/instrument.ts:14`).

```

── tsc ──
오류 0

── eslint ──
77:3  warning  Unused eslint-disable directive (no problems were reported from 'react-hooks/purity')
  23:8  warning  Unused eslint-disable directive (no problems were reported from '@next/next/no-html-link-for-pages')
✖ 3 problems (0 errors, 3 warnings)
  0 errors and 2 warnings potentially fixable with the `--fix` option.

── vitest ──
Test Files  156 passed | 7 skipped (163)
      Tests  1778 passed | 87 skipped (1865)
   Duration  7.87s (transform 14.76s, setup 0ms, import 41.64s, tests 9.47s, environment 29ms)

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

직전 보고(`CC_REPORT_workbook_photos.md`) 대비 **파일 +1 · 테스트 +4** — 전부 `tests/envExample.test.ts` 다
(162 → 163 · 1861 → 1865). 그 밖에는 문서와 시한 상수만 고쳤다. `qaCohortSunset` 은 같은 다섯 건이
그대로 돌되 하나가 **레드 → 그린**으로 바뀌었다.

## 7. 문서 정합

- `architecture.md` **델타 0** — 사양 변화가 없다. 이번 라운드는 **입구 문서·환경 예시·보류 목록**이고,
  구현 결정은 ADR-197 까지 이미 반영돼 있다(ADR 표 마지막 행으로 확인).
- `design_system.md` **델타 0** — UI 변경 0.
- `plan.md` · `README.md` · `.env.example` · 보고서 둘을 고쳤다(§2).

## 7-A. 커밋

| 커밋 | 내용 |
|---|---|
| `479fe0a` · `cb557a4` | docs — README·`.env.example`·`plan.md` §2-A·보고 §8·일몰 기한 |
| `4fbfd62` · `09c2067` | fix — `.env.example` 을 `.gitignore` 에서 열고 잠금 추가 |
| (이 보고) | docs — 이 문서 |

## 8. 계약 이탈

**0** — `/contracts` 를 건드리지 않았다.

## 9. 막힌 지점 · 판단 필요

1. **QA 기수 일몰 기한 이동(11/30)의 추인**(§3).
2. `plan.md` §2-A 의 **판단 대기 여덟** — 그 표가 곧 청구서다.
3. **새 PC 에서 `.env.local` 값 전달 경로** — 저장소에는 키 이름만 있다. 값은 지휘부가 별도 경로로 준다
   (`docs/reports/README.md` 의 QA 계정 규율과 같은 방식).

## 10. 커밋 · push

```
09c2067c274c9510d657b7412ad5c78f7f5d1dda	refs/heads/main
```
