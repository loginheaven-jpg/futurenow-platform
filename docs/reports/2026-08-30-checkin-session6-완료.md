# 6회차 갈무리 구현 — ADR-115~117 · 정정 메모 반영

**근거**: `CC_ORDER_checkin_session6.md`(발주서) + `CC_MEMO_session6_corrections.md`(**부분 정정 · 충돌 시 메모가 이긴다**).
첨부된 5회차 리뷰 HTML 은 **구버전이라 정본으로 쓰지 않았다** — ADR-94 §12 가 못 박은 그대로다.

---

## 1. 착수 전 — 메모의 주장 셋을 값으로 확인했다

메모가 「소스로 전량 검증했다」고 했으나 **그 말을 근거로 쓰지 않고 다시 쟀다.**

| 주장 | 잰 값 |
|---|---|
| ① `notice2` 가 1~5회차 전수에 있다 | **있다 · 다섯이 바이트 동일**(「적으신 내용은 인도자와 운영자가 읽습니다.」) |
| ② 열람 범위는 「인도자와 운영자」다 | **맞다** — `StartGuide`·`ResponseRunner`·`LetterPhotos`·모집 문안이 모두 그 형태 |
| ③ `MirrorLine` 에 골드 세로선이 없다 | **없다** — 테두리·배경·세로선이 하나도 없고 **주석이 그 이유(입력칸 오해 방지)까지 적어 두었다** |

**셋 다 메모가 옳았다.**

---

## 2. 갈래 B — 구조 (ADR-115·116)

| 무엇 | 어떻게 |
|---|---|
| `MirrorSet` 타입 | `Mirror` 는 **건드리지 않고** 새 타입을 얹었다. `BlockBase.mirrors` · `selfNote.mirrors` |
| `neededBacks` | 새 자리 둘을 더 훑는다 — **빠뜨리면 깊이를 안 불러 되비추기가 조용히 사라진다** |
| `resolveMirrorSet` | `resolveMirror` 를 **재사용**한다 — 앵커·trim·`empty` 규칙이 그대로 상속돼야 한다 |
| `MirrorsOf` 렌더 | **`surface-1` + hairline 상자**(메모 §3 ⓑ). 골드 세로선이 아니다 |
| `share.toggleLabel` | 선택으로. 렌더가 **있을 때만** `CheckRow` 를 그린다 |
| `save.notice2` | **타입만 선택으로. 6회차는 값을 유지한다**(메모 §1) |
| `step.companion` | 신설. `blocker` 다음 · `share` 앞 |
| `suggestion.help` | 렌더에 넘긴다(§2-5 결손) — `need` 는 건드리지 않았다(ADR-94) |

### ★ 타입을 선택으로 바꾸니 **세 곳이 드러났다**

`tsc` 가 `CheckinCardClient:544` · `readModel:161·168` 을 짚었다. **`toggleLabel` 이 없을 수 있다는 사실을
세 자리가 몰랐다.** 값이 있을 때만 그리도록 고쳤고 **1~5회차는 값이 있으므로 출력 변화 0** 이다.

### 상자 규칙 — 메모의 조건을 지켰다

`MirrorLine` 의 경고(**입력칸으로 오해 방지**)가 상자를 두르면 되살아난다. 그래서:
**상자 안 모든 줄은 caption + secondary 텍스트** · **입력 요소를 상자 안에 두지 않는다** ·
**줄이 하나뿐이면 상자를 두르지 않고 `MirrorLine` 그대로다**(1~5회차 출력 불변).

---

## 3. 갈래 A — 문안 (ADR-117)

발주서 §3 을 그대로 옮기되 **메모의 문항 교체 둘을 반영**했다.

| # | 발주서 | 적용된 것 |
|---|---|---|
| 문항 1 | 오늘 **마지막까지 남는다고** 적으신 한 줄 | **오늘 남은 시간을 헤아려 보고** 적으신 한 줄 |
| 문항 2 | **두 세계관을 나란히 놓고** 보았을 때, 무엇이 새로 보였습니까? | **만약 3일 후에 죽음 앞에 선다면, 가장 후회되는 한 가지는 무엇일까요?** |

문항 2에 **보조 문구를 붙이지 않았다** — 무거운 질문에 안심 문구를 달면
「이건 무거운 질문입니다」라고 알리는 꼴이 되어 오히려 방어를 부른다. **선택 표기는 그대로 둔다.**

---

## 4. ★ 발주서가 실물과 어긋난 자리 셋 — 실물을 따랐다

| # | 발주서 | 실물 | 처리 |
|---|---|---|---|
| ⑴ | `brand`·`title`·`counter` 가 최상위 · `page1` | 실제 타입은 **`cover` · `today`** 로 감싼다 | **정본을 따랐다** |
| ⑵ | `copyRegression` 의 `S` 배열 **두 곳**(:100·:163)에 추가 | 전수를 훑는 배열이 **여덟 곳** | 여덟 중 **여섯만** 넣었다(↓) |
| ⑶ | `registry.guard` 의 `FILES` 한 줄 | 맞다 | 그대로 |

### ⑵ 를 자세히 — **두 곳은 넣으면 안 됐다**

| 자리 | 무엇을 요구하나 | 6회차 |
|---|---|---|
| `:100` `S` | 「selfNote 가 값을 말한다」 · 「심화 제목이 격상됐다」 — **세 회차 공통 문장** | **selfNote 에 help 를 두지 않았고**(다섯 줄 되비추기가 그 일을 대신한다) **심화 제목도 다르다** |
| `:393` | 실행 자신감 보조문구가 특정 문장이다 | **90일 한 걸음이라 문구가 다르다** |

넣었다가 셋이 붉어졌고 **되돌리면서 사유를 주석에 적었다.**
**발주서가 「두 곳」이라 한 것이 자리 수로는 틀렸고 취지로는 맞았다** — 전수 배열과 공통 단언 배열을 갈라야 했다.

---

## 5. ★ 낡은 잠금 하나를 **지우지 않고 옮겼다**

`journey.test.ts` 의 **「미등록 회차(6·7)는 라벨이 없다」** 가 6회차 등록으로 붉어졌다.
그 안에 `expect(getCheckinSession(6)).toBeNull(); // 가드가 헛돌지 않았음` 이 있었다 —
**잠금이 스스로 「물 것이 있는가」를 확인하고 있었고, 그것이 옳게 울린 것이다.**

**규칙 자체는 유효하므로 대상을 7로 옮기고**, 반대편 단언을 하나 **더했다**:
「등록된 6회차는 라벨이 선다」. **「없다」만 잠그면 등록해도 라벨이 안 서는 결함을 못 본다.**

---

## 6. 잠금과 물림

`session6.test.ts` **19건** 신설. **메모의 정정 여섯을 되돌리는 변이**를 심어 봤다:

| 변이 | 심어졌나 | 결과 |
|---|---|---|
| `notice2` 를 지운다(발주서 원안) | 0곳 | **레드** |
| `share.notice` 를 「인도자와 나만」으로 | 2 | **레드** |
| 문항 1 을 원안으로 | 3 | **레드** |
| 문항 2 를 원안으로 | 2 | **레드** |
| 문항 2 에 보조 문구를 단다 | 1 | **레드** |
| 공개 토글을 되살린다 | 2 | **레드** |
| 원복 | — | **초록 19/19** |

**되비추기도 실물로 물렸다** — 값이 하나도 없으면 `null`(상자 자체를 안 그린다),
일부만 있으면 있는 것만 남는다(`['1회차','3회차']`).

**키가 지어낸 것이 아닌지도 본다**(계열 ⑦) — `identity_sentence`·`identity_statement`·`self_note` 가
실제로 앞 회차 문안에 있는지 단언한다.

### 타입이 이미 잠그는 자리 넷

`group`·`caption`·`toggleLabel`·`help` 를 **선언하지 않아 `satisfies` 가 좁혀 냈고**,
`c.today.mood.group` 같은 접근은 **`tsc` 가 먼저 운다.** 런타임 단언보다 강해서 `in` 검사로 바꿨다.

---

## 7. 수용 기준 — 채널 1·2

```
□ tsc 0 · eslint 4(기준선) · vitest 전건 통과 · build 성공     → 통과
□ session1~5.ts 변경 0                                        → 통과(git diff 0)
□ page.tsx 변경 0 · 마이그레이션 신설 0                        → 통과
□ getCheckinSession(6) 이 객체를 그대로(toBe) · (7) 은 null    → 통과
□ registry.guard 연속성 1~6                                    → 통과
□ copyBaseline 에 session6 · 1~5 항목 바이트 동일              → 통과(생성기 재생성 · 1~5 델타 0/0)
□ BANNED 어휘 0건                                              → 통과(copyRegression 이 잠근다)
```

**`copyBaseline` 은 손으로 만들지 않았다** — 생성기(`regenCopyBaseline.mjs`)에 `session6` 을 더해 재생성했고,
**1~5회차는 0/0 이고 session6 만 85 늘었음**을 먼저 확인한 뒤 썼다.

## 8. 배포와 채널 3 — **닫혔다**(릴레이 판단으로 진행 · 2026-08-30)

### ★ 배포 판정이 기수를 요구했다

먼저 `/my/cohorts`·`/home` 청크에서 6회차 문안을 찾았으나 **0/4** 였다(20회 시도).
**갈무리 문안은 갈무리 화면을 열어야 그 청크가 온다** — 자가 대상을 못 잡았다(계열 ⑨-a).
그래서 **배포 판정과 채널 3 을 한 자리에서** 했다. QA 기수는 최박사께서 이미 승인하셨다.

### 열어서 본 것 — 전항 통과

| 잰 것 | 값 |
|---|---|
| **배포 · 6회차 표지** | **O 나갔다**(「끝에서부터 오늘을 다시 보다」) |
| 묶음 캡션 둘 | **O** 남는 것을 가리고 · 한 층을 얹다 |
| 문항 1(활동 지목) · 문항 2(메멘토모리) | **O · O** |
| 90일 한 걸음 · 함께 볼 사람 | **O · O** |
| **★ 공개 토글이 없다** | **O 없다** |
| **★ 열람 고지는 있다** | **O**(「인도자와 운영자가 봅니다」) |
| **★ 저장 바 `notice2`** | **O 있다** — 1~5회차와 같은 문장 |
| **★ 기한 없음** | **O**(「다음 시간 24시간 전까지」가 없다) |
| 인도자 상자 펼침 | **O 펼쳐져 있다** |
| 심화 제목 | **O**(「여섯 주가 닿는 자리」) |

### ★ 되비추기를 **물려 봤다** — 「없어서 안 뜬다」는 아무것도 증명하지 않는다

값이 0일 때 상자가 안 그려지는 것만 보고 넘어갈 뻔했다. **씨앗을 심고 다시 열었다**:

| 잰 것 | 값 |
|---|---|
| 정체성 위 — 1회차 존재가치 선언문 | **O 뜬다** |
| 정체성 위 — 2회차 인생의 한 문장 | **O 뜬다** |
| 캡션 둘(항목마다 다름) | **O 둘 다** |
| 마지막 한마디 위 상자 | **O 뜬다**(「지금까지 나에게 준 말들」) |
| 한마디 줄 수(심은 것 셋) | **3개** |
| **없는 회차(4·5)는 줄이 빠진다** | **O 빠진다** — 결손 목록이 되지 않는다 |

### ★ 문안 ①의 「못 잼」이 닫혔다

앞선 문안 회차에서 **QA 기수를 내려 열 화면이 없어** 못 쟀던 것이다.
4회차를 열어 확인했다 — **「인생의 원씽 · 세 원이 겹치는 자리」가 화면에 가운뎃점으로 떠 있다.**
**문안 회차의 마지막 미결이 없어졌다.**

### 1~5회차가 그대로다 — 참여자가 지금 보는 것

| 회차 | 값 |
|---|---|
| 1 · 2 · 3 · 5 | **전부 정상**(1180 · 1530 · 1400 · 1320자 · `notice2` 있음) |

### 뒤처리 — 흔적 0

**이번에 만든** QA 기수 **0** · 가상 회원 **0** · 그 기수의 회차 일정 **0** · 그 기수의 갈무리 **0** ·
서가 **0** · ZR4KB **8** · HMT7Z **9** · memberships **held:1 individual:7**(시작 전과 같다).

### ★ 「QA 기수 0」이 무엇을 센 값인가 — 문구를 바로잡는다

앞서 **「QA 기수 0」**이라 적었으나 그 조회 조건은 **`code like 'QA%'`** 였다.
즉 **이번에 세운 `QAAAA`·`QABBB` 만 센 값**이고, 그 문장은 **「저장소에 QA 기수가 하나도 없다」로 읽힌다.**
**「이번에 만든 QA 기수 0」이 맞는 표현이다.**

### 저장소에 서 있는 기수 여섯 — **손대지 않았다**

| 코드 | 만든 날 | 등록 | 이름 | 판정 |
|---|---|---|---|---|
| QKN2H | 2026-06-29 | 2 | test | 오늘 것이 아니다 |
| JOINF | 2026-07-02 | 4 | 체험 진단 | 〃 |
| **HMT7Z** | 2026-07-03 | 11 | 퓨처나우2026예봄1기 | **실기수 · 무접촉** |
| **ZR4KB** | 2026-07-27 | 10 | 퓨처나우2026예봄2기 | **실기수 · 무접촉** |
| TRASH | 2026-07-28 | 1 | 휴지통 | 오늘 것이 아니다 |
| **YYGYP** | **2026-08-27** | 1 | **[QA] 검증 전용** | **★ 상설이다. 오늘 것이 아니다** |

**★ YYGYP 는 「안 지운 찌꺼기」가 아니다.** 오늘 회차(`2026-08-30`)보다 **사흘 전**에 만들어졌고
등록자가 **최박사 본인 계정**이다. **상설 검증용이므로 그대로 둔다** — 다음 사람이 지우지 않게 여기 적어 둔다.

**QKN2H · JOINF · TRASH 도 오늘 것이 아니라 손대지 않았다.** 다만 **넷이 서 있다는 사실을 남긴다** —
2기 시작 전에 최박사께서 정리 여부를 판단하실 수 있다.

**못 잰 것 하나** — 발주서 §6 의 **TTFB 비교**는 재지 않았다. 되비추기 다섯 건의 비용을 보려면
1~5회차와 나란히 여러 번 재야 하는데, 그것은 이 회차의 남은 시간에 맞지 않는다.
**「안 쟀다」로 남긴다** — 화면이 정상 응답 시간 안에 떴다는 것만 사실이다.

## 9. 미결 셋(발주서 §8) — `session6.ts` 머리에 적어 두었다

`save.notice1` 의 기한 · `step_companion` 90일 리마인드 · 책 페이지 쇄 확인.

---

## 검증

```

── tsc ──
오류 0

── eslint ──
23:8  warning  Unused eslint-disable directive (no problems were reported from '@next/next/no-html-link-for-pages')
✖ 3 problems (0 errors, 3 warnings)
  0 errors and 1 warning potentially fixable with the `--fix` option.

── vitest ──
Test Files  129 passed | 5 skipped (134)
      Tests  1442 passed | 73 skipped (1515)
   Duration  6.44s (transform 13.25s, setup 0ms, import 34.31s, tests 6.54s, environment 24ms)

  스킵 사유 — 전부 **의도된 옵트인**이다:
    tests/membership.integration.test.ts         실DB 옵트인 — RUN_RLS_INTEGRATION=1 일 때만 돈다
    tests/feed.integration.test.ts               실DB 옵트인 — 같은 스위치
    tests/rls.integration.test.ts                실DB 옵트인 — 같은 스위치
    tests/defaultPrivileges.integration.test.ts  실DB 옵트인 — 같은 스위치(pg_default_acl 실측)
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
