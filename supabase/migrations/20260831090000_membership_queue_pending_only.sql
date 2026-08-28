-- 승인 큐에서 **만료 임박 갈래를 걷어낸다** — 대기 갈래만 남는다.
--   (최박사 승인 2026-08-30 · 발주 범위 ①)
--
-- ⚠ **이 파일은 아직 적용되지 않았다.**
--
-- ─────────────────────────────────────────────────────────────────────────────
-- **왜 걷는가 — 만료가 없어졌으므로 임박도 뜻이 없다.**
--
-- `20260830090000` 이 자동 만료를 폐지했다(`member_state` 가 `valid_until` 을 보지 않는다).
-- 그 뒤 이 갈래에 남은 것은 **거짓이자 영구히 쌓이는 신호**다. 실측(2026-08-30):
--
--     `valid_until` 이 붙어 있는 행 3건 · 전부 `2027-08-28`
--       → **2027-07-29 부터 임박 목록에 뜨기 시작해 그 뒤 사라지지 않는다.**
--
--   옛 출구가 *지난 날짜 → `expired` 산출* 이었는데 그 산출이 없어졌기 때문이다.
--   운영자는 그것을 보고 **할 일도 없고**(연장할 자격이 꺾이지 않는다)
--   **치울 수단도 없다.** 목록은 늘기만 한다.
--
-- **ADR-122 ⑧ 의 안전망 논거도 함께 소멸했다.** 그 절은 *복수 차수 수료자의 기간이
--   두 번째 마감에서 갱신되지 않는다(대상 3명)* 는 한계를 남기며 **만료 임박 목록을
--   안전망으로** 들었다. 그런데 그 한계를 만들던 **마감 트리거 자체가 폐지됐다**
--   (`20260830090000`). 안전망이 지키던 위험이 없어졌으므로 안전망만 남을 이유가 없다.
--   → 즉 이 걷기는 안전망을 **버리는 것이 아니라**, 이미 대상이 사라진 장치를 치우는 것이다.
--
-- **값은 지우지 않는다**(최박사 못 박음). 없애는 것은 **갈래이지 값이 아니다** —
--   `memberships.valid_until` 3행은 *운영자가 그날 12개월 기본값으로 승인했다* 는 기록이고,
--   나중에 만료 정책을 다시 두면 갈래를 다시 만들 수 있다. **값이 살아 있어야 되돌릴 수 있다.**
--   `decide_membership` 의 유효기간 인자도 건드리지 않는다 — 이 변경은 **화면 갈래이지 판정이 아니다.**
--
-- ─────────────────────────────────────────────────────────────────────────────
-- **`bucket` 열을 남긴다** — 지금은 `'pending'` 하나뿐이다.
--
--   지울 수도 있었으나 남긴 이유 둘:
--     ⑴ 되돌릴 자리를 남긴다. 만료 정책이 다시 서면 `CASE` 한 줄을 되살리면 된다.
--     ⑵ **배포 순서 안전장치가 이 열 위에 선다**(↓ 배포 순서).
--
-- **배포 순서 — 코드가 먼저, 적용이 나중이다.**
--
--   인자를 없애므로 조합 넷 중 하나가 깨진다:
--     옛 코드 + 옛 함수  → 지금 (정상)
--     새 코드 + 옛 함수  → **정상.** 새 코드는 인자 없이 부르고 옛 함수는 `DEFAULT 30` 이라
--                          인자 없는 호출로 해석된다. 임박 행이 딸려 오지만
--                          **매퍼가 `bucket <> 'pending'` 을 버린다.**
--     새 코드 + 새 함수  → 정상
--     옛 코드 + 새 함수  → ❌ **깨진다.** 옛 코드가 `p_expiring_days` 를 보내는데 받을 인자가 없다.
--
--   → **깨지는 조합은 「적용 먼저」 하나뿐이다.** 그래서 순서를 못 박는다:
--     **① 코드 배포 → ② 이 마이그레이션 적용.** 그 사이 창에 빈틈이 없다.
--   매퍼의 그 한 줄은 방어적 잡음이 아니라 **이 창을 닫는 장치**다. 지우지 말 것.
-- ─────────────────────────────────────────────────────────────────────────────

-- 인자가 줄어드므로 `CREATE OR REPLACE` 로는 안 된다 — 시그니처가 다르면 **오버로드가 하나 더 생긴다.**
--   `(integer)` 판을 명시적으로 지운다(라이브 실측 2026-08-30: 오버로드는 이 하나뿐이다).
DROP FUNCTION IF EXISTS public.list_membership_queue(int);

CREATE FUNCTION public.list_membership_queue()
RETURNS TABLE (
  bucket             text,     -- **'pending' 뿐이다.** 만료 임박 갈래는 걷혔다
  user_id            uuid,
  name               text,
  email              text,
  forum_name         text,
  forum_phone        text,
  signup_note        text,
  status             text,
  valid_until        date,     -- **값은 남긴다.** 표시는 하지 않아도 기록은 지우지 않는다
  created_at         timestamptz,
  default_valid_until date     -- 승인 화면 기본값. TS 가 12 를 몰라도 되게 한다.
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  -- 창 인자가 없어졌으므로 **창 검증(22023)도 함께 없어진다.** 검사할 값이 없다.

  RETURN QUERY
  SELECT 'pending'::text, u.id, u.name, u.email, c.forum_name, c.forum_phone, m.signup_note,
         s.state,                                   -- 저장값이 아니라 **판정**을 돌려준다(사본을 만들지 않는다)
         m.valid_until, COALESCE(m.created_at, u.created_at),
         (public.membership_today()
           + (public.membership_default_months() || ' months')::interval)::date
    FROM public.users u
    LEFT JOIN public.memberships   m ON m.user_id = u.id
    LEFT JOIN public.user_contacts c ON c.user_id = u.id
    CROSS JOIN LATERAL (SELECT public.member_state(u.id) AS state) s
   -- 대기: 판정이 `pending` 인 사람만. 차수 회원은 산출로 `cohort` 라 큐에 뜨지 않는다.
   WHERE s.state = 'pending'
   ORDER BY COALESCE(m.created_at, u.created_at);
END;
$$;

REVOKE ALL   ON FUNCTION public.list_membership_queue() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_membership_queue() TO authenticated;

-- ============================================================
-- 적용 뒤 검증 — 넷
-- ============================================================
--
--   ⑴ **옛 오버로드가 남아 있지 않다** — 걷은 것이 실재했고 실제로 걷혔는지 **양방향**으로 본다(계열 ⑦).
--        select oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--         where n.nspname='public' and p.proname='list_membership_queue';
--        → `list_membership_queue()` **한 줄만**. `(integer)` 가 함께 보이면 오버로드가 남은 것이다.
--
--   ⑵ **`anon` EXECUTE 가 없다** — `DROP` + `CREATE` 는 권한을 **승계하지 않는다.**
--        select proacl from pg_proc … → `authenticated=X` 있음 · `anon` 없음.
--
--   ⑶ **행 수가 갈래를 뺀 만큼만 준다** — 적용 전 `bucket='pending'` 개수와 적용 후 전체 개수가 같아야 한다.
--        적용 전:  select bucket, count(*) from public.list_membership_queue(30) group by 1;
--        적용 후:  select count(*) from public.list_membership_queue();
--      **대기 갈래가 함께 줄었으면 `WHERE` 를 잘못 옮긴 것이다.**
--
--   ⑷ **`valid_until` 3행이 그대로 있다** — 값은 지우지 않기로 했다.
--        select count(*) from public.memberships where valid_until is not null;  → 3
