# 가치 발견 앱 — 퓨처나우 이식 지시서 (최종본 v3)

수신 : 클로드코드1
발신 : 지휘부
대상 저장소 : `loginheaven-jpg/futurenow-platform`
기준 커밋 : `4e4d759`
이식 원본 : `loginheaven-jpg/value`
선행 문서 : `docs/reports/2026-08-19-VALUE_APP_MIGRATION-검토.md` · `docs/reports/2026-08-19-VALUE_APP_MIGRATION_v2-검토.md`
판정 : **v2 폐기. 본 문서로 대체한다.**

---

## 0. 재검토서에 대한 판정

착수 차단 3건은 전면 수용한다. 특히 B-1은 명백한 지휘부 오류다. `grant select, insert, update`를 쓴 것은 이 프로젝트의 default privileges를 몰랐기 때문이며, 실측대로 `create table`만으로 authenticated가 이미 전 DML을 갖는다. 필요한 것은 GRANT가 아니라 REVOKE였고, 3주 전 갈무리(ADR-80)에서 같은 상황에 이미 그 결정이 내려져 있었다.

| 구분 | 항목 |
|---|---|
| **전면 수용 (9)** | B-1 · B-2 · B-3 · R2-1 · R2-2 · R2-3 · R2-4 · R2-5 · R2-6 |
| **재반박 (3)** | R2-7 · R2-9(부분) · S2-9 — 사유 §12 |
| **조건부 수용 (4)** | S2-4 · S2-5 · S2-8 · S2-10 — 조건 §12 |
| **그 외 보완** | 전면 수용, 본문 반영 |

클코1이 자기 v1 검토의 오류 2건(GRANT 권고, `client_request_id UNIQUE` 권고)을 스스로 정정한 것을 확인했다. 정정을 수용한다.

---

## 1. 지휘부 결정 회신 (Q8~Q11)

| # | 결정 |
|---|---|
| **Q8 계약 확장** | **승인.** `CoreContext`에 3종 추가. V-3.5 계약 슬라이스 신설, 착수 전 델타 보고 |
| **Q9 쓰기 경로** | **갈무리 D1(DEFINER RPC 전용)을 따른다. 예외 없음** |
| **Q10 성찰 질문** | **전용 40장 유지 + 공통 3개 병행.** 전용은 금지어 제거만, 전면 재작성은 후순위 |
| **Q11 2차 개방 게이트** | **게이트를 걸지 않는다.** 안내 문구로 대체 |

Q1~Q7은 v2 §1에서 회신했고 변경 없다. Q5(워크북 문구 출처)는 여전히 미결이며 §5-2 문자열을 정본으로 삼는다.

---

## 2. 사용 구조 — 2단계 (v2에서 유지)

이 앱이 하는 일은 성격이 다른 두 가지다. 72장을 훑어 후보를 넓게 잡는 일은 맥락이 필요 없고, 후보를 3개로 좁히는 일은 맥락이 필수다.

```
[1차 · 1회차 이전, 집에서 10~15분]
  안내 → 카드 5화면(72장) → 정리 화면 → 후보 8~12개 → 저장·종료

[2차 · 1회차 진행 중, 7~8분]
  이어하기 → 1차 결과 표시 → 5개 → 쌍대비교 10회 → 최종 3개
  → 내 말로 바꾸기 → 대조·판정 → 결과
```

2차 진입 시 1차 결과를 그대로 보여준다. 참여자가 **자기 선택의 변화를 목격하는 것**이 이 구조의 핵심 효과다.

### 2-1. 2차 개방 — 게이트 없음 (Q11)

시스템 게이트를 걸지 않는다. 사유는 §12-1에 적었다. 대신 2차 첫 화면 상단에 안내 한 줄을 둔다.

> 여기서부터는 1회차 모임에서 인도자와 함께 하십시오.

진행은 막지 않는다. 1차 직후 이어서 하는 참여자는 대조 화면에서 건너뛰기를 누르며, 그것은 §6-3의 정상 경로다.

### 2-2. 1차 미완료자 (S2-9 재반박 반영)

2차 시점에 1차 미완료자가 오면 **1차를 정상 진행한다.** 단축 경로를 만들지 않는다. 현장 시간이 부족하면 인도자가 다음과 같이 안내한다.

> 오늘 저녁에 마치시고, 다음 시간에 이어가겠습니다.

배열을 두 벌 만들지 않으므로 §4-1의 고정 배열 전제가 유지된다.

---

## 3. 데이터 설계 (전면 재작성)

### 3-1. 테이블

```sql
-- supabase/migrations/[timestamp]_value_assessments.sql

create table public.value_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  card_set_version text not null default 'v1',

  -- 진행 상태 (R2-1)
  stage text not null default 'exploring'
    check (stage in ('exploring','candidates','finalists','final')),

  -- 진행 버퍼 : 현재 화면·선택 집합·쌍대비교 승수·비교 인덱스 (R2-1)
  progress jsonb not null default '{}'::jsonb,

  -- 1차 결과 : 후보 카드 id 배열 (S2-6)
  candidates jsonb,

  -- 2차 결과 : 최종 3개 (카드 id)
  value1_id int, value2_id int, value3_id int,
  value1_label text, value2_label text, value3_label text,

  -- 대조 (R2-8)
  wb_peak text, wb_strength text, wb_longing text,
  alignment text check (alignment in ('aligned','different','unsure','skipped')),

  -- 계측 (R2-1)
  stage1_completed_at timestamptz,
  stage2_started_at timestamptz,
  finalized_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, cohort_id)
);

create index value_assessments_cohort_idx on public.value_assessments (cohort_id);
```

**v2 대비 변경**

| 변경 | 사유 |
|---|---|
| `instrument_id` 제거 | S2-4 조건부 수용. 상수라 UNIQUE 기여 0, `cohort_id`가 차수를 특정, 테이블 분리로 격리 달성 |
| `client_request_id` 제거 | S2-3. 1행 upsert 모델에서 무효 |
| `stage` 2값 → 4값 | R2-1 |
| `progress jsonb` 추가 | R2-1. 화면 이동마다 증분 저장 |
| `value1~3` → `value1_id~3_id` (int) | S2-6. 카드 id로 통일, `card_set_version`이 해석에 쓰임 |
| `alignment`에 `'skipped'` 추가 | R2-8 |
| 계측 타임스탬프 3종 | R2-1. 단계별 이탈률 산출 |

`candidates`는 **카드 id 정수 배열**로 정의한다. 예: `[3, 17, 24, 31, 45, 58, 61, 70]`

`cohorts` 참조는 `cascade`를 유지한다(S2-5 조건부). `user_id`가 `not null`이라 `set null` 불가하며, 차수 삭제 시 소멸 방침을 ADR 본문에 사유와 함께 남긴다.

### 3-2. 권한 — REVOKE + DEFINER RPC (B-1)

이 프로젝트는 default privileges로 신규 public 테이블에 authenticated 전권을 자동 부여한다. 따라서 GRANT가 아니라 **REVOKE**가 필요하다.

```sql
alter table public.value_assessments enable row level security;

grant select on public.value_assessments to authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.value_assessments from authenticated;
revoke all on public.value_assessments from anon;
```

`truncate`를 반드시 회수한다. RLS 적용 대상이 아니므로 회수하지 않으면 로그인 사용자 누구나 테이블을 비울 수 있다.

### 3-3. RLS 정책 (방어 심층)

쓰기는 RPC로만 이뤄지지만 정책도 함께 건다.

```sql
-- 본인 + 멤버 게이트 (B-1 ③)
create policy value_assessments_insert_own
  on public.value_assessments for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_cohort_member(cohort_id, auth.uid())
  );

create policy value_assessments_update_own
  on public.value_assessments for update to authenticated
  using (
    user_id = auth.uid()
    and public.is_cohort_member(cohort_id, auth.uid())
  )
  with check (
    user_id = auth.uid()
    and public.is_cohort_member(cohort_id, auth.uid())
  );

create policy value_assessments_select
  on public.value_assessments for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_cohort_coach(cohort_id, auth.uid())
    or public.is_admin(auth.uid())
  );
```

`is_cohort_member` 게이트가 쓰기 정책에 반드시 들어간다. 없으면 비멤버가 남의 차수에 행을 심고, 그 차수 코치에게 낯선 사람의 서술 원문이 열린다.

### 3-4. DEFINER RPC 3종 (Q9)

```sql
-- 진행 저장 (1차·2차 공통, 증분)
create or replace function public.value_save_progress(
  p_cohort_id uuid, p_stage text, p_progress jsonb, p_candidates jsonb
) returns public.value_assessments
language plpgsql security definer set search_path = public as $$ ... $$;

-- 최종 3개 확정 (선저장)
create or replace function public.value_finalize(
  p_cohort_id uuid, p_v1 int, p_v2 int, p_v3 int
) returns public.value_assessments
language plpgsql security definer set search_path = public as $$ ... $$;

-- 라벨·대조 증분 갱신
create or replace function public.value_patch(
  p_cohort_id uuid, p_labels jsonb, p_wb jsonb, p_alignment text
) returns public.value_assessments
language plpgsql security definer set search_path = public as $$ ... $$;
```

각 함수는 다음을 **서버에서 강제**한다.

| 강제 항목 | 내용 |
|---|---|
| 멤버 검증 | `is_cohort_member(p_cohort_id, auth.uid())` 아니면 예외 |
| 소유 강제 | `user_id`는 항상 `auth.uid()`. 인자로 받지 않는다 |
| `cohort_id` 이전 금지 | 기존 행의 `cohort_id`와 다르면 예외 |
| 개수 규칙 | `candidates` 8~12, 최종 3개 |
| `stage` 전이 | 역행 금지 (`final` → `exploring` 불가) |
| 확정 후 잠금 | `finalized_at`이 있으면 `value*_id` 변경 불가 |

모든 함수에 다음 두 줄을 붙인다. 저장소 관례다.

```sql
revoke all on function public.value_save_progress(...) from public;
grant execute on function public.value_save_progress(...) to authenticated;
```

### 3-5. 트리거

`updated_at` 자동 갱신 트리거를 단다. 저장소 기존 패턴을 따른다.

### 3-6. 참여자 이동·삭제 경로 개정 (R2-6)

V-3 마이그레이션에 세 함수의 개정을 함께 싣는다.

| 함수 | 처리 |
|---|---|
| `participant_move` | `value_assessments.cohort_id`도 함께 이동 |
| `remove_cohort_member` | 해당 행 삭제 |
| `deleteMember` | 계정 cascade로 처리(기존 동작 확인만) |

ADR-73/87의 기존 판단을 본으로 삼는다.

---

## 4. 화면 흐름

### 4-1. 카드 노출

1. 72장을 카테고리가 고르게 섞이도록 **고정 배열**한다(참여자별 셔플 아님). `core/response/ordering.ts` 제약 셔플 선례를 따른다.
2. 15/15/14/14/14로 잘라 5화면. 제목은 주제어 없이 진행 표시만(`1 / 5`).
3. 탐색 중 **상한 없음.**
4. 5화면 이후 **정리 화면 한 장.**

**카테고리는 참여자 표면에 렌더하지 않는다** (R2-10 ①). 원본 `ValueCard.tsx`가 카드마다 `#{category}`를 출력하는데, 이를 제거하지 않으면 §4-1의 목적이 72번 무력화된다. 데이터에는 남기되 화면에 노출하지 않는다.

**카드 설명은 반드시 유지한다.** 탭하면 펼쳐지는 한 줄 설명(`description`)이 없으면 유사어 혼동이 커진다.

### 4-2. 개수 규칙 — 도달 불가 해소 (R2-2)

**(B)안 채택**: 정리 화면에서 미선택 카드를 다시 열어 **추가**할 수 있게 한다. 상한 없는 탐색이라는 §11-1 처방과 결이 같다.

| 화면 | 하한 | 상한 |
|---|---|---|
| 카드 5화면 | 없음 | 없음 |
| 정리 화면 | **8** (다음 단계 하한과 일치) | 없음 — 안내만 |
| 후보 좁히기 | 8 | 12 초과 시 안내만 |
| 5개 고르기 | 5 고정 | 5 고정 |
| 최종 | 3 고정 | 3 고정 |

**§4-2의 하한 수와 §5-2 문안의 수를 한 쌍으로 맞춘다.** 정리 화면 하한을 8로 내리고, 문안도 "8~25장"이 아니라 아래 §5-2대로 쓴다. 12·13·14를 고른 참여자에게 게이트는 열리는데 문구는 15를 요구하던 v2의 불일치를 해소한다.

### 4-3. 진행 표시

`STEP_CONFIGS` 배열을 쓰지 않는다. §2의 2단계 구조를 기준으로 새로 정의한다.

---

## 5. 참여자 문안

### 5-1. 준수 사항

| 금지 | 대체 |
|---|---|
| '워크북' | '오늘 찾으신 것' (§5-2 참조) |
| '진단' | '가치 카드' |
| '충분합니다', '괜찮습니다', '~하셔도 됩니다' | 축 1에 따라 허락 어휘 제거 |
| '선택 사항입니다' | 값을 말하는 문안으로 대체 (축 2) |
| 책 페이지 본문 삽입 | 문장 끝 괄호로만 |
| **'존재가치' 버튼 라벨** | `identity_sentence`가 이미 "존재가치 선언문"이다. 이 앱은 그 **첫 칸의 재료**이므로 '가치 카드'로 통일 |

명칭은 `src/app/_vocab/tool.ts` 원장에 등재한다(S2-1, ADR-107).

### 5-2. 단계 문구 정본 — 시점 교정 (R2-3)

**v2 문안이 시점을 틀렸다.** 2차는 1회차 진행 중인데 "지난 시간에"라고 썼다. 1회차는 첫 회차이므로 참여자에게 '지난 시간'이라는 지시 대상이 없다.

`copy.ts`에서 **1차용·2차용 문자열을 `stage`별로 분리**한다.

**1차 (미래형이 참)**

| 화면 | 문구 |
|---|---|
| 안내 | "마음이 끌리는 가치를 찾아 나섭니다. 1회차 모임 전에 마쳐 주십시오." |
| 카드 5화면 | "마음이 더 끌리는 카드를 골라 주십시오. '이게 중요한 게 맞지' 하는 생각은 내려놓으십시오." |
| 정리 화면 | "고르신 카드를 한눈에 놓았습니다. 빠진 것이 있으면 더하시고, 여기서 8~12장으로 좁혀 주십시오." |
| 후보 확정 | "이것이 없으면 내 존재가 희미해진다 싶은 것을 남겨 주십시오." |
| 종료 | "여기까지입니다. 나머지는 1회차 모임에서 이어갑니다." |

**2차 (현재형)**

| 화면 | 문구 |
|---|---|
| 이어하기 | "지난번에 남기신 카드입니다. 오늘 찾으신 것과 나란히 놓고 보십시오." |
| 5개 고르기 | "다른 것을 희생해서라도 끝까지 지키고 싶은 5장을 골라 주십시오." |
| 쌍대비교 | "둘 중 하나만 남긴다면 어느 쪽입니까?" |
| 최종 3개 | "당신의 삶을 이끄는 세 가지를 골라 주십시오." |
| 대조 헤더 | "**오늘 찾으신 것**을 여기 옮겨 주십시오. 한 단어로 적으십시오." |
| 대조 라벨 | "**오늘 찾으신 것**" |
| '다릅니다' 응답 | "어긋남은 이 작업의 재료입니다. 머리로 고른 가치와 삶이 증명한 가치가 다르다는 뜻이니, 어느 쪽이 진짜인지 **오늘 남은 시간에** 한 번 더 보십시오." |
| 라벨 안내 | "여기 적으신 문장이 **오늘 쓰실** 존재가치 선언문의 첫 칸이 됩니다." |

**1차 이어하기 문구의 '지난번'은 유효하다.** 1차와 2차 사이에 실제 시간 간격이 있기 때문이다. 금지된 것은 같은 회차 안에서 '지난 시간'이라 부르는 것이다.

### 5-3. 프라이버시 고지 (R2-5)

§6-1 입력 화면과 §7 라벨 화면 하단에 고지를 넣는다. 문안 원칙 §3이 지정한 축 1 **예외** 자리이므로 갈무리 기존 문자열의 형태를 따른다.

> 적으신 내용은 인도자와 운영자가 읽습니다.

---

## 6. 대조 화면 (2차 전용)

### 6-1. 입력

```
오늘 찾으신 것을 여기 옮겨 주십시오. 한 단어로 적으십시오.

  존재감이 가장 높았던 순간    [                    ]
  그때 드러난 나의 강점        [                    ]
  상처 뒤에서 찾은 나의 갈망    [                    ]

  [ 다음 ]            [ 아직 못 찾았습니다 — 건너뛰기 ]

  적으신 내용은 인도자와 운영자가 읽습니다.
```

- `maxLength=20`, 한 줄 input만. textarea 금지.
- 건너뛰기 버튼은 '다음'과 **동등한 시각적 비중.**
- 허락 문구("선택 사항입니다")를 쓰지 않는다.

### 6-2. 정합 판정 — 빈 값 규칙 (R2-8)

세 규칙을 정본으로 한다. 되비추기 블록의 `empty` 슬롯 처리(`checkin/slots.ts`)와 동형이다.

| 상태 | 처리 |
|---|---|
| 셋 다 빔 | **화면 자체를 건너뛴다.** `alignment='skipped'` 기록 |
| 앵커(봉우리)가 빔 | 되비추지 않는다. 판정 화면 미표시, `alignment='skipped'` |
| 일부만 있음 | 있는 것만 인쇄하고 판정을 묻는다 |

판정이 표시되는 경우:

```
오늘 찾으신 것        봉우리: ○○ · 강점: ○○
가치 카드에서 찾은 것   ○○ · ○○ · ○○

이 둘이 같은 곳을 가리킵니까?
[ 같습니다 ]  [ 다릅니다 ]  [ 아직 모르겠습니다 ]
```

**판정은 사용자가 한다.** 문자열 유사도 등 자동 판정을 넣지 않는다.

### 6-3. 운영 지표

`alignment='different'`를 결함 지표로 쓰지 않는다. 어긋남은 워크의 재료다. 지표로는 **건너뛰기율**(`alignment='skipped'` 비율)과 **단계별 이탈률**(`stage`·계측 타임스탬프로 산출)을 쓴다.

---

## 7. 내 말로 바꾸기 (2차)

최종 3개 확정 직후 배치한다.

```
세 단어를 당신의 말로 바꿔 적으십시오.
여기 적으신 문장이 오늘 쓰실 존재가치 선언문의 첫 칸이 됩니다.

  성장    →  [                              ]
  가족    →  [                              ]
  정직    →  [                              ]

  적으신 내용은 인도자와 운영자가 읽습니다.
```

예시 가치는 **72장에 실재하는 카드명만** 쓴다(S2-12). '진정성'·'연결'은 없다.

**3칸 중 1칸만 필수로 한다**(S2-10). 같은 1회차에 갈무리 필수 5칸이 있어 현장 디지털 부담이 과하다. 나머지 2칸은 비워도 진행된다.

예시 문구(`어제보다 나아지는 것` 등)는 placeholder로만 노출하고 본문에 인쇄하지 않는다.

---

## 8. `identity_sentence` 연결 (Q7)

1회차 갈무리(`session1.ts`)의 `identity_sentence` 입력란 위에 본인 라벨을 표시한다.

- **자동 입력하지 않는다.** 참여자가 보고 직접 쓴다.
- 표시 문안 : "가치 카드에서 찾으신 세 가지입니다 — ○○ · ○○ · ○○"
- 라벨이 없으면 카드명으로 대체한다.

**배선은 `CoreContext` 계약 메서드를 경유한다.** v2 §8의 "코어를 경유하지 않는다"는 이 저장소 구조에서 실행 불가능한 지시였으므로 삭제한다(B-2).

OPEN_ITEMS #6(1·2회차 마음 칸 통일)과 같은 파일·시간 창을 다투므로, V-10 착수 전 충돌 여부를 확인한다.

---

## 9. 코드 배치 (B-2 반영)

```
src/contracts/
  domain.ts        ← +ValueAssessment 타입
  core-context.ts  ← +getMyValueAssessment / saveMyValueProgress / listCohortValueAssessments

src/core/context.ts ← 위 3종 구현 (DB 접근은 여기서만)

src/instruments/futurenow/values/
  cards.ts        ← values.json → TS 상수 (fetch 제거, 카테고리 비노출)
  ordering.ts     ← 고정 배열
  stages.ts       ← 2단계 구조·개수 규칙
  copy.ts         ← 1차/2차 분리 문안 (회귀 테스트 잠금)
  reflection.ts   ← 성찰 질문 (전용 40 + 공통 3)
  pairwise.ts     ← 쌍대비교 순수 로직 (단위테스트 필수)

src/app/my/cohorts/[cohortId]/values/
  page.tsx        ← 라우트
  actions.ts      ← 서버 액션 (CoreContext 경유, 직접 DB 접근 금지)

src/app/c/[code]/values/
  page.tsx        ← 짧은 공유 경로 (R2-4)
```

**원칙**: 순수 로직·문안·렌더 규칙은 인스트루먼트, **DB 접근은 CoreContext 계약 메서드.** ADR-80 갈무리와 동형이다.

UI는 `core/ui` 컴포넌트와 `design_system.md` 토큰으로 **새로 짠다**(S-5). 셸은 `AppHeader variant='flow'`.

§6-1 단일행 입력·카드 그리드·쌍대비교 2열은 현 design_system에 없으므로 **갱신 슬라이스가 선행한다**(S2-11).

---

## 10. 진입 경로 (R2-4)

**(a) 차수 홈 카드.** `src/app/my/cohorts/[cohortId]/page.tsx`에 카드를 한 장 더 끼운다. 기존 상태별 카드 순서 구조를 따르며, 상태를 셋으로 가른다.

| 상태 | 문구 |
|---|---|
| 1차 미완 | "가치 카드 — 1회차 전에 마쳐 주십시오" |
| 1차 완료·2차 대기 | "가치 카드 — 1회차 모임에서 이어갑니다" |
| 완료 | "가치 카드 — 결과 보기" |

**(b) 짧은 공유 경로.** `src/app/c/[code]/values/page.tsx`. 갈무리 QR 짧은 경로(ADR-80)와 동형으로 구현한다.

```
코드 → 차수 해석 → 미인증 /login?returnTo= 왕복 → 비멤버는 안내로 정지 → 멤버면 /my/cohorts/<uuid>/values
```

**비멤버를 `/join`으로 보내지 않는다**(ADR-89). 링크가 옮겨 다니므로 자기등록 표면을 열지 않는다.

정적 세그먼트 `values`가 `[session]`보다 우선하므로 충돌하지 않는다.

**`safeReturnTo` 화이트리스트에 values 경로를 추가한다**(`src/app/_lib/safeReturn.ts`). 없으면 로그인 경유 진입이 `/home`으로 떨어진다.

---

## 11. 이식 시 제거할 원본 결함

| # | 결함 | 조치 |
|---|---|---|
| 1 | 되돌아가도 승수 미감소 → 이중 계상 | 되돌리기 시 승수 복원 |
| 2 | `/step3` 라우트 부재 | 신규 라우팅으로 해소 |
| 3 | 최종 선택이 `pairwise-results` 삭제 | 상태 보존 |
| 4 | 동점 시 `id` 오름차순 → 메달 임의 | **§11-1 규칙 적용.** 메달 아이콘 미사용 |
| 5 | 진행률 `0 / 10` 시작 | `1 / 10`. 단 새 화면이므로 원본 결함 분류가 아닌 신규 결정으로 기재 |
| 6 | `STEP_CONFIGS` 불일치 | §4-3대로 신규 정의 |
| 7 | 콘솔에 이름·이메일·가치 평문 로그 13곳 | 전량 삭제 |
| 8 | `id === 73` 사문 분기 | 삭제 |
| **9** | **카드 하단 `#{category}` 렌더** | **제거.** §4-1 목적 보전 (R2-10 ①) |
| **10** | **`<Card onClick>` 키보드 조작 불가** | **`role`·`tabIndex`·Space/Enter 핸들러 부여.** design_system §10 준수 (R2-10 ②) |

쌍대비교는 순수 함수로 분리해 단위테스트를 붙인다.

### 11-1. 동점 규칙 (S2-8)

쌍대비교 후 동점이 발생하면 **동순위로 표기하고 참여자가 직접 3개를 고른다.** 시스템이 임의로 자르지 않는다.

```
2승  성장 · 가족        ← 동점
1승  정직
0승  자유 · 도전        ← 동점

이 중 세 가지를 골라 주십시오.
```

---

## 12. 재반박 3건과 조건부 수용 4건

### 12-1. R2-7 (2차 개방 게이트) — 반박

시스템 게이트를 걸지 않는다. 세 가지 이유다.

첫째, **이 앱은 인도자가 현장에서 여는 것이다.** 1회차 진행 중 특정 시점에 인도자가 안내하므로 실질적으로 통제된다.

둘째, **게이트의 부작용이 이득보다 크다.** 결석자·지각자·일정 미등록 차수를 전부 예외 처리해야 하고, 재검토서도 "현장 개시 신호로 대체"하려면 인도자 화면 작업이 생긴다고 인정했다. 한 슬라이스를 더 써서 얻는 것이 "선의에 기대지 않는다"뿐이다.

셋째, **1차 직후 2차를 해도 손해가 없다.** 대조 화면에서 건너뛰기를 누를 뿐이고, §6-2가 그 경로를 정상으로 정의했다.

§2-1의 안내 문구로 대체한다. 비용 0.

### 12-2. R2-9 (성찰 질문) — 부분 반박

숫자 정정(49 키 중 9개 사문 → 실제 40장 80문항)은 수용한다. **"전원 공통 3개로 통일"은 반대한다.**

§11-2의 논거("최종 3개에만 붙는다, 현장에서 인도자와 함께 다뤄진다")는 **"32장을 새로 채우지 않아도 된다"**는 뜻이었지 **"있는 것도 버리자"**는 뜻이 아니었다. 전용 40장은 이미 존재하며, 버리면 품질이 하향 평준화된다.

"전용/공통 편차가 눈에 보인다"는 지적은 **공통 질문의 품질을 높여** 해소한다. 전용이 구체적이고 공통이 일반적인 것은 자연스럽다.

**조치**: 전용 40장은 유지하되 V-9에서 **금지어 제거만** 한다. 전면 재작성은 후순위 별도 슬라이스. 공통 3개는 품질을 높여 작성한다.

공통 질문 초안:
- "이 가치가 가장 선명하게 드러났던 순간은 언제였습니까?"
- "이 가치를 지키느라 포기한 것이 있습니까?"
- "이 가치가 무너졌을 때 어떤 기분이었습니까?"

### 12-3. S2-9 (단축 경로) — 반박

"정리 화면만 생략" 대안은 채택하지 않는다. 정리 화면은 §4-1 설계의 핵심이며, 상한 없이 탐색한 뒤 한눈에 놓고 줄이는 자리다.

**단축 경로를 아예 없앤다.** §2-2에 반영했다.

### 12-4. 조건부 수용 4건

| # | 조건 |
|---|---|
| S2-4 | `instrument_id`를 `'futurenow'`로 바꾸는 대신 **컬럼 자체를 제거**했다. §3-1 반영 |
| S2-5 | `cohorts` cascade 유지. `user_id not null`이라 `set null` 불가. **ADR에 사유 명시** |
| S2-8 | §11-1에 정본 규칙 수록 |
| S2-10 | 라벨 3칸 중 **1칸만 필수**로 완화. §7 반영 |

---

## 13. 작업 슬라이스

| # | 작업 | 검증 |
|---|---|---|
| V-1 | 인스트루먼트 골격 + 라우트 스캐폴딩 + `safeReturnTo` 추가 | 로그인 후 본문 렌더 확인, 미인증 리다이렉트 목적지 확인, tsc 0 / lint 0 / 테스트 수 |
| V-2 | 카드 TS 상수화 + 고정 배열 + **카테고리 비노출** | 72장·id 1..72 보장 테스트, 배열 내 카테고리 분산, 표면 렌더 0건 |
| **V-3.5** | **계약 확장** (`domain.ts` +타입, `core-context.ts` +3종, `core/context.ts` 구현) | **계약 델타 N + 승인 근거 기재.** Q8 승인 완료 |
| V-3 | 마이그레이션 (테이블 + REVOKE + RLS + RPC 3종 + 트리거 + 이동/삭제 함수 개정) | §13-1 검증 매트릭스 전항 |
| V-4 | design_system 갱신 (단일행 입력·카드 그리드·쌍대비교 2열) | 토큰·컴포넌트 확정, 임의 디자인 0 |
| V-5 | 1차 — 카드 5화면 + 정리 화면(추가 가능) | 화면 전이, 개수 규칙, 설명 펼침, 증분 저장 |
| V-6 | 1차 — 후보 확정 + 이어하기 | `stage` 전이, 재진입 복원 |
| **V-6.5** | **진입 경로** (차수 홈 카드 + `/c/[code]/values`) | 상태별 문구 3종, 비멤버 정지, 미완 화면 노출 여부 판정 |
| V-7 | 2차 — 5개 + 쌍대비교 (결함 10종 해소) | 승수 복원, 동점 표기, 순수함수 단위테스트, **키보드 조작** |
| V-8 | 2차 — 최종 3개 선저장 + 라벨(1칸 필수) | `finalized_at` 기록, 증분 갱신, 확정 후 잠금 |
| V-9 | 2차 — 대조 + 판정 (빈 값 규칙 3종) | 셋 다 빔 → 화면 건너뜀·`skipped`, 앵커 빔 → 미표시 |
| V-10 | 결과 화면 + 성찰 질문(전용 40 금지어 제거 + 공통 3) + 문안 회귀 테스트 | `copyRegression` 통과, 금지어 0건, 시점 문구 검증 |
| V-11 | 코치 열람 화면 | 같은 차수만 표시, 다른 차수 코치 차단 실측 |
| V-12 | `identity_sentence` 프리필 힌트 | 라벨 3개 표시, 자동입력 없음, OPEN_ITEMS #6 충돌 확인 |
| V-13 | `architecture.md` 정합 + **ADR-108 이상** | 문서 정합 DoD 게이트 |

**jsdom 미설치**(S2-2)로 화면 검증이 현 하니스로 불가능하다. V-4에서 설치하거나 검증 방식을 확정해 보고한다.

ADR은 한 개로 담기지 않으므로 **108부터 필요한 만큼** 발행한다.

### 13-1. V-3 검증 매트릭스 (B-3)

읽기 축만으로는 쓰기 구멍이 잡히지 않는다. 아래 전항을 실측한다.

| 축 | 기대 |
|---|---|
| 본인 SELECT | 통과 |
| 타인 SELECT | 차단 |
| 같은 차수 코치 SELECT | 통과 |
| 다른 차수 코치 SELECT | 차단 |
| 운영자 SELECT | 통과 |
| **비멤버 INSERT** | **거부** |
| **`cohort_id` 이전 시도** | **거부** |
| **직접 UPDATE** (`has_column_privilege=false`) | **거부** |
| **`stage` 역행** | **거부** |
| **확정 후 `value*_id` 변경** | **거부** |
| **TRUNCATE 권한** | **없음** |

`tests/rls.integration.test.ts`는 옵트인 하니스다. **실행 커맨드와 통과 출력(SKIP 아님)을 보고에 싣는다.**

---

## 14. 주의사항

- **`web_fetch` 200은 판정 기준이 아니다.** 본문 콘텐츠 확인 + 리다이렉트 목적지 확인으로 검증한다.
- **마이그레이션은 적용 후 수정 금지다.** V-3 착수 전 §3 전체를 재확인한다.
- **가치 카드 72장 문구는 임의 수정하지 않는다.** 72장 전수 검사에서 금지어 0건이 확인되었다.
- **문서 정합은 완료판정 게이트다.** 코드만 푸시하고 문서를 미룬 상태는 작업 미완이다.
- **보고서 파일명 규약** — 슬라이스가 13개라 지시서 슬러그 1:1 규약과 충돌한다. `2026-MM-DD-value-app-V<N>-완료.md` 형식으로 갈음한다.
- **`.gitattributes` 부재로 Windows 클론 시 `recruit.test.ts:258`이 레드**가 난다(CRLF). 감리 시 참고한다.

---

## 15. 미결 사항

Q5(워크북 문구 출처)만 남는다. 워크북 확정본 전달 전까지 §5-2 문자열을 정본으로 삼는다.

**V-1·V-2 즉시 착수 가능. V-3.5는 Q8 승인이 났으므로 계약 델타 보고 후 착수. V-3은 §3 교정본과 §13-1 매트릭스로 진행한다.**
