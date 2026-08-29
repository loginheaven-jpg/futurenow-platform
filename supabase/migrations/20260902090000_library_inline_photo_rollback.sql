-- 롤백 — `library_list()` 를 서가 A 의 모양으로 되돌린다(사진 열을 뺀다).
--
-- **먼저 연다.** 되돌릴 길을 열어 두지 않은 변경은 적용하지 않는다(지휘부 규율).
-- 반환 타입이 바뀌므로 `create or replace` 로는 안 되고 **떨어뜨렸다 다시 세운다.**
-- 화면이 새 열을 읽고 있으면 이 롤백 뒤 `photo` 가 사라지므로,
--   **코드를 먼저 되돌리고 이것을 적용한다**(좁히는 변경 — CLAUDE.md §5).

drop function if exists public.library_list();

create function public.library_list()
returns table (
  id uuid, title text, description text, tier text, kind text,
  cohort_id uuid, cohort_name text, created_by uuid, author_name text,
  hidden boolean, mine boolean, can_view boolean, created_at timestamptz
)
language sql stable security definer set search_path to 'public' as $fn$
  select i.id, i.title, i.description, i.tier, i.kind,
         i.cohort_id, c.name, i.created_by, u.name,
         (i.hidden_at is not null),
         (auth.uid() is not null and i.created_by = auth.uid()),
         public.library_can_view(i.id),
         i.created_at
    from public.library_items i
    left join public.cohorts c on c.id = i.cohort_id
    left join public.users   u on u.id = i.created_by
   where i.hidden_at is null
      or (auth.uid() is not null and (i.created_by = auth.uid() or public.is_admin(auth.uid())))
   order by i.created_at desc;
$fn$;

revoke all on function public.library_list() from public;
grant execute on function public.library_list() to anon, authenticated;

-- 상한 함수도 걷는다. **`library_list` 를 되돌린 뒤에** 지운다(참조가 먼저 사라져야 한다).
drop function if exists public.library_inline_photo_max_bytes();
