# /supabase/migrations

타임스탬프 마이그레이션. **이미 적용된 파일은 절대 수정하지 않는다** — 변경은 항상
새 마이그레이션으로(CLAUDE §5 / architecture §4).

## 거점 확정: SAIL 프로젝트 승격 (2026-06-26)

거점 Supabase = **SAIL 프로젝트** `zdoytzmvcafcebytttrm`(조직 `wrvvgdxquaqpnctzzngx`, 서울).
신규 프로젝트를 만들지 않고 SAIL 프로젝트를 공용 플랫폼 거점으로 승격한다. 같은
`auth.users` 를 퓨처나우와 공유한다(교차 자동 로그인 / ADR-13). 클로드코드3의 SAIL 작업은
동결, 본 프로젝트는 현재 클로드코드1 단독 소관.

> 앞선 "core 스키마 분리"(구 ADR-11)는 **폐기**됐다. 코어는 SAIL 의 기존 `public` 스키마를
> 승격해 재사용한다(ADR-13·15). 그에 따라 구 `core.*` 스캐폴딩 마이그레이션 6종은 삭제했다.

## 이 폴더의 마이그레이션

> **파일명 = 원격 기록 version 정렬됨(2026-06-28).** 과거 `apply_migration` 이 적용 시각으로 version 을
> 기록해 파일명 timestamp 와 어긋났던 것을, 깨끗한 체크아웃에서 `supabase db push` 가 재적용을 시도하지
> 않도록 파일명을 원격 version 에 맞춰 정렬했다. **SQL 내용은 불변 — 파일명만 변경.**

| 파일(=원격 version) | 상태 | 내용 |
|---|---|---|
| `20260626064658_core_platform_upgrade.sql` | **적용됨** | SAIL→플랫폼 승격: `users` 정비(full_name→name·phone 분리)·`user_contacts`·`cohorts`·`enrollments`·`responses`·`alerts`·코어 RLS 헬퍼·전화헬퍼 재지정 |
| `20260626071856_fix_handle_new_user_search_path.sql` | **적용됨** | `handle_new_user` 에 `SET search_path = public` 추가(본문 동일). 어드바이저 0011 보정 |
| `20260626082730_resolve_cohort_meta.sql` | **적용됨** | `resolve_cohort_by_code` 를 UUID→차수 공개 메타(비민감) 반환으로 확장(가입-by-코드, ADR-17) |
| `20260627160855_alerts_dedup.sql` | **적용됨** | 알림 멱등성: `alerts(response_id, reason)` 유니크 인덱스. `raiseAlert` 가 `ON CONFLICT DO NOTHING` 으로 중복 신호 무시(리뷰 발견 high, ADR 픽스) |
| `20260628095509_cohort_member_directory.sql` | **적용됨** | 코치/운영자가 자기 차수 멤버의 `id+name`만 조회(SECURITY DEFINER, 권한 미달 시 빈 결과). `users` RLS 미확대 — ADR-24·plan Q6 |
| `20260628095527_decide_coach_application.sql` | **적용됨** | 코치 신청 결정 RPC: 상태변경 + (승인 시) `user→coach` 원자 승격. 내부 `is_admin`·`FOR UPDATE`·`status='pending'` 가드 — ADR-24 |

SAIL 기존 4종(`initial_schema`·`groups`·`fix_rls_recursion`·`phone_profile`)은 SAIL 레포 소관이며
원격에 이미 적용돼 있다. **이 폴더에 복제하거나 수정하지 않는다.** 본 폴더는 코어 승격 이후의
플랫폼 마이그레이션만 보관한다.

## 규율

- RLS 는 `SECURITY DEFINER` 헬퍼만 호출해 재귀(42P17) 회피(ADR-05). 정책끼리 테이블 직접 참조 금지.
- `responses`·`alerts` 는 불변 — UPDATE/DELETE 정책 없음(ADR-09).
- SAIL 고유 테이블(`results`·`groups`·`group_members`)을 변경·드롭하지 않는다(클로드3 동결 소관).
- 기존 마이그레이션·기존 헬퍼(`is_admin` 등)를 수정·재생성하지 않는다.
- 잠정 가정(plan Q1 미결): 로그인 기반·실명제 → `responses_insert` 가 `auth.uid()` 요구.
  비로그인 허용으로 바뀌면 이 정책을 새 마이그레이션으로 고친다.
