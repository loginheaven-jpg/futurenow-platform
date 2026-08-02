-- 참여자 이동 정책 개정 + 편지 사진 귀속 정리 (ADR-87). ADR-84 의 '갈무리는 생성 차수에 남긴다'를 뒤집는다.
--   지휘부 결정 2026-08-02: 갈무리도 참여자를 따라 이동한다. 응답(responses)은 종전대로 불변·잔류.
--   근거: 갈무리는 ADR-80이 규정한 '수정 가능한 문서'이고 사람에게 귀속된다. 진단 응답(불변·사전사후 페어링)과 성격이 다르다.
--
-- 사진의 물리 경로는 옮기지 않는다 — 이유가 있다.
--   Supabase Storage 는 객체의 실제 저장 키에 name 을 포함하므로 storage.objects.name 만 UPDATE 하면
--   DB 행과 파일이 어긋나 다운로드가 깨진다(진짜 이동은 Storage API 의 copy+delete 를 거쳐야 한다).
--   그래서 경로는 업로드 시점 차수를 영구히 유지하고, **접근 판정을 checkins 가 하도록** 바꾼다.
--   → 갈무리가 이동하면 열람 권한이 자동으로 따라가고, 떠난 차수의 인도자는 자동으로 접근을 잃는다.
--
-- 주의: 이 파일에는 두 가지 결함이 있었고 각각 후속 마이그레이션이 고친다(적용 이력 보존 — CLAUDE §5).
--   20260802100100 : checkins → cohort_sessions FK 로 일정 없는 대상(휴지통·미배정)으로의 이동이 실패하던 것
--   20260802100200 : storage.protect_delete() 가 storage.objects 직접 DELETE 를 막아 sweep 이 실패하던 것

-- ── 1) 이동: enrollment + checkins ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.move_cohort_member(p_user uuid, p_from uuid, p_to uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  IF p_from = p_to THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM enrollments WHERE cohort_id=p_from AND user_id=p_user) THEN
    RAISE EXCEPTION 'not enrolled in source cohort';
  END IF;

  DELETE FROM checkins src
   WHERE src.cohort_id = p_from AND src.user_id = p_user
     AND EXISTS (
       SELECT 1 FROM checkins dst
        WHERE dst.cohort_id = p_to AND dst.user_id = p_user AND dst.session_no = src.session_no
     );
  UPDATE checkins SET cohort_id = p_to WHERE cohort_id = p_from AND user_id = p_user;

  IF EXISTS (SELECT 1 FROM enrollments WHERE cohort_id=p_to AND user_id=p_user) THEN
    DELETE FROM enrollments WHERE cohort_id=p_from AND user_id=p_user;
  ELSE
    UPDATE enrollments SET cohort_id=p_to WHERE cohort_id=p_from AND user_id=p_user;
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.move_cohort_member(uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.move_cohort_member(uuid,uuid,uuid) TO authenticated;

-- ── 2) 사진 열람 판정을 경로 차수 → checkins 로 이관 ────────────────────────
--   경로 토큰: [1]=업로드 시점 차수(이제 판정에 쓰지 않는다) · [2]=user_id · [3]=session_no
--   uuid/int 캐스팅을 하지 않는다 — 형식이 어긋난 경로에서 정책이 예외를 던지면 버킷 전체가 막힌다.
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

-- INSERT·DELETE 정책은 불변.
--   INSERT 는 업로드 시점 차수 멤버십으로 판정(그 시점엔 경로 차수 = 현재 차수라 정확하다).
--   DELETE 는 본인 OR 운영자 — 차수에 의존하지 않으므로 이동의 영향을 받지 않는다.

-- ── 3) 경로 무관 사진 조회 RPC ─────────────────────────────────────────────
--   이동 후 사진은 옛 차수 접두어 아래 남으므로 prefix list 로는 찾지 못한다.
--   '그 회차 갈무리가 지금 이 차수에 있는가'로 게이트하고 이름만 돌려준다(서명은 앱이 한다).
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

NOTIFY pgrst, 'reload schema';
