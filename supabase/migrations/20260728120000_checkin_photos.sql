-- 갈무리-3 · 편지 사진 첨부 (ADR-83). 비공개 버킷 + 경로 기반 RLS.
--   경로 규약: {cohort_id}/{user_id}/{session_no}/{uuid}.jpg
--     → storage.foldername(name)[1]=cohort_id, [2]=user_id, [3]=session_no
--   열람: 본인 + 해당 차수 인도자 + 운영자.  삭제: 본인 + 운영자.  보관: 본인 삭제 전까지 영구(자동 파기 없음).
--   업로드 바이트는 클라이언트 직접(브라우저 supabase). EXIF 제거·리사이즈는 클라이언트에서.

INSERT INTO storage.buckets (id, name, public)
VALUES ('checkin-photos', 'checkin-photos', false)
ON CONFLICT (id) DO NOTHING;

-- INSERT: 본인(경로 user_id=auth.uid) + 그 차수 멤버
CREATE POLICY checkin_photos_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'checkin-photos'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND public.is_cohort_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

-- SELECT(열람/signed URL): 본인 OR 그 차수 인도자 OR 운영자
CREATE POLICY checkin_photos_select ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'checkin-photos'
  AND (
    (storage.foldername(name))[2] = auth.uid()::text
    OR public.is_cohort_coach(((storage.foldername(name))[1])::uuid, auth.uid())
    OR public.is_admin(auth.uid())
  )
);

-- DELETE: 본인 OR 운영자 (인도자는 삭제 불가)
CREATE POLICY checkin_photos_delete ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'checkin-photos'
  AND (
    (storage.foldername(name))[2] = auth.uid()::text
    OR public.is_admin(auth.uid())
  )
);

-- UPDATE 정책 없음 — 사진은 교체 불가(지우고 다시 올린다).
