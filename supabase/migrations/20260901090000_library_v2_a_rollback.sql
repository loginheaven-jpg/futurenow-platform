-- ★ 롤백 문 — **적용 전에 먼저 연다**(CLAUDE.md §11 · 경계 ⑷).
--   이 파일은 **적용하지 않는다.** 되돌려야 할 때 손으로 실행한다.
--   `20260901090001_library_v2_a.sql` 을 정확히 되돌린다.
--
-- **되돌아오는 것을 확인했다**(예행 2026-08-29 · BEGIN…ROLLBACK):
--   시그니처·본문·권한·SECURITY DEFINER·search_path·소유자 여섯 다 원문과 같았고,
--   **변이가 성립했는지 먼저 확인했다**(drop 뒤 함수 0 · 정책 0 — 계열 ⑧).

begin;

-- ① 새로 만든 것들을 지운다(만든 역순)
drop policy if exists library_objects_select on storage.objects;
drop policy if exists library_objects_insert_v2 on storage.objects;

drop function if exists public.library_open(uuid);
drop function if exists public.library_list();
drop function if exists public.library_hide(uuid, boolean);
drop function if exists public.library_add(text, text, text, uuid, text, text, text);
drop function if exists public.library_delete(uuid);
drop function if exists public.library_can_view(uuid);
drop function if exists public.library_can_view_path(text);
drop function if exists public.library_can_upload();

drop table if exists public.library_reports;
drop table if exists public.library_comments;
drop table if exists public.library_reactions;
drop table if exists public.library_item_tags;
drop table if exists public.library_tags;

-- ② library_items 를 옛 모양으로
alter table public.library_items drop constraint if exists library_items_source_check;
alter table public.library_items drop constraint if exists library_items_kind_check;
alter table public.library_items drop column if exists url;
alter table public.library_items drop column if exists kind;
alter table public.library_items drop column if exists hidden_at;
alter table public.library_items drop column if exists cohort_id;
alter table public.library_items drop column if exists created_by;

update public.library_items set tier = 'member' where tier = 'forum';
alter table public.library_items drop constraint if exists library_items_tier_check;
alter table public.library_items add constraint library_items_tier_check
  check (tier = any (array['public'::text, 'member'::text, 'coach'::text]));
alter table public.library_items alter column storage_path set not null;

-- ③ 옛 정책 셋 · 옛 권한 · 옛 함수를 **라이브에서 받아 둔 원문 그대로** 되살린다
grant select on public.library_items to anon, authenticated;
create policy library_items_select_public on public.library_items for select using (tier = 'public'::text);
create policy library_items_select_member on public.library_items for select using (tier = 'member'::text);
create policy library_items_select_coach  on public.library_items for select
  using ((tier = 'coach'::text) and (user_role(auth.uid()) = any (array['coach'::text, 'admin'::text])));

CREATE OR REPLACE FUNCTION public.library_can_read(p_path text)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_tier text;
BEGIN
  SELECT tier INTO v_tier FROM public.library_items WHERE storage_path = p_path;
  IF v_tier IS NULL THEN RETURN false; END IF;
  IF v_tier = 'public' THEN RETURN true; END IF;
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF v_tier = 'member' THEN RETURN true; END IF;
  RETURN public.user_role(auth.uid()) IN ('coach','admin');
END;
$function$;
-- **GRANT 를 명시로 적는다**(실측 근거) — 예행에서 권한이 같았던 것은 승계가 아니라
--   `postgres` 의 기본 권한 덕이었다. 적용 역할이 달라져도 결과가 같도록 못 박는다.
grant execute on function public.library_can_read(text) to anon, authenticated, service_role;

create policy library_objects_select on storage.objects for select to anon, authenticated
  using ((bucket_id = 'library'::text) and library_can_read(name));
create policy library_objects_write on storage.objects for insert to authenticated
  with check ((bucket_id = 'library'::text) and is_admin(auth.uid()));

-- library_upsert 를 **라이브에서 받아 둔 원문 그대로** 되돌린다(개명과 함께 고쳤기 때문이다)
CREATE OR REPLACE FUNCTION public.library_upsert(p_id uuid, p_title text, p_description text, p_tier text, p_storage_path text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  IF p_tier NOT IN ('public','member','coach') THEN
    RAISE EXCEPTION 'bad tier: %', p_tier USING errcode = '22023';
  END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.library_items (title, description, tier, storage_path)
    VALUES (p_title, NULLIF(p_description,''), p_tier, p_storage_path)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.library_items
       SET title = p_title, description = NULLIF(p_description,''), tier = p_tier
     WHERE id = p_id RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'item not found' USING errcode = 'P0002'; END IF;
  END IF;
  RETURN v_id;
END;
$fn$;

commit;
