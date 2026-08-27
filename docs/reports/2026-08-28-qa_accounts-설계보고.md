# QA 상주 계정 — 설계 보고 (코드 0줄)

- **발주**: `docs/tasks/CC_ORDER_qa_accounts.md` §2
- **브랜치**: `feat/site-v2-4` · **코드 변경 0 · 마이그레이션 0**
- 넷을 낸다: **`kind` 처리 실측 · 검증 시나리오 표 · 최박사용 화면 단위 절차서 · 확인 목록**

---

## 0. 착수 전 확인 — `.gitignore`(발주 §0.3)

기존 확인이 있어도 다시 봤다.

```
$ git check-ignore -v .env.local
.gitignore:34:.env*	.env.local

$ git ls-files .env.local | wc -l
0
```

**`.env*` 한 줄이 막고 있고 추적 이력 0.** 자격 값은 이 파일 밖으로 나가지 않는다 —
출력·로그·커밋·보고서 어디에도 싣지 않는다.

---

## 1. QA 차수 `kind` 처리 — **전환이 필요 없다** (실측)

### 1.1 실측 — `kind` 를 바꿀 경로가 없다

| 확인 | 실측 |
|---|---|
| 컬럼 | `cohorts.kind text NOT NULL DEFAULT 'seminar' CHECK (kind IN ('seminar','general','trash','test'))` (`20260826160000_membership.sql:36`) |
| 권한 | `REVOKE UPDATE ON public.cohorts FROM authenticated` → `GRANT UPDATE (name, description, max_members, status, expires_at)` — **`kind` 는 재부여 목록에 없다** |
| 이유 | 그 마이그레이션 주석: *"인도자가 자기 차수의 kind 를 'trash' 로 뒤집어 조원 전원의 응시 자격을 조용히 없앨 수 있다"* |
| **admin RPC** | **없다.** 전 마이그레이션에서 `SET kind` 는 `20260826160000` 의 **일회성 UPDATE 3건**(JOINF·TRASH·QKN2H)뿐이다 |
| 결론 | `authenticated` 는 **admin 을 포함해** `kind` 를 못 바꾼다. 바꾸려면 `service_role` 단건 SQL 뿐이다 |

### 1.2 그런데 **바꿀 필요가 없다**

발주 §1 은 *"신설 차수가 `DEFAULT 'seminar'` 를 받으면 회원 판정·피드 생성에 걸리는데"* 라고
우려를 적었다. **실측하니 그 기본값이 우리가 원하는 값이다.**

`kind` 가 무엇이냐에 따라 **검증할 수 있는 화면이 갈린다**:

| QA 차수 `kind` | `member_state` | 홈 B · 시트 E · 차수 홈 C · 진단 홈 F | 피드 `/feed` | 여정 진단(사전·사후) |
|---|---|---|---|---|
| **`seminar`**(기본) | **`cohort`** | ○ | **○** | **○** |
| `general` / `test` | **`individual`** | ○ | **✕** | **✕**(상시만) |

근거:
- `member_state`(`:151`) — *"② cohort — 산출. `kind='seminar' AND status='active'` 여야 한다"* ·
  **`held` 다음, 저장 상태보다 먼저** 판정한다
- `feed_can_access`(feed.sql`:125`) · 피드 목록(`:391`) — **`c.kind = 'seminar'` 를 요구**
- `member_can_assess`(`:183`) — `journey` 는 `cohort` 상태만 `true`
- `my_cohorts()` — **`kind` 를 거르지 않는다.** 어떤 kind 든 홈·차수 홈에 뜬다

**따라서 `kind='seminar'` 로 두면 SQL 0건 · 마이그레이션 0 · 단건 UPDATE 0 이고,
검증 대상 화면이 전부 그려진다.**

### 1.3 ⚠ 다만 발주 §1 과 §4 가 서로 어긋난다 — **판단 요청**

§1 은 `membership individual`, §4 수용 기준은 **`member_state=individual` + `QA 차수 소속`** 을
함께 요구한다. **그 둘은 동시에 성립하지 않는다** — QA 차수가 `seminar` 면 소속되는 순간
`member_state` 가 `cohort` 로 산출되기 때문이다(위 근거).

**`individual` 을 요구한 뜻이 "실기수에 안 붙었음"이라면, 그것은 대리 지표다.**
정확한 지표는 §4 에 **이미 따로 있다** — *"실기수 소속 0"*. 그것을 직접 재면 된다.

| 안 | `kind` | 얻는 것 | 잃는 것 |
|---|---|---|---|
| **A (권장)** | **`seminar`**(기본 그대로) | **인증 뒤 화면 전부 검증**(피드·여정 진단 포함) · **SQL 0** | §4 의 `member_state=individual` 문구를 `cohort` 로 정정해야 한다 |
| B | `general` | 문구 그대로 `individual` | **피드·여정 진단 검증 불가** · **service_role 단건 SQL 필요**(지휘부 승인 사항) |

> **권장은 A다.** F-3 게이트 잔여는 홈 B·시트 E·콘솔 사이드바이고, 시트 E 의 `동행` 항목과
> 홈 B 의 `동행` 타일은 **피드가 있어야 그려진다** — B 를 고르면 그 칸을 못 닫는다.
> **A 를 고르시면 §4 두 번째 칸을 `member_state='cohort'(QA 차수 소속에 의한 산출)` 로 정정**해
> 주시면 된다. 무응답 시 **아무것도 만들지 않고 대기**한다.

> **덧붙임** — `[QA]` 접두 차수가 `kind='seminar'` 라는 것은 **`/recruit` 공개 집계와 무관**하다.
> `cohort_seats_taken` 은 **코드 단위**이고 공개 노출은 `ZR4KB` 뿐이다(발주 §0.2). 오염은 구조적 0 그대로다.

---

## 2. 검증 시나리오 표 (초안)

**F-3 잔여**가 먼저고, 나머지는 **F-5 에서 재사용할 인증 뒤 화면 목록**이다.

### 2.1 F-3 게이트 잔여 — 이번에 닫을 칸

| # | 화면 | 계정 | 폭 | 무엇을 본다 | 판정 |
|---|---|---|---|---|---|
| 1 | `/home` (시안 B) | qa-user | 390 | 로고 + **햄버거만**(로그인 버튼 없음) · 역할 카드 · 바로가기 2×2 · 소식 · `MemberHome` | 실기기(최박사 폰) |
| 2 | `/home` | qa-user | 1280 | 같은 골격 · 480px 셸 | 브라우저 |
| 3 | **시트 E** | qa-user | 390 | 햄버거 → 시트 · 기수 배지 · **회차 칩**(완료·진행·잠금) · 그룹 4 | 실기기 |
| 4 | 시트 **focus trap** | qa-user | 1280 | Tab 이 시트를 벗어나지 않음 · **ESC 닫힘** · 바깥 탭 닫힘 · 닫은 뒤 **초점 복귀** | 브라우저(키보드) |
| 5 | **콘솔 사이드바** | qa-coach | **1280(lg↑)** | 좌측 고정 250px · 현재 항목 `aria-current` | 브라우저 |
| 6 | 콘솔 사이드바 | qa-coach | **768(lg 미만)** | 상단 탭으로 전환 | 브라우저 |

### 2.2 F-5 총검증에서 재사용할 인증 뒤 화면 목록

| 화면 | 계정 | 비고 |
|---|---|---|
| `/home` · 시트 | qa-user | 위 1~4 |
| `/my/cohorts/[id]` (시안 C) | qa-user | 오늘 카드 · 진행 **점 표시**(막대 아님) · 나의 기록 4행 |
| `/my/cohorts/[id]/checkin/[n]` | qa-user | **QA 차수 회차에만** 쓴다(§0.2 금지 ②) |
| `/my/cohorts/[id]/journey` | qa-user | 되비추기 |
| `/home/assessments` (시안 F) | qa-user | 두 계열 · 상태 **낱말** · 열람 고지 |
| `/feed` | qa-user | **A안일 때만** 검증 가능(§1.3) |
| `/my/values` · `/my/cohorts/[id]/values` | qa-user | 가치 카드 |
| `/coach` · `/coach/cohorts` · `/coach/cohort/[id]` | qa-coach | 콘솔 골격 |
| `/coach/cohort/[id]/checkin` · `/matrix` · `/group` | qa-coach | **QA 차수만** |
| `/account` | 둘 다 | 내 정보 · 로그아웃 |
| `/admin` · `/admin/approvals` | — | **QA 계정으로 열지 않는다**(admin 없음) |

---

## 3. 최박사용 화면 단위 절차서

**클코1은 DB 를 직접 쓰지 않는다**(발주 §3-1). 아래는 전부 기존 화면이다.
`https://future.yebom.org` 기준이고, 각 단계 끝에 **확인할 것**을 적었다.

### 3.1 계정 둘 만들기 (약 5분)

1. **로그아웃 상태**로 `/signup` 을 연다(다른 브라우저 또는 시크릿 창 — 최박사 admin 세션과 섞이지 않게).
2. `qa-user` 를 만든다.
   - 이메일: `qa.user@…`(수신 가능한 주소) · **비밀번호는 최박사만 안다**
   - 가입 경위 칸에 **`QA 검증 전용`** 이라 적는다 — 승인 큐 표에 그대로 뜬다
3. 같은 방식으로 `qa-coach` 를 만든다.
4. **확인** — 두 계정으로 로그인하면 `/pending` 안내가 뜬다(아직 승인 전이라 정상).

### 3.2 승인 둘 (약 3분)

1. 최박사 계정으로 로그인 → **`/admin/approvals`**.
2. 표에서 `qa-user` 행을 찾는다(열: `신청자` · `계정 이메일` · `포럼 가입 이름 · 연락처` · `가입 경위` · `신청일` · `처리`).
3. **`근거 메모`** 칸에 **`QA 검증 전용`** 을 적는다 — **필수**(발주 §1).
   `유효기간` 은 화면 기본값 그대로 둔다.
4. **승인**을 누른다. `qa-coach` 도 같게 한다.
5. **확인** — 목록에서 두 행이 사라지고, 두 계정으로 로그인하면 `/home` 이 열린다.

### 3.3 `qa-coach` 에 코치 권한 (약 1분)

1. **`/admin`** 에서 멤버 목록의 `qa-coach` 를 찾는다.
2. 역할을 **`coach`** 로 바꾼다(`set_user_role` — 자가승격 방지 가드 그대로, **admin 만** 할 수 있다).
3. **확인** — `qa-coach` 로 로그인하면 홈 역할 카드가 **`인도자 콘솔`** 을 가리킨다.

### 3.4 QA 전용 차수 신설 (약 3분)

**`qa-coach` 계정으로** 로그인해 만든다 — 그래야 그 차수의 **소유 코치**가 된다(발주 §1).

1. **`/coach/new`** 를 연다. 3단계 마법사다.
2. **1단계 `차수 이름을 정해 주세요`** — **`[QA] 검증 전용`** 이라 적는다.
   접두 `[QA]` 는 실기수 목록과 한눈에 갈리라고 발주가 정한 것이다. **`다음`**.
3. **2단계 `정원과 소개`** — 정원은 그대로(또는 `5`), `소개` 는 **`QA 검증 전용 차수입니다.`**. **`다음`**.
4. **3단계** — 생성되면 **코드**가 나온다. 그 코드를 클코1에게 알려 준다(**비밀이 아니다**).
5. **확인** — `/coach/cohorts` 에 `[QA] 검증 전용` 이 보인다.

> **`kind` 는 건드리지 않는다** — 기본값 `seminar` 가 그대로 맞다(§1.2).
> 화면에 `kind` 를 바꾸는 자리는 **없고**, 없는 것이 정상이다.

### 3.5 `qa-user` 를 QA 차수에 등록 (약 2분)

1. **`qa-user` 계정으로** `/join` 을 연다.
2. 3.4 에서 받은 **QA 차수 코드**를 넣는다. 미리보기에 `[QA] 검증 전용` 이 뜨는지 본다.
3. **`들어가기`** → 사전 체크를 마친다(회차 칩·여정 진단 검증에 필요하다).
4. **확인** — `/home` 역할 카드가 `[QA] 검증 전용` 배지를 단다.

> **실기수 코드(`ZR4KB`·`HMT7Z`)를 넣지 않는다** — 발주 §0.2 금지 ①.

### 3.6 회차 일정 넣기 (약 3분) — 시트 회차 칩 검증에 필요

1. **`qa-coach`** 로 `/coach/cohort/{QA차수}` → 회차 일정 화면.
2. 6회차를 만든다. **1~2회차는 이미 열린 날짜, 3회차 이후는 미래 날짜**로 둔다 —
   그래야 시트에서 **완료·진행·잠금 세 상태가 한 번에** 보인다.
3. **확인** — `qa-user` 홈의 시트를 열면 칩이 `● 2 3 4 5 6` 꼴로 갈린다.

### 3.7 `.env.local` 입력 (약 1분)

클코1 작업 PC의 `c:\dev\futurenow\site-v2\.env.local` 끝에 **직접** 붙인다:

```
QA_USER_EMAIL=...
QA_USER_PASSWORD=...
QA_COACH_EMAIL=...
QA_COACH_PASSWORD=...
```

**클코1은 이 값을 출력·로그·커밋·보고서에 싣지 않는다.**
노출이 의심되면 Supabase 대시보드에서 비밀번호를 재설정하면 끝이다(발주 §0.3).

---

## 4. 클코1 확인 목록 (계정이 만들어진 뒤)

### 4.1 자격·상태 — 값은 적지 않고 **판정만** 적는다

| # | 확인 | 방법 | 기대 |
|---|---|---|---|
| 1 | 두 계정 로그인 | env 자격으로 로그인 | 성공 · `/home` 착지 |
| 2 | `member_state` | 로그인 후 `/home/assessments` 접근 | `/pending` 으로 튕기지 **않는다** |
| 3 | QA 차수 소속 | `/home` 역할 카드 배지 | `[QA] 검증 전용` |
| 4 | **실기수 소속 0** | 아래 §4.2 쿼리 | `ZR4KB`·`HMT7Z` 소속 **0행** |
| 5 | `qa-coach` 역할 | `/coach` 접근 | 콘솔 열림 |
| 6 | `qa-user` 콘솔 차단 | `qa-user` 로 `/coach` | 게이트가 막는다 |

### 4.2 오염 0 실측 — **전후 대조**(발주 §4)

작업 **전에 한 번, 후에 한 번** 재고 **같은지**만 본다.

```sql
-- ① 공개 집계 — /recruit 이 노출하는 유일한 값
SELECT public.cohort_seats_taken('ZR4KB');

-- ② 실기수 세 표 행 수
SELECT
  (SELECT count(*) FROM public.checkins   c JOIN public.cohorts x ON x.id=c.cohort_id
     WHERE x.code IN ('ZR4KB','HMT7Z')) AS checkins,
  (SELECT count(*) FROM public.feed_posts f JOIN public.cohorts x ON x.id=f.cohort_id
     WHERE x.code IN ('ZR4KB','HMT7Z')) AS feed_posts,
  (SELECT count(*) FROM public.value_assessments v JOIN public.cohorts x ON x.id=v.cohort_id
     WHERE x.code IN ('ZR4KB','HMT7Z')) AS value_rows;

-- ③ QA 계정이 실기수에 붙지 않았는지 — **0 이어야 한다**
SELECT count(*) FROM public.enrollments e
  JOIN public.cohorts x ON x.id = e.cohort_id
  JOIN public.users   u ON u.id = e.user_id
 WHERE x.code IN ('ZR4KB','HMT7Z') AND u.email LIKE 'qa.%';
```

> **표 이름 셋을 실측했다**(기억으로 적지 않는다) — `checkins`(53행) · `feed_posts`(3행) ·
> **`value_assessments`**(0행) 전부 실재한다. `values_assessments`(복수형)는 **없다** —
> 그쪽으로 적었으면 쿼리가 조용히 틀렸을 것이다.
> `cohort_seats_taken(p_code)` 도 호출해 응답을 확인했다(값은 적지 않는다 — 전후 대조에만 쓴다).

### 4.3 그리고 하지 않는 것

- 실기수 피드·갈무리 **열람 시도 0** — 소속이 없어 구조적으로 막히지만 **우회하지 않는다**(§3-5)
- `cohort_seats_taken` 노출 코드 **무접촉**(§3-2)
- DB 직접 쓰기 **0**(§3-1)

---

## 5. 판단 필요 · 대기

| # | 항목 |
|---|---|
| 1 | **§1.3 — `kind` A안(권장) / B안.** A면 §4 두 번째 칸 문구 정정, B면 `service_role` 단건 SQL 승인. **무응답 시 아무것도 만들지 않고 대기** |
| 2 | 최박사 절차서 수행(§3) — 그 뒤에 §4 를 돌린다 |
| 3 | 골드 대비 A안 적용 — **F-5 전 별도 소커밋**(지휘부 지시, 별건) |

---

## 6. 원격 확인

*(회신에 `git ls-remote origin feat/site-v2-4` 실행 출력을 붙인다.)*
