-- 이름 없는 참여자 마스킹 — **DB 안에서 끝낸다**(ORDER ② · ㉯ 방식 · 2026-08-30).
--
-- ★ **왜 DB 인가**: 「가려지지 않은 것이 애초에 브라우저로 가지 않는다.」
--   앱이 이메일 원문을 받아 가리는 것은 **가리려는 것을 먼저 내보내는 순서**다.
--   불변식 13 이 전화를 물리 분리한 것도 같은 논리였다 — **RLS 는 행을 가리지 열을 못 가린다.**
--
-- ★ **기본값이 기존 동작이다**(발주 §2 1)). 호출처 중 **하나만** 옵트인한다(그룹 리포트).
--   호출처 수를 여기 적지 않는다 — **따라가야 하는 값**이라 적는 순간 낡는다(CLAUDE.md §11 ⅰ).
--   세려면 : `rg "listCohortMembers\(" src` · 옵트인은 3인자 호출만 골라 센다.
--   ★ 발주서 §1 이 「일곱」으로 못박은 것이 오류였고(지휘부 확인 2026-08-30) 실측은 아홉이었다.
--     이 줄은 **적용 뒤에 고친 주석**이다 — 원장이 `version`·`name` 만 붙들고
--     `statements` 가 null 이라 내용 해시 드리프트가 없음을 확인하고 고쳤다.
--     **DDL 은 한 글자도 건드리지 않았다**(불변식 15 는 스키마 변경을 막는다).
--   ADR-118 이 `p_only_participants` 를 더할 때 쓴 방식 그대로다 — 선택 인자 + 기본값.
--
-- ★ **이메일 출처는 `public.users` 다**(지휘부 동의). 이 함수가 **이미 그 표를 조인**하고 있어
--   새 표를 끌어오지 않고, `auth` 스키마를 건드리지 않는다 — **우리 소관 밖 스키마**이기 때문이다.
--   전화·주소는 이 경로에 오지 않는다(불변식 13 유지).
--
-- ★ **지금 물 것이 없다**(실측 2026-08-30) — 이름이 빈 실회원 **0명**,
--   실기수(ZR4KB·HMT7Z) 참여자 중에도 **0명**. `futurenowIdentityPolicy` 가
--   `user: { name: 'required' }` 로 폼에서 막고 있기 때문이다.
--   **그래도 두는 이유**: 필수성은 **폼 게이트로만** 강제되고 `users.name` 은 여전히 nullable 이며,
--   운영자 등록·데이터 이관은 폼을 지나지 않는다. **DB 는 빈 이름을 막지 않는다.**
--   이 사실을 여기 적어 둔다 — 나중에 「이 기능이 왜 있나」로 지워지지 않게.
--
-- ★ **인자 수가 바뀌어 오버로드가 생기므로 `DROP` 을 먼저 둔다**(발주 §2 4)).
--   둘이 공존하면 2인자 호출이 어느 것으로 갈지 갈린다.

drop function if exists public.cohort_member_directory(uuid, boolean);

CREATE FUNCTION public.cohort_member_directory(
  p_cohort_id uuid,
  p_only_participants boolean DEFAULT false,
  p_mask_unnamed boolean DEFAULT false   -- 신설 · 기본값이 기존 동작이다
)
 RETURNS TABLE(user_id uuid, name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- 권한 게이트는 **그대로다.** 새 인자가 이것을 우회하지 않는다.
  IF NOT (public.is_cohort_coach(p_cohort_id, auth.uid()) OR public.is_admin(auth.uid())) THEN
    RETURN; -- 빈 결과
  END IF;
  RETURN QUERY
    SELECT u.id,
           CASE
             -- 이름이 있으면 **이름 그대로**. 마스킹은 없을 때만 쓰는 폴백이다.
             WHEN u.name IS NOT NULL AND btrim(u.name) <> '' THEN u.name
             -- 끄면 지금과 완전히 같다 — NULL 이면 NULL 이 나간다.
             WHEN NOT p_mask_unnamed THEN u.name
             WHEN u.email IS NULL OR btrim(u.email) = '' THEN NULL  -- 앱이 「이름 없음」으로 받는다
             ELSE (
               -- 로컬파트(@ 앞)만 본다. **도메인은 표시하지 않는다.**
               --   5자 이상: 앞 4자 + '***'  ·  4자 이하: 전체 + '***'
               --   ★ 4자는 **아래쪽**이다(전체 + '***'). 두 규칙의 결과가 같아 실질 차이는 없으나
               --     경계를 여기 못 박아 둔다 — 갈리면 잠금이 먼저 운다.
               CASE
                 WHEN char_length(split_part(u.email, '@', 1)) >= 5
                   THEN left(split_part(u.email, '@', 1), 4) || '***'
                 ELSE split_part(u.email, '@', 1) || '***'
               END
             )
           END
    FROM public.enrollments e
    JOIN public.users u ON u.id = e.user_id
    WHERE e.cohort_id = p_cohort_id
      AND (NOT p_only_participants OR u.role = 'user');
END;
$function$;

-- 권한을 **옛것 그대로** 새 시그니처에 다시 건다(발주 §2 4)).
--   `DROP+CREATE` 는 권한을 승계하지 않는다. 옛 ACL: authenticated · postgres · service_role.
-- ★ **`public` 과 `anon` 을 두 겹으로 걷는다.** `revoke … from public` 은 PUBLIC 만 걷고,
--   이 프로젝트는 **함수에도 default privileges 가 있어 `anon=X` 가 자동으로 붙는다**.
--   한 겹만 걷으면 옛 ACL(authenticated·postgres·service_role)과 갈린다 —
--   **예행이 그것을 잡았다**(롤백 후 anon 이 붙어 있었다). 서가 B 에서 겪은 그 형태다.
revoke all on function public.cohort_member_directory(uuid, boolean, boolean) from public;
revoke all on function public.cohort_member_directory(uuid, boolean, boolean) from anon;
grant execute on function public.cohort_member_directory(uuid, boolean, boolean) to authenticated, service_role;
