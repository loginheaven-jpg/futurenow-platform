-- 롤백 — `cohort_member_directory` 를 **마스킹 이전 정의로 되돌린다**.
--
-- **먼저 연다.** 되돌릴 길을 열어 두지 않은 변경은 적용하지 않는다(지휘부 규율).
--
-- ★ **아래 본문은 라이브에서 받아 온 것이다**(2026-08-30 · `pg_get_functiondef`).
--   손으로 옮겨 적지 않았다 — 옮겨 적으면 한 글자가 바뀌고, 바뀌어도 아무도 모른다.
--   적용 전 해시: `ef5382c291fe922b3a69c85d7e19fb0a`
--   적용 전 권한: `authenticated=EXECUTE, postgres=EXECUTE, service_role=EXECUTE`
--
-- ★ **인자 수가 바뀌므로 오버로드가 생긴다.** 3인자 판을 먼저 떨어뜨리지 않으면
--   2인자 호출이 어느 것으로 갈지 갈린다. `DROP` 을 먼저 둔다(발주 §2 4)).
--
-- **되돌리는 절차**(보고서에도 적는다):
--   ⑴ 앱을 먼저 되돌린다 — `maskUnnamed` 를 넘기는 호출이 3인자 함수를 부르기 때문이다.
--      **좁히는 변경이므로 코드가 먼저다**(CLAUDE.md §5).
--   ⑵ 이 파일을 적용한다.
--   ⑶ `pg_get_functiondef` 해시가 위 값과 같은지 확인한다.

drop function if exists public.cohort_member_directory(uuid, boolean, boolean);
drop function if exists public.cohort_member_directory(uuid, boolean);

CREATE OR REPLACE FUNCTION public.cohort_member_directory(p_cohort_id uuid, p_only_participants boolean DEFAULT false)
 RETURNS TABLE(user_id uuid, name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.is_cohort_coach(p_cohort_id, auth.uid()) OR public.is_admin(auth.uid())) THEN
    RETURN; -- 빈 결과
  END IF;
  RETURN QUERY
    SELECT u.id, u.name
    FROM public.enrollments e
    JOIN public.users u ON u.id = e.user_id
    WHERE e.cohort_id = p_cohort_id
      AND (NOT p_only_participants OR u.role = 'user');
END;
$function$;

-- 권한을 **옛것에서 읽어 그대로** 되돌린다. `DROP+CREATE` 는 권한을 승계하지 않는다 —
--   서가 A 에서 `service_role` 이 빠졌던 그 형태다.
-- ★ **`public` 과 `anon` 을 두 겹으로 걷는다.** `revoke … from public` 은 PUBLIC 만 걷고,
--   이 프로젝트는 **함수에도 default privileges 가 있어 `anon=X` 가 자동으로 붙는다**.
--   한 겹만 걷으면 옛 ACL(authenticated·postgres·service_role)과 갈린다 —
--   **예행이 그것을 잡았다**(롤백 후 anon 이 붙어 있었다). 서가 B 에서 겪은 그 형태다.
revoke all on function public.cohort_member_directory(uuid, boolean) from public;
revoke all on function public.cohort_member_directory(uuid, boolean) from anon;
grant execute on function public.cohort_member_directory(uuid, boolean) to authenticated, service_role;
