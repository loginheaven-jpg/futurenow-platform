-- 서가 v2 A — 골격 (ORDER library_v2_A · 최박사 결재 2026-08-29 · 지휘부 판정 넷)
--
-- 뼈대: **목록은 제목과 권한만 말한다. 자료 화면 전체가 관문이다. 주소는 관문을 지난 사람에게만 간다.**
--
-- ★ 축이 둘이다(판정 ①). 3단 등급으로는 «본인 회기 자료» 를 담을 수 없다 —
--   회기는 등급이 아니라 **소속**이고, `forum` 으로 두면 회기가 끝난 참여자가 못 본다(확정 ③ 위반).
--     tier      public | forum | coach   ← 등급(누구까지)
--     cohort_id uuid null                ← 소속(어느 기수의 것인가)
--   등록 이력은 `enrollments` 에 남고 `cohorts.status` 와 무관하므로
--   **「기간 제한 없음」을 코드가 아니라 구조가 지킨다.**
--
-- ★ 보류(expired)는 **회원 전용 자료만** 닫는다(최박사 판정 ②).
--   `public` 자료는 익명 포함 누구나 보므로 **보류된 사람이 로그아웃하면 그 자료는 본다.**
--   **그것을 막았다고 적지 않는다 — 막지 못한다고 적는다**(5-2 「도달 불가」와 같은 형식).
--   확정 ④의 사정 범위는 `forum`·`coach`·회기·본인 것이다.
--
-- ★ 주소는 **프록시 라우트**로만 나간다(판정 ④). 서명 URL 을 버린 이유는
--   관문을 지난 사람이 그 주소를 넘길 수 있어 **잔여 창이 남기** 때문이다 — 5-2 에서 문제 삼은 그 성질이다.
--   저장소 SELECT 를 **매 요청 판정**으로 두어 잔여 창을 0 으로 만든다.
--
-- ★ `member_tool_access` 는 **`auth.uid()` 로만** 부른다(보완 ㉡) — 남의 uid 로 부르면 42501 이다.
--   그리고 **`auth.uid() IS NULL` 을 먼저 가른다**(보완 ㉠) — 익명에게는 22023 을 던지기 때문이다(실측).
--
-- 롤백: `20260901090000_library_v2_a_rollback.sql` (먼저 열고 예행으로 확인했다)

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- ① library_items 개조 — 기존 자료를 잃지 않는다(실측 0행이라 백필도 없다)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.library_items
  add column created_by uuid references auth.users(id) on delete set null,
  add column cohort_id  uuid references public.cohorts(id) on delete set null,
  add column hidden_at  timestamptz,
  add column kind       text not null default 'file',
  add column url        text;

comment on column public.library_items.created_by is '올린 사람. 자격이 사라져도 자료는 남는다(확정 5).';
comment on column public.library_items.cohort_id is '소속 기수. null 이면 기수 무관. 등급과 다른 축이다(판정 1).';
comment on column public.library_items.hidden_at is '본인이 가린 시각. 삭제가 아니라 표시만 바꾼다(확정 6).';

-- 등급 이름 `member` → `forum`. **로그인 전원에게 열려 있던 1차 결함을 여기서 닫는다.**
--   실측(2026-08-29): 표 정책 `library_items_select_member` 는 `tier='member'` 뿐이라
--   **로그인조차 보지 않았다** — 발주서의 진단(«로그인 전원»)보다 넓었다.
update public.library_items set tier = 'forum' where tier = 'member';
alter table public.library_items drop constraint library_items_tier_check;
alter table public.library_items add constraint library_items_tier_check
  check (tier = any (array['public'::text, 'forum'::text, 'coach'::text]));

-- 파일이거나 링크다. 둘 중 하나만 든다 — 아니면 어느 쪽을 여는지 화면이 추측한다.
alter table public.library_items alter column storage_path drop not null;
alter table public.library_items add constraint library_items_kind_check
  check (kind = any (array['file'::text, 'link'::text]));
alter table public.library_items add constraint library_items_source_check check (
  (kind = 'file' and storage_path is not null and url is null) or
  (kind = 'link' and url is not null and storage_path is null));

-- ─────────────────────────────────────────────────────────────────────────────
-- ② 판정 — 한 곳에서만 한다
-- ─────────────────────────────────────────────────────────────────────────────

-- 올릴 자격(§7 · 최박사 확정 2·3).
--   **「회차 참여자」는 등록이 아니라 참여다** — 갈무리를 한 번이라도 쓴 사람이다.
--   실측(2026-08-29): 등록 19명 · 갈무리 행 12명 · 제출 9명 · 진단 응답 19명(등록과 같아 구별력 0).
--   최박사가 **넓은 쪽(12명)** 으로 확정했다 — 올릴 자격이므로.
create function public.library_can_upload() returns boolean
language plpgsql stable security definer set search_path to 'public' as $fn$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return false; end if;                 -- 익명: 22023 을 부르지 않는다
  if public.member_tool_access(v_uid) = 'none' then return false; end if;  -- 보류는 못 올린다
  if public.user_role(v_uid) in ('coach','admin') then return true; end if;
  if public.member_tool_access(v_uid) = 'full' then return true; end if;   -- 포럼회원 · 진행 중 참여자
  return exists (select 1 from public.checkins k where k.user_id = v_uid); -- 갈무리를 쓴 적이 있다
end;
$fn$;

-- 열람 판정(§6 · 판정 1·2). **순서가 곧 정책이다.**
create function public.library_can_view(p_id uuid) returns boolean
language plpgsql stable security definer set search_path to 'public' as $fn$
declare r public.library_items; v_uid uuid := auth.uid(); v_access text;
begin
  select * into r from public.library_items where id = p_id;
  if r.id is null then return false; end if;

  -- (1) 가려진 것은 본인과 운영자만 본다. 삭제가 아니라 표시라, 되돌릴 사람이 봐야 한다.
  if r.hidden_at is not null then
    return v_uid is not null and (r.created_by = v_uid or public.is_admin(v_uid));
  end if;

  -- (2) 전체 공개는 **익명 포함 누구나**. 보류도 여기는 닫지 않는다(최박사 판정 2).
  if r.tier = 'public' then return true; end if;

  -- (3) 여기부터는 로그인이 필요하다. **`member_tool_access` 를 부르기 전에 가른다**(익명이면 22023).
  if v_uid is null then return false; end if;

  -- (4) 보류(expired) — 회원 전용 자료를 전부 닫는다. **본인이 올린 것도 닫힌다**(확정 5 「본인만 못 본다」).
  v_access := public.member_tool_access(v_uid);
  if v_access = 'none' then return false; end if;

  -- (5) 본인이 올린 것은 등급 무관.
  if r.created_by = v_uid then return true; end if;

  -- (6) 본인 회기 자료 — **기간 제한 없음.** 등록 이력을 보므로 기수가 끝나도 열린다(확정 3).
  if r.cohort_id is not null and exists (
    select 1 from public.enrollments e where e.cohort_id = r.cohort_id and e.user_id = v_uid
  ) then return true; end if;

  -- (7) 등급
  if r.tier = 'forum' then return v_access = 'full'; end if;
  if r.tier = 'coach' then return public.user_role(v_uid) in ('coach','admin'); end if;
  return false;
end;
$fn$;

-- 저장소 정책이 부르는 얼굴. **경로로 행을 찾아 같은 판정에 넘긴다** — 판정이 둘이 되지 않게.
create function public.library_can_view_path(p_path text) returns boolean
language sql stable security definer set search_path to 'public' as $fn$
  select coalesce((select public.library_can_view(i.id) from public.library_items i
                    where i.storage_path = p_path limit 1), false);
$fn$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ③ 읽기는 RPC 로만 — 표 직접 SELECT 를 회수한다(§4)
-- ─────────────────────────────────────────────────────────────────────────────
drop policy library_items_select_public on public.library_items;
drop policy library_items_select_member on public.library_items;
drop policy library_items_select_coach  on public.library_items;
revoke select on public.library_items from anon, authenticated;

-- 목록 — **주소를 내지 않는다.** 제목·설명·권한·작성자·소속·열람 가능 여부만.
--   §5: 목록은 감추지 않는다. 전원에게 보인다.
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

-- 주소를 내주는 유일한 자리. **관문을 지나야 한다.**
--   프록시 라우트가 서버에서 부른다 — 클라이언트로는 파일 주소가 가지 않는다(§4).
create function public.library_open(p_id uuid)
returns table (kind text, storage_path text, url text, title text)
language plpgsql stable security definer set search_path to 'public' as $fn$
begin
  if not public.library_can_view(p_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query select i.kind, i.storage_path, i.url, i.title
                 from public.library_items i where i.id = p_id;
end;
$fn$;

-- 올리기(§1 동의 문안이 화면에 선다) · 가리기(확정 6) · 삭제(운영자만 · 화면은 B)
create function public.library_add(
  p_title text, p_description text, p_tier text, p_cohort_id uuid,
  p_kind text, p_storage_path text, p_url text
) returns uuid
language plpgsql volatile security definer set search_path to 'public' as $fn$
declare v_id uuid;
begin
  if not public.library_can_upload() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  -- 인도자 자료는 인도자·운영자만 올린다. 등급을 올려 다는 길을 막는다.
  if p_tier = 'coach' and public.user_role(auth.uid()) not in ('coach','admin') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  -- 기수를 달려면 그 기수 사람이어야 한다(인도자·운영자 제외).
  if p_cohort_id is not null
     and public.user_role(auth.uid()) not in ('coach','admin')
     and not exists (select 1 from public.enrollments e
                      where e.cohort_id = p_cohort_id and e.user_id = auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  insert into public.library_items (title, description, tier, cohort_id, kind, storage_path, url, created_by)
  values (p_title, p_description, p_tier, p_cohort_id, p_kind, p_storage_path, p_url, auth.uid())
  returning id into v_id;
  return v_id;
end;
$fn$;

create function public.library_hide(p_id uuid, p_hidden boolean) returns void
language plpgsql volatile security definer set search_path to 'public' as $fn$
begin
  -- **본인만 가린다.** 운영자는 가리는 것이 아니라 지운다(확정 6 — 삭제는 운영자를 지난다).
  if auth.uid() is null
     or not exists (select 1 from public.library_items i where i.id = p_id and i.created_by = auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  update public.library_items set hidden_at = case when p_hidden then now() else null end,
                                  updated_at = now()
   where id = p_id;
end;
$fn$;

create function public.library_delete(p_id uuid) returns void
language plpgsql volatile security definer set search_path to 'public' as $fn$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  delete from public.library_items where id = p_id;
end;
$fn$;

-- ★ **개명이 깨뜨릴 뻔한 것 하나 — `library_upsert`**(예행에서 발견 2026-08-29).
--   저장소에 **부르는 곳이 0** 인 고아 함수인데 `('public','member','coach')` 를 **박아 두고 있었다.**
--   그대로 두면 `'forum'` 을 스스로 거절하고 `'member'` 는 새 CHECK 에 걸려 **양쪽으로 막힌다.**
--   **지우지 않고 고친다** — 부르는 곳이 없다고 지우면 없어지는 것을 만드는 일이다.
--   함께 `created_by` 도 채운다(그전에는 NULL 로 들어가 확정 5·6 이 성립하지 않았다).
CREATE OR REPLACE FUNCTION public.library_upsert(p_id uuid, p_title text, p_description text, p_tier text, p_storage_path text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  IF p_tier NOT IN ('public','forum','coach') THEN
    RAISE EXCEPTION 'bad tier: %', p_tier USING errcode = '22023';
  END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.library_items (title, description, tier, storage_path, created_by)
    VALUES (p_title, NULLIF(p_description,''), p_tier, p_storage_path, auth.uid())
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

-- ★ **`PUBLIC` 실행 권한을 먼저 회수한다**(예행에서 발견) — `REVOKE … FROM anon` 은
--   `PUBLIC` 에 걸린 실행 권한을 걷지 못한다. 새 함수는 기본으로 `=X`(PUBLIC)가 붙으므로
--   **anon 에게서 거두려면 `PUBLIC` 에서 거둬야 한다.** 함수 안의 `auth.uid()` 검사가
--   이미 막고 있으나, **판정을 두 겹으로 두는 것이 §4 의 뜻이다.**
revoke execute on function public.library_can_upload()                        from public;
revoke execute on function public.library_add(text,text,text,uuid,text,text,text) from public;
revoke execute on function public.library_hide(uuid, boolean)                 from public;
revoke execute on function public.library_delete(uuid)                        from public;

-- **GRANT 를 명시로 적는다**(실측 근거 · 보완 6) — 기본 권한에 기대지 않는다.
--   예행에서 권한이 원문과 같았던 것은 승계가 아니라 `postgres` 의 기본 권한 덕이었다.
--   적용 역할이 달라져도 결과가 같도록 못 박는다.
grant execute on function public.library_list()                              to anon, authenticated, service_role;
grant execute on function public.library_can_view(uuid)                      to anon, authenticated, service_role;
grant execute on function public.library_can_view_path(text)                 to anon, authenticated, service_role;
grant execute on function public.library_open(uuid)                          to anon, authenticated, service_role;
grant execute on function public.library_can_upload()                        to authenticated, service_role;
grant execute on function public.library_add(text,text,text,uuid,text,text,text) to authenticated, service_role;
grant execute on function public.library_hide(uuid, boolean)                 to authenticated, service_role;
grant execute on function public.library_delete(uuid)                        to authenticated, service_role;
revoke execute on function public.library_can_upload()                       from anon;
revoke execute on function public.library_add(text,text,text,uuid,text,text,text) from anon;
revoke execute on function public.library_hide(uuid, boolean)                from anon;
revoke execute on function public.library_delete(uuid)                       from anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- ④ 저장소 — 옛 함수를 지우고 **매 요청 판정**으로 바꾼다
-- ─────────────────────────────────────────────────────────────────────────────
--   부르는 곳이 이 정책 하나뿐임을 전수로 확인했다(2026-08-29). CASCADE 를 쓰지 않는다 —
--   조용히 정책을 데려가고, 조용히 사라진 것은 아무도 모른다.
drop policy library_objects_select on storage.objects;
drop function public.library_can_read(text);

create policy library_objects_select on storage.objects for select to anon, authenticated
  using ((bucket_id = 'library'::text) and public.library_can_view_path(name));

-- 올리기 — 운영자 전용이던 것을 §7 자격으로 넓히되 **자기 폴더에만** 쓰게 한다.
--   경로 관용구는 피드·갈무리 사진과 같다(`{uid}/…`) — 새 관용구를 만들지 않는다.
drop policy library_objects_write on storage.objects;
create policy library_objects_insert_v2 on storage.objects for insert to authenticated
  with check ((bucket_id = 'library'::text)
              and ((storage.foldername(name))[1] = auth.uid()::text)
              and public.library_can_upload());

-- ─────────────────────────────────────────────────────────────────────────────
-- ⑤ B 가 쓸 표 다섯 — **지금 만들되 A 는 읽지도 쓰지도 않는다**(§2)
-- ─────────────────────────────────────────────────────────────────────────────
--   ★ RLS 를 켜고 **정책을 두지 않는다**(보완 3). 안 쓰는 표에 정책을 미리 지으면
--     부르는 사람이 없어 **잠금이 아무것도 증명하지 못한다**(조항 11).
--     정책 0 이면 `anon`·`authenticated` 에게 아무것도 열리지 않는다 — B 에서 지을 때 비로소 물릴 수 있다.
create table public.library_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now()
);
create table public.library_item_tags (
  item_id uuid not null references public.library_items(id) on delete cascade,
  tag_id  uuid not null references public.library_tags(id)  on delete cascade,
  primary key (item_id, tag_id)
);
create table public.library_reactions (
  item_id uuid not null references public.library_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji   text not null check (char_length(emoji) between 1 and 8),
  created_at timestamptz not null default now(),
  primary key (item_id, user_id, emoji)
);
create table public.library_comments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.library_items(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create table public.library_reports (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.library_items(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 500),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.library_tags       enable row level security;
alter table public.library_item_tags  enable row level security;
alter table public.library_reactions  enable row level security;
alter table public.library_comments   enable row level security;
alter table public.library_reports    enable row level security;
-- 정책을 두지 않는다 = 전면 거부. 권한도 주지 않는다.

commit;
