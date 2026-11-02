# 기존 사후 AI 해석 조건부 교체 — 실행 지시서

대상: `CC_ORDER_postcheck_v2.md` S4-5. 재검토 보완 B5~B8을 포함한다.
이 문서는 실행 절차이며 **실행 완료 증거가 아니다**. 현재 실행 상태는 `CC_REPORT_postcheck_v2.md` §5를 따른다.

## 1. 선행 조건

1. 운영 `/api/version`이 production/main이고 **현재 배포 영수증의 전체 병합 SHA**와 일치하는지 기록한다. 그 SHA가 검증된 S4 구현을 포함하는지 Git 이력으로 확인한다. S5·S6 등 후속 배포가 있으면 현재 배포를 검증하며, 과거 S4 SHA로 되돌리는 것을 요구하지 않는다. 다음 QA도 이 현재 운영 SHA에서 수행한다.
2. 지정 QA 계정과 `[QA] 검증 전용` 회기에서 실제 마무리 체크 제출 → 저장된 봉투 → 짝 선택 → 비교 프롬프트 → AI 생성·파싱·저장 → 인도자 재열람을 확인한다.
3. 같은 QA 검증에서 기존 AI가 이미 있으면 재생성하지 않음, 사전 조회 실패 시 잘못된 단독 AI를 저장하지 않음, 인도자 수정·되돌리기의 최신 서버 VM 표시를 확인한다.
4. QA 근거에는 시각(KST), 운영 SHA, QA response ID, paired pre ID, 생성 모델, 저장·재조회 일치 여부를 남긴다. 비밀번호·토큰·답변·AI 본문은 보고서에 넣지 않는다.
5. 이 선행 검증이 미실행이거나 실패하면 **운영 대상 확정·교체를 진행하지 않는다**. 합성 점수의 실제 게이트웨이 호출, 단위 검사, 관리자 로그인은 지정 QA 검증과 구별한다.

## 2. 대상 확정과 백업

QA 통과 후 짧은 읽기 트랜잭션에서 기준 시각을 정한다. 아래 쿼리는 후보와 짝을 찾기 위한 것이며, 반환 원문은 비공개 백업으로만 저장한다.

```sql
select i.id, i.response_id, i.cohort_id,
       i.ai_content, i.ai_model, i.created_at,
       r.user_id, r.created_at as post_created_at,
       p.id as pre_response_id
from public.report_interpretations i
join public.responses r on r.id=i.response_id
join lateral (
  select p.id
  from public.responses p
  where p.instrument_id=r.instrument_id
    and p.cohort_id=r.cohort_id
    and p.user_id=r.user_id
    and p.wave='pre'
    and p.created_at<=r.created_at
  order by p.created_at desc,p.id desc
  limit 1
) p on true
where r.instrument_id='futurenow'
  and r.wave='post'
  and r.user_id is not null
  and r.cohort_id is not null
  and i.cohort_id=r.cohort_id
  and i.coach_content is null
  and i.created_at <= $1::timestamptz
order by r.cohort_id,r.created_at,r.id;
```

대상별 고정 명세에는 다음을 보관한다.

- run ID, 기준 시각, 실행 소스 SHA, 운영 SHA, QA 증거 식별자.
- 해석 id, response id, cohort id, user id, **고정 paired pre id**.
- 기존 `ai_content`, `ai_model`, `created_at` 원값.
- 후보 `ai_content`, `ai_model`, 시도 횟수, 상태와 처리 시각.
- 상태 예: pending, candidate_ready, applied, generation_failed, conflict_skipped, rolled_back.

저장 위치는 **코드 저장소 밖의 접근 제한된 영속 저장소**여야 한다. 로컬 작업용 사본이 있으면 디렉터리 0700·파일 0600으로 제한한다. 임시 디렉터리만 있는 상태에서는 UPDATE를 하지 않는다. 백업을 다시 읽어 대상 수와 각 id/response id/기존 값이 일치하는지 확인한다. 실제 위치는 지휘부에만 전달하고 공개 ADR·보고서에는 비공개 식별자와 검산 완료 여부만 기록한다.

인도자 수정본 제외 수, uncoached 무짝 사후 제외 수, 관계가 맞지 않는 행 수를 별도로 센다. 관계 이상이 있으면 기준을 확인하고 dry-run을 다시 한다. 무짝 사후는 **비교 교체 제외·기존 단독 해석 유지**이며, 새 단독 입력과 같다는 뜻이 아니다. 고정 시각 뒤에 생긴 행은 자동으로 대상에 더하지 않는다.

## 3. 후보 생성 — 실제 코드 재사용

모듈을 로드하기 전에 `git rev-parse HEAD`가 위 QA에서 검증한 **현재 운영 전체 SHA**와 일치하는지 확인한다. 작업 트리가 깨끗해야 하며 채점·프롬프트·파서·짝 선택기에 미커밋 변경이 있으면 후보를 만들지 않는다. QA 이후 새로운 커밋이 운영 배포됐다면 새 운영 SHA에서 QA를 다시 수행하고 실행 checkout도 그 SHA로 맞춘다. 실행 직전에도 운영 SHA·QA 기록 SHA·실행 HEAD의 일치를 확인하여 서로 다른 버전의 검증과 생성을 섞지 않는다.

응답 봉투는 CoreContext `getResponse`/허용된 운영 조회로 읽고, 고정 짝이 아직 동일한지 실제 `selectPairedPre`로 검산한다. 이력은 최신 사전 한 건으로 미리 줄이지 않는다. 불일치는 생성 전에 중단하고 dry-run을 다시 한다.

`src/instruments/futurenow/scoring.ts`의 실제 채점, `report/interpretation.ts`의 실제 입력·프롬프트 선택·파서를 사용한다. 출력이 이미 있는 행을 그대로 반환하는 `generateInterpretation`을 교체 생성용으로 호출하지 않는다.

```ts
const scores = futurenowScoring.score(post.answers, { wave: post.wave });
const prev = futurenowScoring.score(pre.answers, { wave: pre.wave });
const options = { wave: 'post' as const, prev };
const result = await gatewayChat({
  systemPrompt: interpretationSystemPrompt(options),
  messages: [{ role: 'user', content: buildInterpretationInput(scores, options) }],
  temperature: 0.4,
  caller: 'futurenow:postcheck-refresh',
  useCache: false,
});
const candidate = parseInterpretation(result.content);
```

실제 모듈은 기존 Vite와 `vite-tsconfig-paths`의 `ssrLoadModule` 또는 승인된 프로젝트 실행 환경으로 로드한다. 소스에서 프롬프트를 복사해 별도 생성하지 않는다. 파싱 성공과 내용 적합성은 구별한다. 적용 전에 headline·axes·growth의 변화 원인 설명이 참여자가 직접 쓴 근거에 한정됐는지, 현재 돌봄 신호가 없는데 caution을 만들지 않았는지 확인한다. 근거 없는 긍정·부정 추정은 가능성 표현이어도 검증 실패다. 특정 낱말을 기계적으로 삭제하여 통과시키지 않는다. private 명세에 적합한 후보와 모델을 저장한 뒤에만 적용 단계로 이동한다.

게이트웨이·파싱·내용 검증 실패를 합쳐 **한 번만 재시도**한다(대상당 최대 2회). 최종 실패는 generation_failed로 남기고 기존 행을 유지한다. applied 행은 다시 생성하지 않는다. 재시작 때 candidate_ready는 저장한 후보를 재사용한다. 호출 timeout은 실제 `gatewayChat`의 30초 설정을 따른다. 생성은 DB 트랜잭션 밖에서 한다.

## 4. 조건부 적용

한 행씩 짧은 트랜잭션으로 실행한다. SQL 값은 드라이버 파라미터로 넘기며, JSON을 문자열 연결하여 SQL에 삽입하지 않는다.

```sql
begin;
update public.report_interpretations
set ai_content=$3::jsonb, ai_model=$4::text
where id=$1::uuid
  and response_id=$2::uuid
  and coach_content is null
  and ai_content=$5::jsonb
  and ai_model is not distinct from $6::text
returning id,response_id;
-- 1행이면 COMMIT, 0행이면 ROLLBACK 후 conflict_skipped.
-- DB 오류이면 ROLLBACK. 1행 이외의 반환은 성공으로 기록하지 않는다.
```

파라미터 순서: 해석 id, response id, 후보 JSON, 후보 모델, 백업 기존 JSON, 백업 기존 모델. `created_at`, `coach_content`, `edited_by`, `edited_at`은 수정하지 않는다.

UPDATE가 0행이면 인도자 수정·다른 작업과 충돌한 것으로 남기고 **재시도하지 않는다**. 행이 잠긴 동안 값을 읽은 뒤 비교하는 식의 느슨한 절차로 바꾸지 않는다. SQL 조건 자체가 기존 값과 인도자본 부재를 함께 보장해야 한다. DELETE·TRUNCATE·기존 AI null 처리·responses/alerts 변경은 하지 않는다.

COMMIT 후에는 해당 id의 후보와 모델을 다시 읽어 검산한다. 중간 종료 후 재개할 때 현재 값이 이미 저장 후보와 같고 인도자본이 없으면 적용 완료 여부를 복구 기록하고 재생성하지 않는다. 그 밖의 변경은 충돌로 남긴다. 일반 지연 생성의 `save_report_interpretation`은 기존 행을 덮어쓰지 않으므로 늦게 끝난 옛 생성 작업도 이번 후보를 덮어쓰지 못한다.

## 5. 조건부 복구

복구도 같은 고정 대상에 대해서만 한다. 현재 값이 이번 실행의 후보와 정확히 같고 인도자본이 없을 때만 백업값을 복원한다.

```sql
begin;
update public.report_interpretations
set ai_content=$3::jsonb, ai_model=$4::text
where id=$1::uuid
  and response_id=$2::uuid
  and coach_content is null
  and ai_content=$5::jsonb
  and ai_model is not distinct from $6::text
returning id,response_id;
-- 1행이면 COMMIT, 0행이면 ROLLBACK 후 복구 충돌로 별도 기록.
```

이번 파라미터 순서: 해석 id, response id, 백업 기존 JSON, 백업 기존 모델, 이번 후보 JSON, 이번 후보 모델. 코치가 편집했거나 이후 다른 교체가 있으면 강제로 복구하지 않는다.

## 6. 완료 보고

완료한 한 번의 실행마다 대상 n, 교체 a, 생성 실패 f, 충돌 건너뜀 s, 인도자본 제외 수, 무짝 제외 수, 시작·종료 KST, 원격·운영 SHA, 백업 비공개 식별자, 재조회 검산 결과를 적는다. 모든 대상의 처리가 끝났다면 `n=a+f+s`를 검산한다. 중단한 실행은 pending을 별도로 세고 완료라고 보고하지 않는다.

사전 AI가 변경되지 않았는지는 사전 해석의 id/ai/model 해시 집합을 실행 전후 비교하여 확인한다. 코치 수정본도 전후 동일 여부를 검산한다. 원문·실명·비밀키·실제 백업 위치는 공개 보고서에 붙이지 않는다. QA 회기 상태나 일시 변경한 시각이 있다면 원복하고 재조회한다.

