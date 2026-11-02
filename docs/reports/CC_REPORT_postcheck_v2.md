# CC_REPORT postcheck_v2 — 재검토 및 단계별 구현·검증 보고

검토일: 2026-11-02(KST). 대상: 사용자가 첨부한 `CC_ORDER_postcheck_v2.md`.
착수 기준: 새 clone의 `git rev-parse HEAD` = `a7040fa4efb5f02f5d139d5262833c7a23763b0b`.
작업 브랜치: `feat/postcheck-v2`. 상태와 검증 결과는 각 슬라이스 절에 기록한다.

## 1. 재검토 판정

**보완수용. 발주 전체를 반려할 설계·권한 쟁점은 없다.** v1 의견서 R1~R11의 주요 사실과 제품 결정이 v2에 반영됐다. 아래 보완은 사용자의 “보완수용의 경우 자네 의견대로 진행” 승인에 따라 구현한다. 문구와 기능의 임의 확대, 회원 모델·계약·DB 스키마 변경은 하지 않는다.

### 1.1 수용하는 결정

| 항목 | 판정과 근거 |
|---|---|
| S1 추천의 말 | 사후 전용 선택 문항·500자·별도 옵트인·기존 응답 optional 호환을 수용한다. Zod는 앱 저장 경계 검사이며 SQL 제약으로 보고하지 않는다. 홍보 동의 선택은 갈무리 작성의 적극적 안내와 목적이 다르다. |
| S2 짝 규칙 | 같은 진단·회기·사람의 사전 중 대상 사후 작성 시각 이하 최신, 동률은 id 큰 쪽으로 확정한다. 네 사용처에서 동일 규칙을 쓴다. 사후보다 늦은 사전은 과거 사후의 짝을 바꾸지 않는다. |
| 사후 라벨·활력 표시 | E1~E3의 사후 의미, 사후 단독 활력 표시, E1 짝 패널을 수용한다. 미연결 react-pdf 경로는 제외한다. |
| S3 표본 | 그룹 전 블록을 현재 참여자로 한정한다. 비교는 같은 사람의 대응 표본이며, 0쌍의 기존 GroupView는 명시적으로 승인된 예외다. 3명 미만은 인도자 열람·인쇄를 유지하되 함께 띄우지 말라는 안내를 표시한다. |
| 추천 글 선정 | 최신 대표 사후를 먼저 정하고 그 응답의 동의만 평가한다. 과거 동의 글을 되살리지 않는다. 카드·복사·인쇄는 같은 동의 목록만 사용한다. 본문 검토·철회는 운영 기준이며 자동 철회 기능이 추가됐다고 보고하지 않는다. |
| S4 AI 비교 | 간격 원점수의 방향 명시, 현재 돌봄 신호 기준, 비교 요청에만 추가되는 프롬프트를 수용한다. 저장된 사전 해석은 재생성하지 않는다. |
| 기존 사후 AI 교체 | 삭제 대신 후보 생성·파싱 후 조건부 UPDATE, 코치 수정본 제외, 캐시 비사용을 수용한다. QA 선행 조건이 충족되기 전 운영 대상은 변경하지 않는다. |
| S5 개시·마감 | 개시는 진입 안내 상태이며 별도 저장 접근 통제가 아니라는 결정을 수용한다. 회원 자격을 만들거나 변경하지 않는다. 마감 뒤 기존 참여자의 입력 경로를 유지한다. |
| 검증·배포 | 슬라이스별 작업·병합·운영 커밋을 구별한다. verify 요약과 직접 명령의 실제 종료 코드를 함께 기록하며 실DB 검사의 건너뜀을 성공으로 세지 않는다. |

### 1.2 보완수용 — 실제 적용할 사항

| 번호 | 위치·근거 | 보완과 판정 |
|---|---|---|
| B1 | S3-1/2; 기준 `group/page.tsx`의 `rowsFor`가 조회 즉시 `latestPerUser` 호출 | 전체 pre 이력을 보존한 뒤 비교용 짝을 고른다. `pre A → post B → pre C`에서 B의 짝 A가 사라지지 않아야 한다. 최신 pre는 블록 0~4와 0쌍 폴백용으로 따로 파생한다. |
| B2 | 같은 페이지의 `listCohortMembers(...).catch(() => [])` | 명단이 전 블록의 허용 표본이 되므로 조회 실패를 정상 0명으로 바꾸지 않는다. 오류는 오류 경로로 전달한다. |
| B3 | S2-1과 S3-2의 파일 배치 | 봉투 짝짓기는 앱 helper/페이지에서 수행하고, 이름 조인·채점 후 그룹 모델에 전달한다. 인스트루먼트가 앱을 import하거나 모델이 재채점하지 않는다. 선택 규칙의 단일 출처는 유지한다. |
| B4 | S3-3·A18; 기준 블록 5의 비식별 일반 설명 | 실제 표시 표본이 1~2명일 때 A18을 표시하고 인쇄에도 남긴다. 0명은 평균이 없으므로 A18을 표시하지 않는다. 소수 표본에서 “개인을 특정하지 않고”라는 일반 설명과 A18을 함께 표시하지 않는다. |
| B5 | S4-4/5; `InterpretationPanel.tsx`의 `prev.ai` 복귀 | 운영 교체 후 열린 패널이 이전 AI를 기억할 수 있다. clear 액션은 최신 서버 VM을 다시 읽어 반환하고 패널은 그 결과를 표시한다. `router.refresh()`만으로 해결됐다고 보지 않는다. 계약 변경은 필요 없다. |
| B6 | S4-5 적용·복구 절차 | 고정 대상·짝 pre·이전 값·후보·실행 상태를 비공개 명세로 관리한다. UPDATE는 response id와 이전 모델도 대조한다. 복구도 현재 값이 이번 후보와 같고 코치본이 없을 때만 한다. 성공 행은 재생성하지 않는다. |
| B7 | S4-5 “짝이 없으면 같은 단독 해석” | 설명을 정정한다. 무짝 post도 새 A21·사후 E 라벨로 입력이 달라진다. 승인된 교체 범위는 넓히지 않고 무짝은 “비교 교체 제외·기존 단독 해석 유지”로 구분 보고한다. |
| B8 | S4-5 “ADR에 백업 위치”와 §7 “지휘부에만” | 공개 ADR·보고서에는 보관 사실과 비공개 식별자만 기록한다. 실제 백업 위치와 원문은 공개하지 않는다. |
| B9 | §0.3 회차 창 설명 | “창은 화면이 지킨다”를 좁힌다. 화면은 개방 전 진입을 제한하지만 마감 후 작성을 계속 허용한다. RPC의 창 미검사는 관찰로 남기며 기존 동작을 바꾸지 않는다. |
| B10 | S6·IA §4.4 | “cohort_sessions 게이팅과 같은 방식”을 결정 5에 맞춰 정정한다. 개시는 참여자 화면의 진입 안내 상태이며 직접 주소 진입·저장의 조건이 아님을 적는다. |
| B11 | S1부터 ADR 참조, S6의 후보 번호 | 슬라이스별 문서 정합과 연속 번호 잠금을 지키기 위해 실제 구현 순서대로 등록한다. S1=203, S2=204, S3=205, S4=206, S5=207. S6에서 최종 정합을 확인한다. |
| B12 | A16 둘째 줄; `member_state`의 `kind='seminar'` 및 보류 상태 우선순위 | “다른 진행 중 회기”를 “다른 진행 중 세미나 회기”로, “새로 쓸 수 없게 됩니다”를 “새 이용이 제한됩니다”로 정밀화한다. 이미 제한된 회원에게 새로운 변화가 생긴다고 단정하지 않는다. 사용자 승인 범위의 보완 문안이며 회원 판정은 변경하지 않는다. |
| B13 | S4 구현 중 대조한 `architecture.md` §9.3 규칙 5 | 기존 “바늘 이동 = 세미나 효과 헤드라인”은 A17의 인과 일반화 금지와 어긋난다. “두 시점의 자기보고 변화이며 세미나 효과의 인과적 증거로 일반화하지 않는다”로 문서 설명을 정정한다. 채점 수식·점수 방향은 바꾸지 않는다. |
| B14 | S4 합성 게이트웨이 검증, 2026-11-02 14:11:28 KST | A17 원문만 적용한 실제 출력에서 근거 없는 긍정적 원인 추정이 관찰됐다. 참여자의 일반적인 방향·행동 진술을 점수 하락의 원인으로 확대했다. A17과 기본 시스템 프롬프트는 그대로 두고, 짝이 있는 사후의 사용자 입력 마지막에 가능성 표현으로도 이유를 지어내지 말며 headline·axes·growth 모두에 적용한다는 지시를 재강조한다. 실제 출력 재검사 결과는 §5에 기록한다. |

**A16 둘째 줄의 최종 문안**

> · 포럼회원이 아니고 다른 진행 중 세미나 회기도 없는 참여자는 바깥 도구의 새 이용이 제한됩니다. 본인 기록 열람은 그대로입니다. 마감이 포럼회원 자격을 만들지는 않습니다.

다른 A1~A21 승인 문구는 유지한다. A18에 따른 소수 표본 일반 설명의 분기 외에 새 참여자 안내 문구를 임의로 추가하지 않는다.

### 1.3 캐시 사실 확인의 범위

원격 `loginheaven-jpg/ai-gateway`의 확인 SHA는 `7ea61d51ecfdcf7f8e1eaa7d94a36739ed21c22e`다. [cache.py](https://github.com/loginheaven-jpg/ai-gateway/blob/7ea61d51ecfdcf7f8e1eaa7d94a36739ed21c22e/app/cache.py)와 [ai.py](https://github.com/loginheaven-jpg/ai-gateway/blob/7ea61d51ecfdcf7f8e1eaa7d94a36739ed21c22e/app/routers/ai.py)를 대조했다. 메모리·기본 TTL 3600초·요청 입력을 포함한 SHA-256 키, `use_cache=false`일 때 조회·저장 생략이라는 설명은 소스와 일치한다. 제공자 범위에는 모델·reasoning·fallback 모델도 들어간다. 이는 저장소 구현 확인이며 실제 Railway 운영 SHA까지 확인한 증거는 아니다. 후보 생성의 운영 검증은 S4 절에서 별도로 보고한다.

### 1.4 착수 시 실측과 검증 환경

2026-11-02 12:57:29 KST의 SQL 읽기에서 현재 일반 참여자는 1기 9명, 2기 8명이다. 상주 `[QA] 검증 전용` 회기는 active이며 사후가 이미 개시돼 있다. 2026-11-02 12:58:54 KST의 사후 응답 조회는 3건이다. 이는 해당 조회 시점의 값이며 이후 슬라이스에서 필요한 값은 다시 측정한다.

현재 작업 환경에는 QA 로그인 자격과 `SUPABASE_DB_URL`이 설정돼 있지 않다. Supabase 연결 도구의 SQL 조회는 가능하다. 원래 Vitest 실DB 파일의 실행과 별도 SQL 검사는 구분한다. 원본 테스트를 실행하지 않고 성공했다고 보고하지 않는다. 실브라우저는 지정 QA 계정으로 인증된 경우에만 보호 화면 검증을 진행한다. 실기수 보호 화면은 열지 않는다.

## 2. S1 — 마무리 체크 입력

### 2.1 변경 범위

`copy.ts`, `flow.ts`, `schema.ts`, `flow.test.ts`, `schema.test.ts`, `src/app/_vocab/tool.test.ts`, `architecture.md`를 변경했다. A1과 A2~A6을 그대로 반영했다. 사전 7블록·기존 채점·경보·AI 구현은 유지한다. 계약·마이그레이션 변경은 0건이다. ADR-203과 §9.1·§9.2를 함께 정합화했다.

### 2.2 바뀐 기존 잠금

| 위치(이 슬라이스 기준) | 전 | 후 |
|---|---|---|
| `flow.test.ts` 기존 72행 → 79행 | 사후에만 있는 부가 키 `[]` | `['REC', 'REC_OK']` |
| `src/app/_vocab/tool.test.ts:56` | 기존 문안 객체만 금칙어 검사 | `nextBlock`까지 검사 범위 확대 |

사전 7블록, 기존 31코드 동일, 사전 전용 `PLEDGE`, 사후 commit `['COMMIT']` 단언은 유지했다. 새 단언은 사후 8블록, 블록 위치, A1~A6 정확 문구, 두 항목 선택, 새 키 미존재/빈 글/500자 허용·501자 거부·동의값의 boolean 타입·E1~E3 길이 규칙 보존이다.

### 2.3 기존 사후 호환 실측

조회: `select now(), id, answers from public.responses where instrument_id='futurenow' and wave='post' order by created_at,id`.
2026-11-02 12:58:54 KST에 읽은 **3건 중 3건**이 실제 수정된 `futurenowAnswersSchema.safeParse`를 통과했다. 실패 0건. 원문은 저장소와 보고서에 넣지 않았다. 검사 스키마 SHA-256: `dc6d7316df4053d6e8989c421bb5f91c8d06bc1bff8d21f2536eb51097e9179c`.

### 2.4 검증·배포

작업 커밋 `9cbc35c666a3c8daf13317d493a0e0e53aac5013`에서 아래 명령을 직접 실행했다. 실행 중 HEAD가 바뀌지 않았고 작업 트리는 깨끗했다. 전체 테스트는 **1811 통과 / 87 스킵 / 총 1898**, 파일은 **157 통과 / 7 스킵 / 총 164**다. 린트는 기존 경고 3개, 오류 0이다.

| 명령 | 실제 종료 코드 | 종료 시각(KST) |
|---|---:|---|
| `npx tsc --noEmit` | 0 | 2026-11-02T13:43:08.529107+09:00 |
| `npx eslint .` | 0 | 2026-11-02T13:43:11.873423+09:00 |
| `npx vitest run` | 0 | 2026-11-02T13:43:05.261069+09:00 |
| `npx next build` | 0 | 2026-11-02T13:43:28.392102+09:00 |
| `node scripts/verify.mjs` | 0 | 2026-11-02T13:44:13.102066+09:00 |

- 작업 커밋: `9cbc35c666a3c8daf13317d493a0e0e53aac5013` · [PR #3](https://github.com/loginheaven-jpg/futurenow-platform/pull/3).
- 병합 커밋: `5d6ab2b7feb1d3b87f273a468225a19ad8e30116`.
- 운영 확인: `GET https://future.yebom.org/api/version`에서 `env=production`, `ref=main`, `commit=5d6ab2b7feb1d3b87f273a468225a19ad8e30116`, `deploymentId=dpl_8ncxQTCYrvobsjS5wgamCW6EHt93`. build 시각 `2026-11-02T04:45:00.649Z`.
- 원격 증거: `git ls-remote origin refs/heads/main refs/heads/feat/postcheck-v2`.

```text
9cbc35c666a3c8daf13317d493a0e0e53aac5013	refs/heads/feat/postcheck-v2
5d6ab2b7feb1d3b87f273a468225a19ad8e30116	refs/heads/main
```

<details>
<summary>S1 verify.mjs 출력 전문</summary>

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
      Tests  1811 passed | 87 skipped (1898)
   Duration  6.82s (transform 7.03s, setup 0ms, import 15.56s, tests 4.49s, environment 19ms)

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

</details>

실DB Vitest 별도 실행과 QA 실브라우저 제출은 자격 연결 전까지 **미실행**이다. 기존 사후의 읽기·parse와 구분하며 제출 확인을 했다고 보고하지 않는다.

## 3. S2 — 짝 고르기와 개인 리포트

### 3.1 구현

S1 production `5d6ab2b` 반영을 확인한 뒤 착수했다. 공용 `pairedPre`는 같은 진단·회기·사람의 전체 pre 이력에서 사후 작성 시각 이하 최신 1건을 고르고, 일반 최신 선택과 같은 createdAt/id 기준을 쓴다. anonymous 응답을 같은 사람으로 합치지 않는 기존 동작은 보존한다. 조회 실패는 throw이며 정상적인 짝 없음만 null이다.

인도자·본인 리포트는 이 공통 함수를 사용한다. 사후가 확인된 뒤 짝 조회에 실패하면 해당 렌더에서만 단독으로 표시하고 원문 없는 서버 로그를 남긴다. 내 리포트의 최초 사후 조회와 사전 단독 조회는 기존 오류 전파를 유지한다. 비교 차트·표제·E1 패널·사후 E 라벨·사후 단독 활력 표시를 연결했다. 인도자 원응답에는 사후 추천 글과 동의 상태를 표시하며 미동의 글의 내부 열람은 유지한다.

### 3.2 잠금과 범위

기존 assertion의 기대값 삭제·완화·교체는 없다. 동률·늦은 사전 재제출·다른 진단/회기/사람/파동 배제·무짝·조회 실패 검사와 페이지 실행형 검사, 표시 부품 경계 검사를 추가한다. 인도자 페이지의 기존 재마운트 신원 잠금 3개도 유지한다. 새 원응답은 post만, `REC_OK === true`만 동의, 빈 추천 글은 절 전체 비표시로 검증한다.

`architecture.md` §9.5와 ADR-204를 동기화했다. React 부품은 props 기반이며 새 상태·효과·데이터 요청을 추가하지 않았다. 계약·DB 스키마·PDF 경로·AI 생성 코드는 변경하지 않는다.

### 3.3 검증·배포

작업 커밋 `3646e4a90ea2f730ed03482bab24eb1b6d0fedf4`에서 아래 명령을 직접 실행했다. 실행 중 HEAD는 동일했다. 전체 테스트는 **1872 통과 / 87 스킵 / 총 1959**, 파일은 **161 통과 / 7 스킵 / 총 168**이다. 린트 오류 0, 기존 경고 3개다.

| 명령 | 실제 종료 코드 | 종료 시각(KST) |
|---|---:|---|
| `npx tsc --noEmit` | 0 | 2026-11-02T13:53:25.309402+09:00 |
| `npx eslint .` | 0 | 2026-11-02T13:53:37.322253+09:00 |
| `npx vitest run` | 0 | 2026-11-02T13:53:31.566960+09:00 |
| `npx next build` | 0 | 2026-11-02T13:53:53.267466+09:00 |
| `node scripts/verify.mjs` | 0 | 2026-11-02T13:54:31.689453+09:00 |

- 작업 커밋: `3646e4a90ea2f730ed03482bab24eb1b6d0fedf4` · [PR #4](https://github.com/loginheaven-jpg/futurenow-platform/pull/4).
- 병합 커밋: `d1500868e1742fc0636a81c1ab405b6ea29658ce`.
- 운영 확인: `GET https://future.yebom.org/api/version`에서 `env=production`, `ref=main`, `commit=d1500868e1742fc0636a81c1ab405b6ea29658ce`, `deploymentId=dpl_FT6hHWPuEM7XLjWTD9yHQaYksfUn`. build 시각 `2026-11-02T04:55:29.542Z`.
- 원격 증거: `git ls-remote origin refs/heads/main refs/heads/feat/postcheck-v2`.

```text
3646e4a90ea2f730ed03482bab24eb1b6d0fedf4	refs/heads/feat/postcheck-v2
d1500868e1742fc0636a81c1ab405b6ea29658ce	refs/heads/main
```

<details>
<summary>S2 verify.mjs 출력 전문</summary>

```text
── tsc ──
오류 0

── eslint ──
78:3  warning  Unused eslint-disable directive (no problems were reported from 'react-hooks/purity')
  23:8  warning  Unused eslint-disable directive (no problems were reported from '@next/next/no-html-link-for-pages')
✖ 3 problems (0 errors, 3 warnings)
  0 errors and 2 warnings potentially fixable with the `--fix` option.

── vitest ──
Test Files  161 passed | 7 skipped (168)
      Tests  1872 passed | 87 skipped (1959)
   Duration  6.73s (transform 6.44s, setup 0ms, import 15.13s, tests 4.22s, environment 21ms)

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

</details>

실브라우저에서 로그인 페이지를 열자 기존 운영자 세션으로 홈에 진입했다. 지정 QA 계정이 아니므로 보호 리포트를 열지 않고 해당 검증 탭을 닫았다. QA 로그인·브라우저 인쇄 미리보기는 **미실행**이며 서버 렌더 검사로 대체했다고 보고하지 않는다.

## 4. S3 — 그룹 리포트와 추천의 말

### 4.1 구현

S2 production `d1500868` 반영을 확인한 뒤 착수했다. 현재 참여자 명단을 사전·사후 전체 이력에 먼저 적용한다. 최신 사전은 블록 0~4·0쌍 폴백에, 최신 사후와 그 시점의 사전 짝은 대응 평균에 쓴다. 명단 조회 실패를 빈 명단으로 바꾸지 않는다.

대응 평균은 산술 평균이며 차트에 필요한 수치만 가진 좁은 타입이다. 평균에 개인의 돌봄·함정·주관식·구간 판정을 섞지 않는다. 표시 표본 1~2명에는 A18을 화면·인쇄에 남기고 비식별 일반 설명은 함께 표시하지 않는다. 추천 글은 최신 사후의 동의 상태만 따르며 미동의 글의 본문은 추천 클라이언트로 전달하지 않는다. 복사 성공 표시는 Clipboard 쓰기가 성공한 뒤에만 바뀐다.

### 4.2 실기수 읽기 검산

2026-11-02 **13:58:59 KST**, 1기 `c449b22b-dd51-49a0-bd71-fb47e672f2b0`의 읽기 전용 SQL 결과다. 원문·이름은 조회 결과에 포함하지 않았다.

| 집계 | 값 |
|---|---:|
| 현재 일반 참여자 | 9 |
| 블록 0~4 최신 사전 표본 / 사전 완료 N | 9 |
| 전체 사전 이력 행 | 9 |
| 최신 대표 사후 | 3 |
| 대응 표본 n | 3 |
| 게재 동의 추천 글 | 0 |
| 미동의 비어 있지 않은 추천 글 k | 0 |

```sql
with current_people as (
  select e.user_id from public.enrollments e
  join public.users u on u.id=e.user_id and u.role='user'
  where e.cohort_id='c449b22b-dd51-49a0-bd71-fb47e672f2b0'
), pres as (
  select r.* from public.responses r join current_people c on c.user_id=r.user_id
  where r.cohort_id='c449b22b-dd51-49a0-bd71-fb47e672f2b0'
    and r.instrument_id='futurenow' and r.wave='pre'
), latest_pres as (
  select distinct on (user_id) * from pres order by user_id,created_at desc,id desc
), posts as (
  select r.* from public.responses r join current_people c on c.user_id=r.user_id
  where r.cohort_id='c449b22b-dd51-49a0-bd71-fb47e672f2b0'
    and r.instrument_id='futurenow' and r.wave='post'
), latest_posts as (
  select distinct on (user_id) * from posts order by user_id,created_at desc,id desc
), paired as (
  select q.id as post_id, p.id as pre_id from latest_posts q
  join lateral (
    select p.id from pres p where p.user_id=q.user_id and p.created_at<=q.created_at
    order by p.created_at desc,p.id desc limit 1
  ) p on true
)
select now() as observed_at,
 (select count(*) from current_people) as current_participants,
 (select count(*) from latest_pres) as blocks_0_to_4_and_pre_n,
 (select count(*) from pres) as pre_history_count,
 (select count(*) from latest_posts) as representative_post_count,
 (select count(*) from paired) as paired_n,
 (select count(*) from latest_posts where answers->'REC_OK'='true'::jsonb and btrim(coalesce(answers->>'REC',''))<>'') as consented,
 (select count(*) from latest_posts where (answers->'REC_OK') is distinct from 'true'::jsonb and btrim(coalesce(answers->>'REC',''))<>'') as nonconsented_k;
```

### 4.3 검증·배포

바뀐 기존 잠금은 승인된 구조 변화 두 곳이다. 나머지 권한·개인 리포트 링크·마스킹·사전 전용 편성·인쇄 구조 단언은 유지한다.

| 위치(이 슬라이스 기준) | 전 | 후 |
|---|---|---|
| `group/group.page.test.ts:25~33` | 블록 0~4 다음 블록 5가 마지막 | 블록 0~4 → 블록 5 → 블록 6 순서 |
| `group/group.page.test.ts:43~50` | 블록 5 뒤 `all={postScores}` 존재 | 블록 5 뒤 대응 평균 `GroupComparison` 존재, 사후 단독 평균 부재 |

새 실행형 페이지 검사는 현재 참여자·스태프·이동자 범위, `pre A → post B → pre C`, 명단 오류, 표본 0/1/2/3명, 미동의 원문의 클라이언트 비전달을 확인한다. 모델·추천 부품 검사는 빈 평균·반올림 전 수치·응답 당시 성별과 나이·클립보드 성공과 실패·화면/인쇄의 동일 목록을 포함한다. `architecture.md` §9.5와 ADR-205를 동기화했다. 계약·DB 스키마 변경은 없다.

작업 커밋 `4724cd45836fb7c244c2e04612c95854205af226`에서 아래 명령을 직접 실행했다. 실행 중 HEAD는 동일했다. 전체 테스트는 **1923 통과 / 87 스킵 / 총 2010**, 파일은 **166 통과 / 7 스킵 / 총 173**이다. 린트 오류 0, 기존 경고 3개다.

| 명령 | 실제 종료 코드 | 종료 시각(KST) |
|---|---:|---|
| `npx tsc --noEmit` | 0 | 2026-11-02T14:04:01.735733+09:00 |
| `npx eslint .` | 0 | 2026-11-02T14:04:14.421248+09:00 |
| `npx vitest run` | 0 | 2026-11-02T14:04:08.008780+09:00 |
| `npx next build` | 0 | 2026-11-02T14:04:30.815892+09:00 |
| `node scripts/verify.mjs` | 0 | 2026-11-02T14:05:13.078751+09:00 |

- 작업 커밋: `4724cd45836fb7c244c2e04612c95854205af226` · [PR #5](https://github.com/loginheaven-jpg/futurenow-platform/pull/5).
- 병합 커밋: `32deca8c5e66d1e6477d4052fb9eecdbbd629d29`.
- 운영 확인: `GET https://future.yebom.org/api/version`에서 `env=production`, `ref=main`, `commit=32deca8c5e66d1e6477d4052fb9eecdbbd629d29`, `deploymentId=dpl_6EohPbJTaNib9MFHBe4uXr4fasMm`. build 시각 `2026-11-02T05:06:05.192Z`.
- 원격 증거: `git ls-remote origin refs/heads/main refs/heads/feat/postcheck-v2`.

```text
4724cd45836fb7c244c2e04612c95854205af226	refs/heads/feat/postcheck-v2
32deca8c5e66d1e6477d4052fb9eecdbbd629d29	refs/heads/main
```

<details>
<summary>S3 verify.mjs 출력 전문</summary>

```text
── tsc ──
오류 0

── eslint ──
78:3  warning  Unused eslint-disable directive (no problems were reported from 'react-hooks/purity')
  23:8  warning  Unused eslint-disable directive (no problems were reported from '@next/next/no-html-link-for-pages')
✖ 3 problems (0 errors, 3 warnings)
  0 errors and 2 warnings potentially fixable with the `--fix` option.

── vitest ──
Test Files  166 passed | 7 skipped (173)
      Tests  1923 passed | 87 skipped (2010)
   Duration  8.80s (transform 9.51s, setup 0ms, import 21.11s, tests 5.92s, environment 21ms)

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

</details>

1~2명 경고와 인쇄 영역은 실행형 렌더 검사로 확인했다. 지정 QA 로그인으로 하는 실제 화면·인쇄 검증은 **미실행**이다.

## 5. S4 — AI 비교와 조건부 기존 해석 교체

### 5.1 구현과 재검토 보완

S3 production `32deca8c` 반영을 확인한 뒤 착수했다. 제출 후 사전생성·인도자 지연생성이 같은 `findPairedPre`로 짝을 찾고 앱에서 채점해 `{ wave, prev }`를 전달한다. 정상 무짝은 단독 생성이며 조회 오류는 생성·저장을 막고 이후 재시도로 남긴다. 기존 해석의 우선 반환은 생성 함수에서 유지한다. 호출부의 짝 조회까지 생략한다는 뜻은 아니다.

기본 시스템 프롬프트 SHA-256은 수정 전후 `159813336be97dfce5cb8f4007792e561ed6ac49e71569c72b1deaa3bf4869cb`로 동일하다. 사전 입력은 A21 한 줄 외 동일함을 수정 전 실제 출력 snapshot으로 검사한다. 짝 있는 사후에만 A17을 구조 절 앞에 삽입한다. 비교 입력은 활력·나침반·준비도·각 영역의 사전/지금 현재 위치와 남은 간격, 사전/현재 돌봄 신호를 담는다. E1~E3는 사후 라벨이며 추천 글과 신원은 입력에 넣지 않는다. caution 요구는 현재 신호만 따른다.

B14는 합성 실호출에서 발견한 실제 출력 결함의 보완이다. A17 원문을 바꾸지 않고 짝 있는 사후의 사용자 입력 마지막에 다음을 추가한다.

> 비교 해석에서 점수 변화의 이유는 참여자가 쓴 말에 직접 근거가 있을 때만 적어 주세요. 근거가 없으면 “~일 수 있습니다” 같은 가능성 표현으로도 이유를 추정하지 말고, 관찰된 변화와 인도자가 대화로 확인할 점만 적어 주세요. 이 원칙은 headline·axes·growth 모두에 적용합니다.

인도자 수정·되돌리기의 UPDATE는 `.select('response_id')`로 반환된 행이 정확히 하나인지 확인한다. DB 오류가 없어도 0행/null이면 실패다. 되돌리기는 clear 후 서버의 최신 해석을 재조회·파싱하여 VM을 반환하고 패널은 VM 전체를 적용한다. 옛 `prev.ai`를 다시 표시하지 않는다.

기존 단언 삭제·완화·교체는 없다. 변경한 파일은 두 생성 액션, InterpretationPanel, core context, interpretation 입력/생성기와 해당 검사들이다. `architecture.md` §9.3·§9.5와 ADR-206을 정합화했고 조건부 교체 실행 지시서를 함께 작성했다. 계약·DB 스키마 변경은 없다.

### 5.2 합성 점수의 실제 게이트웨이 검증

실제 프로젝트의 채점기·입력 생성기·프롬프트 선택기·gatewayChat·파서를 Vite로 로드해 합성 응답만 보냈다. 직접 연결의 fetch 오류는 작업 환경의 기존 프록시·CA를 따르는 `NODE_USE_ENV_PROXY=1` 실행으로 해결했다. API 키 부족으로 판정하지 않았다. DB 저장은 하지 않았다.

| 관찰(KST) | 결과 |
|---|---|
| 2026-11-02 14:11:28 | 실제 연결·JSON 파싱·현재 caution 부재·추천 미포함은 성공. 내용 검토에서 참여자가 쓰지 않은 “더 정직한 평가” 등의 긍정적 원인 추정 발견. 이 결과를 적합 판정으로 처리하지 않음. |
| 2026-11-02 14:14:17 | B14 적용 후 동일 반례 재검사. 일의 현재 위치 7→4, 남은 간격 3→6을 설명하고 원인은 참여자의 말에서 확인되지 않아 대화로 확인할 점으로 남김. 근거 없는 원인 추정을 검토한 출력에서 찾지 못함. |

최종 실호출: model `claude-sonnet-5`, provider `claude-sonnet`, `useCache:false`, 입력/출력 토큰 1966/832. 이 값은 해당 호출의 실측이며 기본 모델을 고정한 사양이 아니다.

- 실제 interpretation 소스 SHA-256: `e64f82418aeb44817d7cd2c3dc2cce971d42ba1c9142f35a20975d63d7871055`.
- 입력 SHA-256: `72772871f40ffd9877b36305f1b23d217d78b72f31cc583b6e39791b54a84ed5`.
- 비교 시스템 프롬프트 SHA-256: `d2c4df17ba23e18005c401d271a5c49d56454ffe020a279e59c0842705ab35e4`.

이는 **한 합성 반례의 재검사**다. 모든 생성 결과의 적합성을 보장하거나, 지정 QA의 실제 제출·저장·재조회 검증을 대신하지 않는다.

### 5.3 기존 운영 해석 교체 상태

**S4-5 운영 교체는 미실행이다.** 지정 QA 계정으로 실제 제출·생성·저장·재열람하는 선행 조건을 충족하지 못했다. 운영자 세션과 합성 호출을 그 조건의 대체 증거로 삼지 않았다.

- 고정 운영 대상 확정: 미실행. 따라서 n/a/f/s를 임의로 0으로 적지 않는다.
- 비공개 영속 백업: 미생성. 존재하지 않는 백업 식별자·위치를 보고하지 않는다.
- 기존 사후 AI UPDATE/DELETE: 실행하지 않음.
- 기존 사전 AI 재작성: 실행하지 않음.
- 실행 지시서: `docs/reports/CC_RUNBOOK_postcheck_ai_refresh.md` 작성·교차 검토 완료. QA·동일 소스·고정 짝·영속 백업·후보 내용 검토·조건부 적용·조건부 복구·재시도 제한·원문 비공개를 명시했다.

QA 접속이 제공되면 이 실행 지시서의 순서로 이어간다. 이 미실행 작업과 코드 배포 여부는 구별한다.

### 5.4 검증·배포

작업 커밋 `81d01a8170b6269338a67505e3e292ba749099a9`에서 아래 명령을 직접 실행했다. 실행 중 HEAD는 동일했다. 전체 테스트는 **1977 통과 / 87 스킵 / 총 2064**, 파일은 **169 통과 / 7 스킵 / 총 176**이다. 린트 오류 0, 기존 경고 3개다.

| 명령 | 실제 종료 코드 | 종료 시각(KST) |
|---|---:|---|
| `npx tsc --noEmit` | 0 | 2026-11-02T14:15:45.862886+09:00 |
| `npx eslint .` | 0 | 2026-11-02T14:15:58.681680+09:00 |
| `npx vitest run` | 0 | 2026-11-02T14:15:52.712940+09:00 |
| `npx next build` | 0 | 2026-11-02T14:16:15.762660+09:00 |
| `node scripts/verify.mjs` | 0 | 2026-11-02T14:16:54.563717+09:00 |

- 작업 커밋: `81d01a8170b6269338a67505e3e292ba749099a9` · [PR #6](https://github.com/loginheaven-jpg/futurenow-platform/pull/6).
- 병합 커밋: `ab7adc6098c0478292f47a8cf192dc968dd72e10`.
- 운영 확인: `GET https://future.yebom.org/api/version`에서 `env=production`, `ref=main`, `commit=ab7adc6098c0478292f47a8cf192dc968dd72e10`, `deploymentId=dpl_EjVfLVCHRt9FBAastHQ4bgnzDBDX`. build 시각 `2026-11-02T05:17:41.428Z`.
- 원격 증거: `git ls-remote origin refs/heads/main refs/heads/feat/postcheck-v2`.

```text
81d01a8170b6269338a67505e3e292ba749099a9	refs/heads/feat/postcheck-v2
ab7adc6098c0478292f47a8cf192dc968dd72e10	refs/heads/main
```

<details>
<summary>S4 verify.mjs 출력 전문</summary>

```text
── tsc ──
오류 0

── eslint ──
78:3  warning  Unused eslint-disable directive (no problems were reported from 'react-hooks/purity')
  23:8  warning  Unused eslint-disable directive (no problems were reported from '@next/next/no-html-link-for-pages')
✖ 3 problems (0 errors, 3 warnings)
  0 errors and 2 warnings potentially fixable with the `--fix` option.

── vitest ──
Test Files  169 passed | 7 skipped (176)
      Tests  1977 passed | 87 skipped (2064)
   Duration  7.58s (transform 8.01s, setup 0ms, import 17.35s, tests 5.41s, environment 20ms)

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

</details>

코어의 0행 단위 검사는 모의 DB 응답, 패널 검사는 실제 함수·핸들러·재렌더를 실행하는 Node hook harness다. 후속 S5의 별도 실DB 롤백 검사에서는 실제 `UPDATE RETURNING`도 담당 인도자 1행·타 인도자 0행·참여자 0행·담당 인도자 clear 1행임을 확인했다(§6.3). 두 검사를 구별하며 실브라우저 검증은 미실행이다.

## 6. S5 — 세미나 마무리 구획

### 6.1 구현

S4 production `ab7adc6098c0478292f47a8cf192dc968dd72e10` 반영을 확인한 뒤 착수했다. 본문의 `세미나 마무리`에 개시·진행·미작성자·안내 공유·마감·재개를 모았다. 하단 관리에는 이름·소개·정원과 허용된 삭제만 남는다. A15·A16과 B12를 `seminarClosing.ts`에 모으고 순수 `seminarClosingModel`이 개시 여부·미작성 수에 따라 확인문을 만든다. 미작성 0명은 해당 줄을 생략하고 미개시는 “마무리 체크를 아직 열지 않았습니다.”로 표시한다. `postStatus` 없는 갤러리에서도 개시·마감·재개는 유지한다.

회기 상세 부모는 `listCohortMembers(cohortId,true)`의 현재 일반 참여자만 `postStatus`에 사용한다. 기존 전체 명단·3숫자·삭제 영향 수는 그대로다. 명단 조회 실패는 정상 0명으로 바꾸지 않는다. 체크 허브의 열린 미완료 사후 검색은 모든 소속 회기를 대상으로 하여 마감 회기도 이어 작성할 수 있다. 사전·가치 카드는 기존 활성 회기 선택과 접근 판정을 유지한다.

기존 `openPostWave`·마감/재개 액션과 busy/finally 처리를 재사용한다. `architecture.md`의 라우트 표·§9.5·ADR-207을 동기화했다. 회원 모델·계약·RLS·RPC·마이그레이션 변경은 없다.

### 6.2 단위 검증과 바뀐 기존 잠금

새 실행형 검사는 active/archived × 개시 전/후 × 미작성 전부/일부/없음의 12조합, `postStatus` 없는 경우, 실제 삭제 허용 여부에 따른 관리 요약, 마감 확인·취소·확정·재개와 busy 복구를 확인한다. 부모 페이지는 스태프·이동자 제외와 명단 오류 전파, 허브는 마감 회기 사후 선택과 기존 사전/가치 경로를 확인한다. 렌더·함수·핸들러 실행이며 실브라우저로 보고하지 않는다.

| 위치(이 슬라이스 기준) | before | after |
|---|---|---|
| `src/app/_screens/console/CohortDetail.test.tsx:82` | 소스의 `{!postOpened ? (`와 `{postOpened && postStatus ? (` 존재 | 실제 렌더에서 관리 안 마무리 체크 부재, 본문 라벨 1개 |
| 같은 파일 `:89` | 소스에 `개시</Button>` 존재 | 실제 개시 버튼 존재, 관리 앞 본문 배치 |

두 기존 테스트의 의도를 유지해 구조 변화에 맞게 실행형 단언으로 바꿨다. 나머지 기존 단언은 삭제·완화하지 않았다. `tests/membership.integration.test.ts`의 원래 810행(50,302바이트)은 그대로 두고 S5 실DB 사례 3개를 끝에 추가했다. 기존 마감 자동승급 폐지 검사도 유지한다.

### 6.3 별도 실DB 롤백 검증

원래 Vitest 실DB 스위트는 `SUPABASE_DB_URL`이 없어 실행하지 못했다. `membership.integration.test.ts` 단독 실행 결과는 **파일 1 skipped / 테스트 38 skipped / 0 passed**다. 아래 결과는 별도 관리 SQL의 실제 실행이며 원래 스위트 성공으로 대체 계산하지 않는다.

`CC_VERIFY_postcheck_closing.sql`은 한 요청의 트랜잭션에서 무작위 합성 계정 4개·세미나 회기 2개만 만든다. 정상 가입 트리거를 켠 채 준비하고 `authenticated` 역할과 해당 합성 계정의 claim을 설정한 뒤 실제 INSERT·RPC·UPDATE RETURNING을 실행했다. 기존 `individual`·`held` 회원도 합성 마감 회기에 등록하여 기존 회원행 보존 검사가 실제 마감 대상자를 포함하도록 교차 검토 후 보강했다.

**최종 실행 2026-11-02 14:27:23 KST: 4개 시나리오, 결과값 45개 모두 통과.** 45는 Vitest 테스트 개수가 아니다.

| 시나리오 | 확인한 실제 결과 |
|---|---|
| 사후 미개시 회기의 마감·재개 | 활성 코드 1행→마감 0행, 소속 회기 id·내 회기·기존 사전 열람 1행 유지. 마감 뒤 사후 INSERT와 갈무리 save/submit 성공. 회원행 수와 저장값 유지. 마지막 세미나 마감 시 `pending/read_only`. 재개 1행, `expires_at`·`post_opened_at` NULL 포함 보존. |
| 사후 개시 회기의 마감·재개 | 위와 동일한 권한·보존 결과. 갈무리 직접 INSERT와 타 회기 사후 INSERT는 `42501`, 타 회기 save/submit은 `P0001`로 거부. 같은 부정 사례는 미개시 시나리오에서도 확인. |
| 두 진행 중 세미나 | 하나를 마감한 뒤 `cohort/full`, 둘 다 마감한 뒤 `pending/read_only`. 참여자의 저장 회원행 0건 유지. |
| 해석 수정 RLS | 담당 인도자 UPDATE RETURNING 1행, 타 인도자 0행, 참여자 0행, 담당 인도자 clear 1행. |

**롤백 후 별도 조회 2026-11-02 14:27:30 KST: 관련 12테이블의 합성 잔여 모두 0건.** `[QA] 검증 전용` 회기는 active, `expires_at=null`, `post_opened_at=2026-09-05T23:37:04.214791+00:00` 그대로다. 실제 참여자 계정·응답·해석은 쓰지 않았고 QA 회기도 변경하지 않았다. 기계 판독 결과와 합성 id는 `CC_EVIDENCE_postcheck_db.json`에 남긴다.

초기 검증 SQL의 CASE 괄호 오류는 실행 전 수정했다. 그 다음 시도는 관리 연결의 `session_replication_role` 설정 권한 부족으로 fixture 생성 전에 실패·롤백됐다. 권한을 늘리거나 트리거를 우회하지 않고 정상 가입 트리거를 사용하는 fixture로 바꿔 실행했다. 이 경위 역시 기존 Vitest SETUP이 실행된 것으로 보고하지 않는 이유다.

### 6.4 검증·배포

소스와 위 문서의 동일 커밋을 대상으로 직접 tsc·eslint·vitest·build·verify를 실행한 후 PR을 병합하고 production의 전체 SHA를 확인한다. 완료 영수증은 다음 문서 정합 커밋에 기록한다. 지정 QA 로그인의 실제 화면·인쇄 검증은 미실행이며 S4-5 기존 운영 AI 교체도 계속 미실행이다.

## 7. S6 — 최종 문서 정합과 관찰

미착수. 소스·ADR·IA·보고서·최종 운영 신원을 대조한다.

## 8. 근거 파일

- 기준 SHA의 `src/app/_lib/latestPerUser.ts`, `src/app/coach/cohort/[cohortId]/group/page.tsx`, `src/instruments/futurenow/report/groupModel.ts`.
- 기준 SHA의 `src/app/coach/cohort/[cohortId]/report/[responseId]/InterpretationPanel.tsx`, `actions.ts`, `src/core/context.ts`, `src/instruments/futurenow/report/interpretation.ts`.
- `supabase/migrations/20260830090000_membership_model.sql`, `20260704130000_save_interpretation_owner.sql`, `20260727100000_checkin_data_layer.sql`, `20260727110000_checkins_revoke_write.sql`.
- `src/app/(member)/my/cohorts/[cohortId]/checkin/[session]/page.tsx`, `mode.ts`, `CheckinCardClient.tsx`.
- `tests/adrNumbers.test.ts`, `scripts/verify.mjs`, `docs/tasks/퓨처나우_통합웹사이트_IA확정본_v2.2.md`.
- Supabase [select modifier](https://supabase.com/docs/reference/javascript/using-modifiers-select): 변경한 행을 `.select()`로 반환받는 동작. 조회일 2026-11-02.
