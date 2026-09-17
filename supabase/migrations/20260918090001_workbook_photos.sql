-- 워크북 사진(ADR-197) — 편지 사진(ADR-83)을 **매 회차 맨 위 한 자리**로 넓힌다.
--
-- 바뀌는 것 셋:
--   ⑴ **「인도자 열람」 — 참여자가 회차 단위로 고른다.** 기본은 열람이다(체크 · 2026-09-18 결정).
--      해제하면 그 회차 사진을 **인도자도 운영자도 못 본다** — 불변식 16. 운영자는 인도자와 같은 자리에 선다.
--   ⑵ **판정 함수가 하나다** — `checkin_photos_staff_view`. 저장소 열람 정책과 목록 RPC 가 같은 함수를 부른다
--      (불변식 23 — 두 곳이 각자 판정하면 한쪽만 고쳐지는 날 샌다).
--   ⑶ **올린 순서로 낸다** — 워크북은 쪽 순서가 뜻이다. 전에는 이름(uuid) 순이라 뒤섞였다.
--
-- **왜 (사람, 회차) 인가 — 회기 칸이 없다.** ADR-87 이후 사진은 경로의 회기가 아니라
--   (user, session) 으로 갈무리에 붙는다(`checkin_photo_paths` 가 경로 [2]·[3] 만 본다). 본인 카드도
--   그 묶음 전체를 보여 준다. 선택을 (회기, 사람, 회차) 로 두면 **같은 사진 묶음에 선택이 둘** 생기고,
--   같은 인도자가 맡은 두 회기에 같은 사람이 있으면 한쪽의 「열람」이 다른 쪽의 「해제」를 연다.
--   **묶음과 같은 단위로 두어야 새지 않는다.**
--
-- **행이 없으면 열람이다** — 이미 올라온 편지 사진은 한 글자도 안 바뀐다.
--   표·함수를 **더하는** 변경이므로 스키마가 먼저다(CLAUDE §5). 옛 코드는 새 표를 모르고,
--   행이 0 이면 새 정책의 결과가 옛 정책과 같다.
--
-- **캐스팅하지 않는다** — 경로 토큰을 text 로 비교한다(20260802100000 의 규율: 형식이 어긋난
--   경로에서 정책이 예외를 던지면 버킷 전체가 막힌다).
--
-- **못 하는 것 — 정직하게 적는다.** 회기 완전삭제·참여자 영구삭제의 사진 회수(ADR-87)는 앱이
--   인도자·운영자 권한으로 목록을 읽고 지운다. **해제된 사진은 그 목록에 안 나오므로 안 지워진다.**
--   운영자에게 열어 주면 불변식 16 을 뚫고, 저장소 삭제는 열람 정책을 함께 탄다(삭제 후 행을 돌려받는다).
--   그래서 남는다 — 인도자·운영자 누구도 열 수 없는 채로. 주기 sweep 백스톱(ADR-83 후속)이 그 자리다.

-- ── 1) 선택을 담는 표 ─────────────────────────────────────────────────────
CREATE TABLE public.checkin_photo_prefs (
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_no int  NOT NULL CHECK (session_no BETWEEN 1 AND 12),
  coach_view boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, session_no)
);

ALTER TABLE public.checkin_photo_prefs ENABLE ROW LEVEL SECURITY;

-- 읽기: 본인만. 인도자·운영자는 이 표를 읽을 일이 없다 — 판정은 아래 DEFINER 함수가 한다.
CREATE POLICY checkin_photo_prefs_select ON public.checkin_photo_prefs
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 쓰기는 RPC 로만(checkins 와 같은 규율 · 20260727110000). 기본 권한이 붙인 것을 걷는다.
REVOKE ALL ON public.checkin_photo_prefs FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.checkin_photo_prefs FROM authenticated;
GRANT SELECT ON public.checkin_photo_prefs TO authenticated;

-- ── 2) 판정 함수 — 하나 ──────────────────────────────────────────────────
--   「부르는 사람이 인도자·운영자로서 이 사람의 이 회차 사진을 볼 수 있는가」.
--   본인 판정은 여기 넣지 않는다 — 본인은 선택과 무관하게 늘 본다(부르는 쪽이 OR 로 붙인다).
--   참·거짓만 돌려주고, 권한 없는 사람에게는 늘 거짓이다 — 남의 선택을 캐묻는 창구가 되지 않는다.
CREATE OR REPLACE FUNCTION public.checkin_photos_staff_view(p_user text, p_session text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    NOT EXISTS (
      SELECT 1 FROM public.checkin_photo_prefs p
       WHERE p.user_id::text = p_user AND p.session_no::text = p_session AND NOT p.coach_view
    )
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.checkins k
         WHERE k.user_id::text = p_user AND k.session_no::text = p_session
           AND public.is_cohort_coach(k.cohort_id, auth.uid())
      )
    );
$$;
REVOKE ALL ON FUNCTION public.checkin_photos_staff_view(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.checkin_photos_staff_view(text, text) TO authenticated;

-- ── 3) 저장소 열람 정책 — 판정 함수를 부른다 ─────────────────────────────
--   서명 URL 발급이 이 정책을 탄다. 목록 RPC 만 막으면 경로를 아는 사람이 직접 서명할 수 있다.
DROP POLICY IF EXISTS checkin_photos_select ON storage.objects;
CREATE POLICY checkin_photos_select ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'checkin-photos'
  AND (
    (storage.foldername(name))[2] = auth.uid()::text
    OR public.checkin_photos_staff_view((storage.foldername(name))[2], (storage.foldername(name))[3])
  )
);
-- INSERT·DELETE 정책은 불변(본인 업로드 · 본인/운영자 삭제).

-- ── 4) 목록 RPC — 같은 판정 + 올린 순서 ──────────────────────────────────
--   인도자 경로는 전처럼 **이 회기의 갈무리가 있는가**까지 본다(ADR-87 — 떠난 회기의 인도자는 못 본다).
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
       OR (
         public.checkin_photos_staff_view(p_user::text, p_session::text)
         AND (
           public.is_admin(auth.uid())
           OR (
             public.is_cohort_coach(p_cohort, auth.uid())
             AND EXISTS (
               SELECT 1 FROM public.checkins k
                WHERE k.cohort_id = p_cohort AND k.user_id = p_user AND k.session_no = p_session
             )
           )
         )
       )
     )
   ORDER BY o.created_at, o.name;
$$;
REVOKE ALL ON FUNCTION public.checkin_photo_paths(uuid,uuid,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.checkin_photo_paths(uuid,uuid,int) TO authenticated;

-- ── 5) 선택 쓰기 — 본인 것만 ─────────────────────────────────────────────
--   회차 범위·값 누락은 표의 CHECK·NOT NULL 이 거부한다(판정을 두 곳에 두지 않는다).
CREATE OR REPLACE FUNCTION public.checkin_photo_prefs_set(p_session int, p_coach_view boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.checkin_photo_prefs (user_id, session_no, coach_view, updated_at)
  VALUES (auth.uid(), p_session, p_coach_view, now())
  ON CONFLICT (user_id, session_no)
  DO UPDATE SET coach_view = EXCLUDED.coach_view, updated_at = now();
END; $$;
REVOKE ALL ON FUNCTION public.checkin_photo_prefs_set(int, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.checkin_photo_prefs_set(int, boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';
