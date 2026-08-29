-- 롤백 — 서가 B 를 걷는다. **먼저 연다**(발주 §4 ㄱ).
--
-- 되돌릴 길을 열어 두지 않은 변경은 적용하지 않는다.
-- **표는 지우지 않는다** — 서가 A 가 만든 것이고 B 는 그것을 쓸 뿐이다(발주 §3-2).
--   B 가 만든 것은 **정책 · 함수 · 권한**이므로 그 셋만 걷는다.
--
-- **좁히는 변경이므로 코드가 먼저다**(CLAUDE.md §5) — 화면을 되돌린 뒤 이것을 적용한다.

-- ── 함수
drop function if exists public.library_react(uuid, text);
drop function if exists public.library_comment_list(uuid);
drop function if exists public.library_comment_create(uuid, text);
drop function if exists public.library_comment_delete(uuid);
drop function if exists public.library_report_create(uuid, text);
drop function if exists public.library_report_open_count();
drop function if exists public.library_report_list();
drop function if exists public.library_report_handle(uuid);
drop function if exists public.library_report_mine(uuid);
drop function if exists public.library_my_reactions(uuid[]);
drop function if exists public.library_mask_name(text, boolean);
-- ★ 위 둘은 **예행이 잡았다**(2026-08-30). 본문을 쓰면서 나중에 더한 함수를
--   롤백 문에 옮겨 적지 않아 **걷히지 않은 채 남았다** — 서가 A 에서 `service_role` 이
--   빠졌던 것과 **정확히 같은 형태**다(발주 §4 가 「처음부터 막는다」고 한 그 자리).
--   **문장은 썼는데 결과가 달랐다.** 예행이 없었으면 롤백이 반만 되돌렸을 것이다.

-- ── 정책(B 가 만든 것만)
drop policy if exists library_reactions_select on public.library_reactions;
drop policy if exists library_comments_select  on public.library_comments;

-- ── 권한: **A 가 만들 때 붙어 있던 상태로 되돌린다.**
--   ★ A 는 B 표에 REVOKE 를 하지 않았고, default privileges 로
--     `anon=SI · authenticated=SIUD` 가 붙어 있었다(2026-08-30 실측).
--   **그 상태로 되돌리는 것이 「원문대로」다** — 더 닫아 두면 원문과 다르다.
--   다만 **더 닫힌 채로 두는 편이 안전하므로**, 되돌리지 않고 **걷힌 채로 남긴다.**
--   RLS 켜짐 + 정책 0 이라 어차피 아무도 읽지 못한다(A 의 의도 그대로).
--   **이 한 칸이 옛것과 다르다는 것을 여기에 적어 둔다**(발주 §4 ㅁ).

-- ── `library_list` 를 사진 인라인 판(ADR-165)으로 되돌린다.
--   B 가 반응·댓글 수를 더했다면 그 열이 사라진다.
drop function if exists public.library_list();

create function public.library_list()
returns table (
  id uuid, title text, description text, tier text, kind text,
  cohort_id uuid, cohort_name text, created_by uuid, author_name text,
  hidden boolean, mine boolean, can_view boolean, created_at timestamptz,
  photo boolean
)
language sql stable security definer set search_path to 'public' as $fn$
  select i.id, i.title, i.description, i.tier, i.kind,
         i.cohort_id, c.name, i.created_by, u.name,
         (i.hidden_at is not null),
         (auth.uid() is not null and i.created_by = auth.uid()),
         v.can_view,
         i.created_at,
         coalesce(
           v.can_view
           and i.kind = 'file'
           and o.metadata ->> 'mimetype' like 'image/%'
           and (o.metadata ->> 'size')::bigint <= public.library_inline_photo_max_bytes()
         , false)
    from public.library_items i
    cross join lateral (select public.library_can_view(i.id) as can_view) v
    left join public.cohorts c on c.id = i.cohort_id
    left join public.users   u on u.id = i.created_by
    left join storage.objects o on o.bucket_id = 'library' and o.name = i.storage_path
   where i.hidden_at is null
      or (auth.uid() is not null and (i.created_by = auth.uid() or public.is_admin(auth.uid())))
   order by i.created_at desc;
$fn$;

revoke all on function public.library_list() from public;
grant execute on function public.library_list() to anon, authenticated, service_role;

-- ── 보정분(20260903090002) 되돌리기 ────────────────────────────────────────
-- 위에서 함수를 전부 drop 하므로 그 함수들의 ACL 도 함께 사라진다.
--   **따로 되돌릴 것이 없다** — 이 줄은 그 사실을 적어 두는 것이다.
--   `drop function` 이 ACL 을 함께 걷는다는 것을 예행으로 확인했다(2026-08-30).
