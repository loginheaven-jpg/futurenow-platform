-- 롤백 — 워크북 사진(ADR-197) 이전 모양으로 되돌린다.
--
-- **먼저 연다.** 되돌릴 길을 열어 두지 않은 변경은 적용하지 않는다(지휘부 규율).
-- 정책·RPC 본문은 `20260802100000_move_checkins_and_photos.sql` 의 모양 그대로다.
--
-- 순서: **코드를 먼저 되돌리고 이것을 적용한다** — 새 코드는 `checkin_photo_prefs_set` 을 부른다
--   (없애는 변경은 코드가 먼저 · CLAUDE §5).
--
-- ⚠ **이 롤백은 참여자가 해제한 「인도자 열람」을 버린다.** 표가 사라지면 비공개였던 사진이
--   인도자·운영자에게 다시 열린다. 그러므로 적용 전에 반드시 센다:
--     select count(*) from public.checkin_photo_prefs where not coach_view;
--   **0 이 아니면 적용하지 않는다** — 닫힌 것을 열면 다시 닫아도 신뢰가 돌아오지 않는다(불변식 16 · §12.2).
--
-- 저장소를 새로 세울 때(파일 순서대로 전부 적용)는 이 파일이 본문보다 먼저 돈다 —
--   그때는 표·함수가 아직 없으므로 `IF EXISTS` 가 조용히 지나가고 정책·RPC 는 직전 모양 그대로 선다.

DROP POLICY IF EXISTS checkin_photos_select ON storage.objects;
CREATE POLICY checkin_photos_select ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'checkin-photos'
  AND (
    (storage.foldername(name))[2] = auth.uid()::text
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.checkins k
       WHERE k.user_id::text    = (storage.foldername(name))[2]
         AND k.session_no::text = (storage.foldername(name))[3]
         AND public.is_cohort_coach(k.cohort_id, auth.uid())
    )
  )
);

CREATE OR REPLACE FUNCTION public.checkin_photo_paths(p_cohort uuid, p_user uuid, p_session int)
RETURNS TABLE(name text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT o.name
    FROM storage.objects o
   WHERE o.bucket_id = 'checkin-photos'
     AND (storage.foldername(o.name))[2] = p_user::text
     AND (storage.foldername(o.name))[3] = p_session::text
     AND (
       p_user = auth.uid()
       OR public.is_admin(auth.uid())
       OR (
         public.is_cohort_coach(p_cohort, auth.uid())
         AND EXISTS (
           SELECT 1 FROM public.checkins k
            WHERE k.cohort_id = p_cohort AND k.user_id = p_user AND k.session_no = p_session
         )
       )
     )
   ORDER BY o.name;
$$;
REVOKE ALL ON FUNCTION public.checkin_photo_paths(uuid,uuid,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.checkin_photo_paths(uuid,uuid,int) TO authenticated;

DROP FUNCTION IF EXISTS public.checkin_photo_prefs_set(int, boolean);
DROP FUNCTION IF EXISTS public.checkin_photos_staff_view(text, text);
DROP TABLE IF EXISTS public.checkin_photo_prefs;

NOTIFY pgrst, 'reload schema';
