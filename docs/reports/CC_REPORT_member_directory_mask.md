# 완주 보고 — 이름 없는 참여자 마스킹 (ORDER ② · ㉯ DB 방식)

- 브랜치 : `feat/member-directory-mask`
- 근거 : 최박사 결재(발주서 §5 조건 그대로) · 지휘부 회신 2026-08-30(보완 둘 승인 · 4자 경계 선택 승인 · 잠금 지시 하나)
- 잰 날 : 2026-08-30

---

## 0. 지휘부 추가 지시에 대한 답

> ★ 잠금에는 0명 사실이 아니라 **마스킹 규칙 자체를 검증하는 케이스**를 넣어라.
> 실데이터가 0명이라도 **이름 없는 입력을 함수에 먹여** 마스킹 결과를 단언하는 테스트여야 실제로 무는 잠금이 된다.

**그대로 했다.** `tests/memberDirectoryMask.integration.test.ts` 를 새로 지었다 —
실DB 에 **트랜잭션 안에서 가짜 차수 하나를 세우고 이름 없는 사람 다섯을 심어**
함수에 먹인 뒤 결과를 단언하고 롤백한다. 「0명」은 **보고서의 맥락 기록**으로만 남겼다(§4).

먹인 경계와 나온 값 (실측) :

| 입력 이메일 로컬파트 | 길이 | 기대 | 실측 |
|---|---|---|---|
| `hongkildong` | 11 | `hong***` | `hong***` |
| `honga` | 5 (경계 위) | `hong***` | `hong***` |
| `hong` | **4 (경계)** | `hong***` | `hong***` |
| `kim` | 3 | `kim***` | `kim***` |
| 이름 `'   '`(공백) | — | `spac***` | `spac***` |
| 이름 `이승은` | — | `이승은` | `이승은` |

잠금 다섯 : 규칙·경계 / 도메인 미유출 / **기본값이 종전과 같다** / **게이트를 우회하지 않는다** / 오버로드·권한.

---

## 1. 구현·변경 파일

**두 갈래로 갈라 적는다**(지휘부 지시 2026-08-30) — 아래 표의 위 아홉은 **마스킹 본작업**이고,
맨 아래 둘은 **앞 회차가 남긴 문서·도구 빚**이다. 같은 커밋에 있으나 서로 다른 일이다.

| 파일 | 상태 | 내용 |
|---|---|---|
| `supabase/migrations/20260904090000_member_directory_mask_rollback.sql` | 완 | **롤백 문 — 먼저 열었다.** 본문은 라이브 `pg_get_functiondef` 로 받아 온 것(손으로 옮기지 않았다) |
| `supabase/migrations/20260904090001_member_directory_mask.sql` | 완 · **적용됨** | `cohort_member_directory` 에 `p_mask_unnamed boolean DEFAULT false` 를 더한다 |
| `src/contracts/core-context.ts` | 완 | `listCohortMembers(cohortId, onlyParticipants?, maskUnnamed?)` — 선택 인자 하나. `MemberRef` 무변경 |
| `src/core/context.ts` | 완 | RPC 에 `p_mask_unnamed` 를 실어 보낸다. **코어는 가리지 않는다** |
| `src/app/coach/cohort/[cohortId]/group/page.tsx` | 완 | **유일한 옵트인** — `listCohortMembers(cohortId, true, true)` |
| `tests/memberDirectoryMask.integration.test.ts` | 완(신규) | **규칙을 함수에 먹이는 잠금 5** — 실DB 옵트인 |
| `src/app/coach/cohort/[cohortId]/group/group.page.test.ts` | 완 | 정적 잠금(마스킹 블록). 옛 2인자 단언을 새 사실로 갱신 |
| `src/core/context.test.ts` | 완 | RPC 인자 단언 둘 갱신 + **옵트인이 `true` 를 실어 나르는지** 새 잠금 1 |
| `scripts/verify.mjs` | 완 | 새 통합 파일을 스킵 사유 목록에 등록(하네스가 목록과 실측을 대조한다) |
| **— 여기까지 마스킹 본작업 —** | | |
| `architecture.md` (ADR-167) | 완(**빚 정리**) | **그룹 리포트 (a)·(b) 회차가 정본에 없었다.** 불변식 24 가 요구하는 기록을 이번에 갚는다 |
| `scripts/regenCopyBaseline.mjs` | 완(**빚 정리**) | **6회차 회차의 누락분** — `FILES` 에 `session6` 이 빠져 있었다 |

---

## 2. 검증 — `node scripts/verify.mjs` 출력 전문 (2026-08-30)

```
── tsc ──
오류 0

── eslint ──
23:8  warning  Unused eslint-disable directive (no problems were reported from '@next/next/no-html-link-for-pages')
✖ 3 problems (0 errors, 3 warnings)
  0 errors and 1 warning potentially fixable with the `--fix` option.

── vitest ──
Test Files  131 passed | 6 skipped (137)
      Tests  1489 passed | 78 skipped (1567)
   Duration  6.52s (transform 12.86s, setup 0ms, import 34.41s, tests 6.96s, environment 24ms)

── next build ──
성공

O 네 지표 전항 통과
```

**총수 대조** : 직전 회차 `1486 통과 / 78 스킵 / 1564` → 이번 `1489 / 78 / 1567`.
**늘어난 셋**은 전부 이번 회차에서 지은 것이다 — `context.test.ts` 옵트인 잠금 1 +
`group.page.test.ts` 마스킹 블록 순증 2. **줄어든 것 없음.**
`Test Files` 130 → 131 은 신규 통합 파일이 **스킵으로** 잡힌 것이다(스킵 6 → 6 은 신규 1 증 · site.snapshot 조건 변동 상쇄).

**eslint 는 3 이다** — 앞 회차 기준선(경고 3)에서 늘지 않았다.
중간에 4(오류 1)가 났는데 **내가 넣은 `require()`** 였고 상단 `import` 로 옮겨 없앴다.
남의 것이 아니라 내 것이었으므로 그대로 적는다.

**실DB 옵트인 포함 실행** (`RUN_RLS_INTEGRATION=1`) :

```
Test Files  2 failed | 133 passed | 2 skipped (137)
      Tests  2 failed | 1557 passed | 8 skipped (1567)
```

붉은 둘은 **기존 레드**다 — §6 에 따로 적었다.

---

## 3. 최박사 결재 조건에 대한 답

### 3.1 「롤백 문을 먼저 열고 예행한 뒤 적용한다」 — 했다

예행이 **하나를 잡았다.** 롤백 후 함수에 `anon=EXECUTE` 가 **자동으로 붙었다** —
이 프로젝트는 `pg_default_acl` 이 **표·시퀀스뿐 아니라 함수에도** 걸려 있어
`revoke ... from public` **한 겹만으로는 걷히지 않는다.** 서가 B 에서 데인 그 형태다.
→ **두 마이그레이션 모두**에 `revoke ... from anon` 을 명시로 더했다.

### 3.2 「적용 후 기존 여섯 화면이 정상인지」 — 확인했다. 다만 **정적 확인으로 답하지 않았다**

정적 검사는 런타임 행동을 잡지 못한다(계열 ⑨-c). 그래서 **옛 함수를 나란히 세워
실기수 데이터로 행 단위 대조**했다 — 트랜잭션 안에서 `public._old_cmd` 라는 이름으로
**마스킹 이전 정의**를 만들고, 실차수 전부에 대해 두 함수의 출력을 비교한 뒤 롤백했다.
**실기수·실계정은 읽기만 했다.**

```
차수     등록   onlyParticipants=false   onlyParticipants=true
QKN2H      2   동일 2행=2행              동일 0행=0행
JOINF      4   동일 4행=4행              동일 3행=3행
HMT7Z     11   동일 11행=11행            동일 9행=9행
ZR4KB     11   동일 11행=11행            동일 9행=9행
TRASH      1   동일 1행=1행              동일 1행=1행
YYGYP      1   동일 1행=1행              동일 1행=1행

대조 : 차수 6 × 인자조합 2 = 12건 중 **다름 0건**
```

**「0」은 자를 물린 뒤의 0이다.** 같은 자에 일부러 어긋난 인자를 먹여 차이를 잡는지
먼저 확인했다 — `_old_cmd(id,false)` vs `신함수(id,true)` 로 **4건을 잡았다**
(QKN2H 2↔0 · JOINF 4↔3 · HMT7Z 11↔9 · ZR4KB 11↔9). 물리지 않은 0 은 아무 말도 하지 않는다.

**호출처는 아홉이다.** 앞서 「여덟」이라 보고했는데
`src/app/coach/cohort/[cohortId]/page.tsx` 를 빠뜨렸다. 파일별로 적는다
(셈은 `rg 'listCohortMembers\('` 로 다시 낸다) :

| # | 호출처 | 인자 | 마스킹 |
|---|---|---|---|
| 1 | `app/coach/cohorts/page.tsx:32` | 1 | 끔(기본) |
| 2 | `app/coach/page.tsx:56` | 1 | 끔(기본) |
| 3 | `app/coach/cohort/[cohortId]/page.tsx:38` | 1 | 끔(기본) · **발주 일곱에 없던 것** |
| 4 | `app/coach/cohort/[cohortId]/actions.ts:35` | 1 | 끔(기본) |
| 5 | `app/coach/cohort/[cohortId]/report/[responseId]/page.tsx:42` | 1 | 끔(기본) |
| 6 | `app/coach/cohort/[cohortId]/checkin/page.tsx:35` | 2 | 끔(기본) |
| 7 | `app/coach/cohort/[cohortId]/member/[userId]/page.tsx:27` | 2 | 끔(기본) |
| 8 | `app/coach/cohort/[cohortId]/matrix/page.tsx:21` | 2 | 끔(기본) · **발주 일곱에 없던 것** |
| 9 | `app/coach/cohort/[cohortId]/group/page.tsx:46` | **3** | **켬 — 유일** |

「하나만 옵트인한다」는 **수를 박지 않고 규칙으로 잠갔다** — 잠금이 `src` 를 훑어
호출처를 스스로 찾고, 3인자 호출이 그룹 리포트 하나뿐임을 단언한다.
호출처가 늘면 잠금이 저절로 따라간다.

### 3.3 「이상이 있으면 즉시 되돌린다 · 되돌리는 절차를 적는다」

이상 없었다. 되돌리는 절차는 다음과 같다(롤백 파일 머리에도 같은 내용이 있다).

1. **앱을 먼저 되돌린다.** `group/page.tsx` 의 3인자 호출을 2인자로 되돌리고 배포한다.
   **좁히는 변경이므로 코드가 먼저다**(CLAUDE.md §5) — 함수를 먼저 떨어뜨리면
   배포된 옛 코드가 없는 3인자 함수를 부른다.
2. `supabase/migrations/20260904090000_member_directory_mask_rollback.sql` 을 적용한다.
   3인자 판을 **먼저 `DROP`** 한다 — 공존하면 2인자 호출이 어느 것으로 갈지 갈린다.
3. 확인 : `pg_get_functiondef` 해시가 **`ef5382c291fe922b3a69c85d7e19fb0a`** 인지,
   함수 개수가 **1** 인지, ACL 이 **`authenticated,postgres,service_role`**(anon 없음)인지.

---

## 4. 「지금 이름 없는 실회원 0명」 — 맥락 기록

- 이름이 빈 실회원 **0명**. 실기수(ZR4KB·HMT7Z) 참여자 중에도 **0명**(실측 2026-08-30).
- 이유 : `futurenowIdentityPolicy` 가 `user: { name: 'required' }` 로 **폼에서** 막는다.
- **그래도 짓는 이유**(지휘부 판단 그대로) : 그 필수성은 **절차적 보장**이다.
  주석 자신이 한계를 밝히고 있다 — *「코어 ADR-03은 반전하지 않는다(`CoreUser.name` 은 여전히 nullable).
  필수성은 이 정책 데이터 + 폼 게이트로만 강제」*. 운영자 직접 등록·데이터 이관·코어 API 생성은
  **그 게이트를 지나지 않고**, `users.name` 은 여전히 nullable 이다. **DB 는 빈 이름을 막지 않는다.**
- **그러므로 지금의 초록은 「막았다」가 아니라 「막을 것이 없었다」이다.**
  이 문장을 여기 남기는 이유가 그것이다 — 잠금은 §0 처럼 **규칙을 물게** 했다.

---

## 5. 잠금을 물려 봤다 (조항 ⑪)

라이브 함수를 **트랜잭션 안에서** 망가뜨렸다가 롤백했다(PG 는 DDL 도 트랜잭션이다).
**변이가 심어졌는지 값으로 먼저 확인**하고(치환이 안 먹으면 즉시 실패시킨다) 잰다.

| 변이 | 결과 | 나온 값 |
|---|---|---|
| ⑴ 5자 경계를 6자로 민다 | **붉어짐** | `honga → honga***` (기대 `hong***`) |
| ⑵ 도메인까지 내보낸다 | **붉어짐** | `hongkildong → hongkildong@x.test` |
| ⑶ 기본값 분기를 지운다 | **붉어짐** | 기본값 호출이 `"hong***"` 를 냈다(기대 NULL) |
| ⑷ 권한 게이트를 지운다 | **붉어짐** | 남의 차수인데 **6행** 보였다 |

변이 뒤 라이브 실물을 다시 조회해 **원상 확인**했다 :
시그니처 `(uuid,boolean,boolean)` · 함수 개수 **1** · 게이트 있음 · 기본분기 있음 · 5자경계 있음 ·
권한 `authenticated,postgres,service_role` · **픽스처 잔류 `cohorts` 0행 · `users` 0행**.

**뜻밖의 확인 하나** — 마스킹을 **끄면** 공백 이름 `'   '` 이 **NULL 이 아니라 공백 그대로** 나온다.
내 자가 NULL 을 기대했다가 붉었는데, **자가 틀렸고 함수가 옳았다** —
옛 함수가 `u.name` 을 그냥 냈기 때문이다. **그것이 곧 「기본값 = 기존 동작」의 증거**여서
그대로 단언으로 박았다. 여기서 NULL 이 나오면 오히려 꺼진 경로에 손을 댄 것이다.

**4자 경계 명시**(지휘부 선택 승인) : 4자는 **「4자 이하」쪽**이다(`ELSE` 가지 · 전체 + `***`).
`>= 5` 가지와 결과가 같아 실질 차이는 없으나, 마이그레이션 주석·정적 잠금·통합 잠금
**세 곳 모두**에 경계를 못 박았다. 나중에 규칙을 손볼 때 어느 쪽인지 헤매지 않게 한다.

---

## 6. 선행 레드 둘 — **별건으로 분리한다** (지휘부 판정 2026-08-30)

> 승인 없이 손대지 않은 판단이 옳다. 다만 **그 단언이 무엇을 지키려던 것인지** —
> 표 전체에 운영자가 못 닿는다는 것인지, 픽스처가 새지 않는다는 것인지 — 를 확인한 뒤에 고쳐야 한다.
> **잘못 좁히면 진짜 구멍이 났을 때 못 잡는다.** 별건 발주로 분리하고,
> **이번 회차 인수 판정에서 이 둘은 제외한다.**

**그러므로 이 절은 인수 대상이 아니라 인계 기록이다.** 아래 진단까지만 남기고 손대지 않았다 —
§6 말미의 처방 제안도 **제안으로만** 둔다. 어느 쪽을 지키려던 단언인지가 먼저다.

실DB 옵트인으로 돌리면 둘이 붉다. **내 변경을 전부 `git stash` 로 치우고 돌려도 같은 값으로 붉다**
— 그러므로 이번 회차가 만든 것이 아니다. 3채널 감사가 같은 값을 볼 것이므로 미리 갈라 둔다.

| 파일 · 케이스 | 값 |
|---|---|
| `tests/rls.integration.test.ts` — 「비멤버는 RPC 로도 남의 차수에 행을 심지 못한다 (B-1 세 번째)」 | `expected 2 to be +0` |
| `tests/membership.integration.test.ts` — 「개인분은 인도자에게 보이지 않고 본인·운영자만 읽는다」 | `운영자: expected 2 to be 1` |

**RLS 구멍이 아니다.** 앞의 것에서 **RPC 거부(P0001) 단언은 통과했다** — 심으려던 행은 막혔다.
붉은 것은 그 다음 줄이고, 그 줄은 이렇게 센다.

```js
expect(await countAs(client, ADMIN, `select count(*) from public.value_assessments`)).toBe(0);
```

**표 전체를 운영자로 센다.** 운영자는 원래 다 보므로, 실사용 행이 생기면 0이 아니다.
실제로 `value_assessments` 에 실행이 **둘** 있다(2026-08-30 12:18 · 08:01).
**픽스처 UUID 잔류는 0행**이므로 테스트가 흘린 것이 아니라 **실사용이 늘어난 것**이다.
**자가 재려던 것(내 픽스처가 안 심겼다)보다 넓다** — 계열 ⑨-b 다.

**처방 제안(이번 회차에서 손대지 않았다)** : 두 셈에 픽스처 한정을 건다 —
`where cohort_id = '<픽스처 차수>'` 또는 `where user_id in (...픽스처...)`.
**RLS 테스트의 단언 의미를 바꾸는 일이라 승인 없이 손대지 않았다.**
다만 **레드를 오래 두면 진짜 결함이 들어와도 아무도 못 본다** — 처리 지시를 청한다.

---

## 7. `architecture.md` 정합

- **ADR 신설** : `cohort_member_directory` 에 `p_mask_unnamed` 선택 인자 추가 ·
  기본값이 기존 동작 · 이메일 출처 `public.users` · 옵트인은 그룹 리포트 하나.
- §4(데이터 계약)의 `cohort_member_directory` 시그니처를 3인자로 갱신.
- 계약 §(CoreContext) `listCohortMembers` 시그니처 갱신.
- **집계 수치는 ADR 본문에 적지 않았다**(승격 2026-08-30) — 호출처 수·테스트 수는 산출 명령만 적었다.

## 8. 계약(`/contracts`) 대비 이탈

**이탈 없다.** `listCohortMembers` 에 **선택 인자 하나**를 더했고 기본값이 기존 동작이다 —
`ADR-118` 이 `onlyParticipants` 를 더할 때 쓴 방식 그대로다. **`MemberRef` 는 손대지 않았다.**
발주서가 승인한 범위이고 **견고화 방향**이다(가려지지 않은 것이 애초에 브라우저로 가지 않는다).

**이메일 출처는 `public.users`** (지휘부 확정). `auth` 는 Supabase 소관 스키마이고
`SECURITY DEFINER` 함수가 그쪽을 참조하기 시작하면 플랫폼 업그레이드에 취약해진다.
이 함수는 **이미 `public.users` 를 조인**하고 있어 새 표를 끌어오지도 않는다.

## 9. 보안 — 지휘부 조건 대조

| 조건 | 확인 방법 | 결과 |
|---|---|---|
| 이메일 원문 미유출 | 앱 세 파일(`page.tsx`·`GroupDesign.tsx`·`groupModel.ts`)에 `split_part`·`email`·`***`·`split('@')`·`indexOf('@')` 가 하나도 없음을 잠금이 잰다 | 통과 |
| 마스킹은 DB 안에서 끝난다 | 도메인 미유출을 **실호출 결과**로 단언(§0) | 통과 |
| 실기수·2기 신청자 무영향 | 읽기 전용 대조 + 트랜잭션 롤백. §3.2 실측 12건 다름 0 | 통과 |
| 민감 채널 미접촉 | `getCohortMemberDetail`·`user_contacts`·`listUsers`·`getPhone` 호출 0 | 통과 |
| `anon` 실행권 없음 | 적용 후 ACL 실측 `authenticated,postgres,service_role` | 통과 |
| 비밀 추적 제외 | push 전 `git status` 에 `.env.local` 없음 | 통과 |

**잠금의 창을 좁힌 곳 하나** — 처음에 「앱이 이메일을 만지는가」를 `/split_part|@|\bemail\b/i` 로 쟀다.
**`@` 하나가 `@/core/supabase/server` 같은 import 경로에 걸려** 멀쩡한 파일이 붉었다.
계열 ⑨-b(창이 넓다)라 **이메일을 다루는 표시**(로컬파트 자르기 · `email` 식별자 · 마스킹 문자열)로 바꿨다.

## 10. 지휘부 회신 반영 (2026-08-30) · 남은 것

| 청한 것 | 회신 | 이 보고서의 처리 |
|---|---|---|
| ⑴ 선행 레드 둘 | **손대지 말라 · 별건 발주로 분리 · 이번 인수 판정에서 제외** | §6 을 인계 기록으로 다시 적었다 |
| ⑵ 문서 빚 둘 | **떼지 말라 · 이번 커밋에 두되 본작업과 구분해 적어라** | §1 표를 두 갈래로 갈랐다 |
| ⑶ push | **브랜치 푸시만 승인 · main 직접 푸시 금지 · 병합은 감사 뒤 별도 판단** | §11 에 원격 조회 증거를 붙였다 |

### 발주서 정정 — 접수됨

발주서 §1 의 「호출처 일곱」은 오류였다(지휘부 확인 — grep 결과를 확인 없이 확정값으로 실었다).
**§3.2 의 아홉이 정본이다.** 다만 이 오류가 설계를 흔들지는 않았다 —
호출처가 일곱이든 아홉이든 **「선택 인자 + 기본값 = 기존 동작」은 그대로 성립하고**,
오히려 **호출처가 많을수록 그 방식을 택한 것이 옳았다는 근거**가 된다.
「옵트인 하나를 수가 아니라 규칙으로 잠갔다」가 같은 뜻이다 — **셈을 문서에 박지 않았으므로
발주서가 틀렸어도 잠금은 틀리지 않았다.** 이것이 `CLAUDE.md` §11 값의 두 분류 ⑴ 이 막으려던 자리다.

### 남은 것

- **병합은 하지 않았다.** 지휘부 3채널 감사 뒤 별도 판단이다.
- 마이그레이션은 **이미 라이브에 적용되어 있다**(최박사 결재 §5 조건에 따라 롤백 예행 후 적용).
  코드는 브랜치에만 있으므로, 지금 배포된 앱은 **2인자로 부르는 옛 코드 + 3인자 함수** 조합이고
  **§3.2 대조가 그 조합이 종전과 같음을 증명한 것**이다. 되돌림이 필요하면 §3.3 절차를 쓴다.

---

## 11. push 증거 — 원격 조회 (2026-08-30)

**로컬 로그의 해시는 push 의 증거가 아니다**(F-3 선례 — 명령은 성공했고 대상이 틀렸다).

```
$ git ls-remote origin feat/member-directory-mask
67a9a6aa3842d33e63f6a9b3caadfd723b0b6cd2	refs/heads/feat/member-directory-mask

$ git ls-tree -r origin/feat/member-directory-mask --name-only | grep member
docs/reports/CC_REPORT_member_directory_mask.md
supabase/migrations/20260904090000_member_directory_mask_rollback.sql
supabase/migrations/20260904090001_member_directory_mask.sql
tests/memberDirectoryMask.integration.test.ts

$ git ls-remote origin main
1a0749886998738da3e9e6718a2d710e858a90ac	refs/heads/main
```

**해시만으로는 내용을 말할 수 없으므로 `ls-tree` 로 실물 존재까지 확인했다.**
`main` 은 `1a07498` 그대로다 — **직접 푸시하지 않았다**(승인 범위 준수).


---

## 12. 병합 후 확인 (지휘부 조건 · 2026-08-30)

- 병합 : `fde5046` (`--no-ff`) · `git ls-remote origin main` → `fde5046ee78ebb9c1137762fdc87edd6873370b7`
- 배포 : `/api/version` → `commitShort=fde5046` · `ref=main` · `env=production` · `dpl_8du92k9tC6cvSMaRsVCUXtUaLRmH`
- `node scripts/verify.mjs` 병합 커밋에서 재실행 — **네 지표 전항 통과**(tsc 0 · eslint 0 errors · `Test Files 131 passed | 6 skipped (137)` · `Tests 1489 passed | 78 skipped (1567)` · build 성공)
- `node scripts/postdeploy.mjs` — 배포 신원 + 실브라우저 5건 전항 통과

### 12.1 「조합이 바뀐다」에 대한 정정 — **바뀐 것은 하나뿐이다**

지휘부가 *「병합으로 코드가 3인자로 올라가면 조합이 바뀐다」* 고 했는데, **여덟은 조합이 그대로다.**
코드가 바뀐 호출처는 **그룹 리포트 하나**뿐이기 때문이다.

```
$ git diff --name-only 1a07498 HEAD -- <여덟 호출처>
(빈 출력 — 여덟 다 무변경)

$ git diff --name-only 1a07498 HEAD -- src/app/coach/cohort/[cohortId]/group/page.tsx
src/app/coach/cohort/[cohortId]/group/page.tsx      ← 자가 무는 것을 확인
```

**「빈 출력」을 그대로 믿지 않았다** — 같은 자에 실제로 바뀐 파일을 먹여 잡는지 확인했다.
그러므로 여덟은 **병합 전 라이브와 완전히 같은 조합**(2인자 이하 코드 + 3인자 함수)이고,
§3.2 의 12건 대조가 증명한 바로 그 조합이다. **새 조합은 그룹 리포트 하나뿐이다.**

**자 하나가 틀렸던 것을 적어 둔다** — 처음에 `git show` 출력과 작업 트리를 `md5sum` 으로 비교해
**여덟 다 「바뀜」으로 읽었다.** `git show` 는 LF 를 내고 작업 트리는 CRLF 라 **줄끝만 달라도 해시가 갈린다.**
`git diff` 가 정본이다. 하마터면 여덟이 바뀌었다고 보고할 뻔했다 — **잰 것이 재려던 것과 달랐다.**

### 12.2 여덟 화면 — 인증한 실브라우저로 열었다

**200 을 통과로 읽지 않았다**(불변식 19). QA 코치로 로그인해 실제로 열고, `/login` 으로 밀려나지
않았는지 · 콘솔 오류 0 인지 · **명부에서 온 이름이 화면에 실제로 있는지**를 봤다.
**실기수는 열지 않았다** — QA 차수(`YYGYP` · 가짜 참여자 1)로만 했다.

| 화면 | 결과 | 명부 이름 |
|---|---|---|
| `coach/cohort/[cohortId]` | O | 있다 |
| `checkin` | O | 있다 |
| `member/[userId]` | O | 있다 |
| `matrix` | O | 있다 |
| `report/[responseId]` | O | 있다 |
| **`group`(새 조합)** | **O** | 있다 |
| `coach/cohorts` | O(렌더 정상·콘솔 0) | **관측 불가 — 아래** |
| `coach`(홈) | O(렌더 정상·콘솔 0) | **관측 불가 — 아래** |
| `cohort/actions.ts` | **열지 않았다 — 아래** | — |

**뒤의 둘을 「통과」로 적지 않는다.** 처음에 이름 유무로 재서 둘이 붉었는데,
**본문을 실제로 읽어 보니 화면은 멀쩡했다**(`[QA] 검증 전용` · `응답 1/1` 정상 렌더).
자를 고쳐 통과시키는 대신 정본을 열었다 — `rosterModel.ts:30` 이 `members` 를 **이름 맵으로만** 쓰고,
그 두 화면의 카드는 **이름을 그리지 않는다**(수만 그린다). 그러므로 **그 화면에서는 명부 결과가
눈에 보이지 않는다.** 렌더 정상·콘솔 0 은 확인했고, 그 이상은 이 층에서 관측되지 않는다 —
두 파일의 소스가 무변경이라는 §12.1 과 §3.2 의 RPC 대조가 그 자리를 대신한다.

**`cohort/actions.ts:35` 는 실행하지 않았다.** 그 호출은 **차수 삭제 액션 안의 사진 정리 루프**다 —
확인하겠다고 차수를 지울 수는 없다. 1인자 호출이고 소스가 무변경임을 정적으로 확인했다.

### 12.3 ★ 마스킹이 화면까지 오는가 — 물려 봤다

여기까지의 증거는 **두 동강**이었다. 함수가 규칙을 지킨다(§0)와 이름이 화면에 뜬다(§12.2)는
각각 참이지만, **그 사이에 마스킹이 실제로 흐르는지는 어느 쪽도 말하지 않는다** —
3인자가 안 실려도 기본값으로 호출이 성공하고 이름이 그대로 떠서 **구별되지 않기 때문**이다.

그래서 **QA 기수의 가짜 참여자 이름을 잠깐 비우고** 화면을 열었다(되돌림을 `finally` 로 보장).

```
원래 값 : name="QA 참여자"
변이 심음 : name=null (값으로 확인)

  group ★ 마스킹 켬     마스킹 「with***」 · 이메일원문 없다 · 도메인 없다
  checkin (마스킹 끔)   마스킹 없음      · 이메일원문 없다 · 도메인 없다

되돌림 : name="QA 참여자" · 원상 확인 O
```

**켠 화면만 가려졌고 끈 화면은 그대로다.** 로컬파트 16자가 `앞 4자 + ***` 로 나왔다 —
§0 의 규칙이 화면까지 그대로 왔다. **이메일 원문도 도메인도 화면에 없다.**

독립 재확인(2026-08-30) : QA 참여자 이름 `"QA 참여자"` · **이름 빈 회원 전체 0명** ·
함수 개수 1 · 권한 `authenticated,postgres,service_role`. **남긴 것 없다.**
