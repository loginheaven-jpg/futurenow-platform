-- 본부 멤버 운영(삭제·활동) — 운영자 전용 DEFINER RPC 2종. 지휘부 지시 2026-07-03.
--
-- (A) delete_user — 운영자가 임의 멤버 계정을 완전 삭제(하드).
--     auth.users 삭제 → public.users(users_id_fkey ON DELETE CASCADE) → 하위 전부 연쇄:
--       CASCADE 삭제: cohorts(소유 차수)·enrollments·user_profiles·user_contacts·coach_applications
--                     ·groups·group_members·response_drafts  (groups/group_members 는 SAIL 공유 — 영향 지휘부 승인 2026-07-03)
--       SET NULL   : responses·results·report_interpretations.edited_by  (응답 고아 보존 — 불변·집계 유지)
--     즉 코치를 삭제하면 그가 소유한 차수·그 차수의 참여가 함께 사라지고, 그 차수의 응답은 고아화된다.
--     운영자는 삭제 전 멤버 세부(활동)로 영향(소유 차수·응답 수)을 확인한 뒤 삭제한다(인지 삭제).
--     가드: is_admin(운영자) + 자기삭제 금지. auth.users DELETE 권한은 DEFINER(함수 소유자=postgres)로 확보.
CREATE OR REPLACE FUNCTION public.delete_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'cannot delete self'; END IF;
  DELETE FROM auth.users WHERE id = p_user_id; -- cascade: public.users 및 하위 전부(위 주석)
END;
$$;
REVOKE ALL ON FUNCTION public.delete_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user(uuid) TO authenticated;

-- (B) admin_member_activity — 운영자가 멤버 세부(활동)를 조회. 소유 차수·참여 차수·응답 수.
--     신원(이름·이메일·역할=users, 전화=user_contacts[getPhone], 프로필=user_profiles[getProfile])은 기존 게터로 조회.
--     여기선 '활동'만 집계 — users RLS(admin 전체) 밖의 enrollments/responses 를 운영자 시점으로 안전 집계(DEFINER + is_admin 게이트).
CREATE OR REPLACE FUNCTION public.admin_member_activity(p_user_id uuid)
RETURNS TABLE(owned_cohorts text[], enrolled_cohorts text[], response_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  RETURN QUERY
  SELECT
    COALESCE((SELECT array_agg(c.name ORDER BY c.created_at)
              FROM public.cohorts c WHERE c.coach_id = p_user_id), ARRAY[]::text[]),
    COALESCE((SELECT array_agg(c.name ORDER BY e.joined_at)
              FROM public.enrollments e JOIN public.cohorts c ON c.id = e.cohort_id
              WHERE e.user_id = p_user_id), ARRAY[]::text[]),
    (SELECT count(*) FROM public.responses r WHERE r.user_id = p_user_id);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_member_activity(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_member_activity(uuid) TO authenticated;
