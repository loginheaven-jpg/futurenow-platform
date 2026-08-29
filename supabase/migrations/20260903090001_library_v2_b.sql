-- 서가 B — 반응 · 댓글 · 신고 (ORDER library_v2_B · 최박사 결재 아홉 · 2026-08-30).
--
-- ★ **첫 줄은 권한이다**(발주 §0). 표를 만들 때마다 기본 권한을 걷고, 함수마다 EXECUTE 를 명시하고,
--   걷혔는지를 잠금이 잰다. **REVOKE 를 쓴 것과 걷힌 것은 다르다.**
--
--   **A 는 B 표에 REVOKE 를 하지 않았다**(실측 2026-08-30):
--     · 다섯 표 전부 anon=SELECT · authenticated=SELECT/INSERT/UPDATE/DELETE
--     · A 파일에는 create table 과 enable row level security 뿐이고 revoke 가 한 줄도 없다
--     · library_items 에만 revoke select 가 있다 — **대조가 갈린다**
--   **default privileges 가 이 프로젝트에서 참임도 값으로 확인했다** — 임시 표를 만들어 물으니
--     anon=SI · authenticated=SIUD 가 **자동으로 붙었다**(트랜잭션 안에서 확인 후 롤백).
--   그러므로 **표를 새로 만들지 않아도 권한은 새로 걷어야 한다.**
--
-- ★ **쓰지 않는 표(태그 둘)도 함께 걷는다** — 다섯을 한자리에서 걷지 않으면
--   **두 표만 전권인 채로 남고**, 그것이 「걷은 것과 안 걷은 것이 섞이는」 자리다.

-- ── 1. 권한을 걷는다 (§0 ①②) ────────────────────────────────────────────────
revoke all on public.library_tags       from anon, authenticated;
revoke all on public.library_item_tags  from anon, authenticated;
revoke all on public.library_reactions  from anon, authenticated;
revoke all on public.library_comments   from anon, authenticated;
revoke all on public.library_reports    from anon, authenticated;

-- ── 2. 이름 가리기 — **한 자리에만 산다** (결재 ⑶⑷⑸⑻ · 발주 §2-3) ──────────
--
-- **화면이 아니라 층이다.** 가리는 자리가 목록·자료 화면·댓글 셋에 흩어지면 한쪽만 고쳐진다.
--   그래서 **이 함수 하나가 정하고**, 부르는 쪽은 「보는 사람이 로그인했는가」만 넘긴다.
--   **가려지지 않은 이름이 애초에 브라우저로 가지 않는다** — 서가 A 의
--   «목록이 주소를 내지 않는다» 와 같은 형태다.
--
-- **규칙은 하나다**: 앞 한 글자를 남기고 나머지를 가리되, **마지막 한 글자는 남긴다.**
--   결재 ⑸ 의 둘이 이 하나에서 그대로 떨어진다 — 두 글자 김미→김* · 세 글자 김민수→김*수.
--   **영문도 예외가 아니다**(결재 ⑻) — Sarah→S***h. **예외를 두면 그 예외가 나중에 낡는다.**
create or replace function public.library_mask_name(p_name text, p_mask boolean)
returns text language sql immutable set search_path to 'public' as $fn$
  select case
    when p_name is null then null
    when not p_mask then p_name
    when char_length(p_name) <= 1 then p_name
    when char_length(p_name) = 2 then left(p_name, 1) || '*'
    else left(p_name, 1) || repeat('*', char_length(p_name) - 2) || right(p_name, 1)
  end;
$fn$;

-- ── 3. 반응 (B-1 · 결재 ⑵ — 피드와 같은 이모지 넷) ──────────────────────────
--
-- **이모지를 새로 짓지 않는다.** feed_emojis() 를 그대로 부른다 —
--   목록을 두 곳에 두면 갈리고, 갈리면 목록 밖 이모지가 화면에 떠서 누르면 거부된다.
-- **판정은 library_can_view 하나다.** 못 보는 자료에 반응이 달리면 안 된다.
create or replace function public.library_react(p_item_id uuid, p_emoji text)
returns text[] language plpgsql security definer set search_path to 'public' as $fn$
declare v_uid uuid := auth.uid(); v_mine text[];
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if not (p_emoji = any (public.feed_emojis())) then
    raise exception 'unknown emoji' using errcode = '22023';
  end if;
  if not public.library_can_view(p_item_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if exists (select 1 from public.library_reactions
              where item_id = p_item_id and user_id = v_uid and emoji = p_emoji) then
    delete from public.library_reactions
     where item_id = p_item_id and user_id = v_uid and emoji = p_emoji;
  else
    insert into public.library_reactions (item_id, user_id, emoji) values (p_item_id, v_uid, p_emoji);
  end if;
  select coalesce(array_agg(emoji order by emoji), '{}')
    into v_mine from public.library_reactions where item_id = p_item_id and user_id = v_uid;
  return v_mine;
end $fn$;

-- ── 4. 댓글 (B-2 · 결재 ⑶⑷ — 로그아웃도 보되 이름을 가린다) ────────────────
--
-- **가리기는 여기서 일어난다.** 화면은 이미 가려진 이름을 받는다.
--   auth.uid() is null 이면 밖이므로 가린다 — **부르는 쪽이 정하지 않는다.**
create or replace function public.library_comment_list(p_item_id uuid)
returns table (id uuid, author_id uuid, author_name text, body text, created_at timestamptz, mine boolean)
language plpgsql stable security definer set search_path to 'public' as $fn$
declare v_uid uuid := auth.uid();
begin
  if not public.library_can_view(p_item_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
    select c.id,
           -- **밖에서는 작성자 id 도 내주지 않는다** — 이름을 가려도 id 로 사람이 붙는다.
           case when v_uid is null then null else c.author_id end,
           public.library_mask_name(u.name, v_uid is null),
           c.body, c.created_at,
           (v_uid is not null and c.author_id = v_uid)
      from public.library_comments c
      left join public.users u on u.id = c.author_id
     where c.item_id = p_item_id
     order by c.created_at;
end $fn$;

create or replace function public.library_comment_create(p_item_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path to 'public' as $fn$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if not public.library_can_view(p_item_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_body is null or btrim(p_body) = '' then
    raise exception 'empty body' using errcode = '22023';
  end if;
  insert into public.library_comments (item_id, author_id, body)
  values (p_item_id, v_uid, btrim(p_body)) returning id into v_id;
  return v_id;
end $fn$;

-- 본인 것 또는 운영자만 지운다. **인도자에게는 주지 않는다** — 방 안 관계가 바뀐다(결재 ⑺ 과 같은 결).
create or replace function public.library_comment_delete(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $fn$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if not exists (select 1 from public.library_comments
                  where id = p_id and (author_id = v_uid or public.is_admin(v_uid))) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  delete from public.library_comments where id = p_id;
end $fn$;

-- ── 5. 신고 (B-3 · 결재 ⑹⑺ — 갈래 ㄴ · 운영자만 본다) ──────────────────────
--
-- **문의(contact_messages)가 이미 푼 방식을 그대로 따른다** — handled_at · 첫 화면 한 줄.
--   **인도자는 보지 않는다**(결재 ⑺): 신고는 사람 사이의 일이라 보는 눈이 적을수록 안전하고,
--   인도자가 자기 기수 신고를 보면 방 안 관계가 바뀐다.
create or replace function public.library_report_create(p_item_id uuid, p_reason text)
returns void language plpgsql security definer set search_path to 'public' as $fn$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if not public.library_can_view(p_item_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  -- 이미 알린 것은 다시 넣지 않는다(문안 ㉦ 가 그것을 말한다).
  if exists (select 1 from public.library_reports
              where item_id = p_item_id and reporter_id = v_uid and handled_at is null) then
    return;
  end if;
  insert into public.library_reports (item_id, reporter_id, reason)
  values (p_item_id, v_uid, nullif(btrim(coalesce(p_reason, '')), ''));
end $fn$;

-- 내가 이미 알렸는가 — 화면이 ㉦ 를 띄울지 정하는 값. **남의 신고는 알려 주지 않는다.**
create or replace function public.library_report_mine(p_item_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $fn$
  select exists (select 1 from public.library_reports
                  where item_id = p_item_id and reporter_id = auth.uid() and handled_at is null);
$fn$;

-- 운영 첫 화면의 한 줄(문안 ㉩). **0 이면 화면이 줄을 그리지 않는다** — 문의와 같다.
create or replace function public.library_report_open_count()
returns integer language plpgsql stable security definer set search_path to 'public' as $fn$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return (select count(*) from public.library_reports where handled_at is null);
end $fn$;

create or replace function public.library_report_list()
returns table (id uuid, item_id uuid, item_title text, reason text, created_at timestamptz)
language plpgsql stable security definer set search_path to 'public' as $fn$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  -- **신고한 사람을 내주지 않는다** — 운영자가 볼 것은 «무엇이 걸렸는가» 이지 «누가 알렸는가» 가 아니다.
  return query
    select r.id, r.item_id, i.title, r.reason, r.created_at
      from public.library_reports r
      left join public.library_items i on i.id = r.item_id
     where r.handled_at is null
     order by r.created_at;
end $fn$;

create or replace function public.library_report_handle(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $fn$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  update public.library_reports set handled_at = now() where id = p_id and handled_at is null;
end $fn$;

-- ── 6. 목록에 반응·댓글 수를 얹는다 — **주소도 경로도 내지 않는다**(발주 §5) ──
--
-- 더하는 것은 **숫자 둘**이다. 주소를 내야 할 이유가 생기지 않았다.
-- **순위를 만들지 않는다**(§0-2 · 불변식 11) — 순서는 created_at desc 그대로다.
drop function if exists public.library_list();

create function public.library_list()
returns table (
  id uuid, title text, description text, tier text, kind text,
  cohort_id uuid, cohort_name text, created_by uuid, author_name text,
  hidden boolean, mine boolean, can_view boolean, created_at timestamptz,
  photo boolean, reactions jsonb, comment_count integer
)
language sql stable security definer set search_path to 'public' as $fn$
  select i.id, i.title, i.description, i.tier, i.kind,
         i.cohort_id, c.name, i.created_by,
         -- **작성자 이름도 밖에서는 가린다**(결재 ⑶⑷) — 댓글만 가리고 목록을 열어 두면 뚫린다.
         public.library_mask_name(u.name, auth.uid() is null),
         (i.hidden_at is not null),
         (auth.uid() is not null and i.created_by = auth.uid()),
         v.can_view,
         i.created_at,
         coalesce(
           v.can_view and i.kind = 'file'
           and o.metadata ->> 'mimetype' like 'image/%'
           and (o.metadata ->> 'size')::bigint <= public.library_inline_photo_max_bytes()
         , false),
         -- 못 보는 자료의 반응·댓글 수는 내지 않는다 — 숫자도 그 자료에 대한 정보다.
         case when v.can_view then coalesce(rx.counts, '{}'::jsonb) else '{}'::jsonb end,
         case when v.can_view then coalesce(cm.n, 0) else 0 end
    from public.library_items i
    cross join lateral (select public.library_can_view(i.id) as can_view) v
    left join public.cohorts c on c.id = i.cohort_id
    left join public.users   u on u.id = i.created_by
    left join storage.objects o on o.bucket_id = 'library' and o.name = i.storage_path
    left join lateral (select jsonb_object_agg(emoji, n) as counts
                         from (select emoji, count(*)::int n from public.library_reactions
                                where item_id = i.id group by emoji) z) rx on true
    left join lateral (select count(*)::int n from public.library_comments where item_id = i.id) cm on true
   where i.hidden_at is null
      or (auth.uid() is not null and (i.created_by = auth.uid() or public.is_admin(auth.uid())))
   order by i.created_at desc;
$fn$;

-- 내가 무엇을 눌렀는가 — 목록과 따로 받는다(피드와 같은 형태).
create or replace function public.library_my_reactions(p_item_ids uuid[])
returns table (item_id uuid, emojis text[])
language sql stable security definer set search_path to 'public' as $fn$
  select r.item_id, array_agg(r.emoji order by r.emoji)
    from public.library_reactions r
   where r.user_id = auth.uid() and r.item_id = any(p_item_ids)
   group by r.item_id;
$fn$;

-- ── 7. 함수 권한 — **하나씩 명시한다**(§0 ②) ────────────────────────────────
-- REVOKE ON TABLE 이 함수를 덮지 않는다. 그리고 새 함수에는 PUBLIC 실행권이 기본으로 붙으므로
--   **PUBLIC 을 먼저 걷는다**(ADR-163 보완 ㉡ 에서 겪은 자리).
revoke all on function public.library_mask_name(text, boolean)   from public;
revoke all on function public.library_react(uuid, text)          from public;
revoke all on function public.library_comment_list(uuid)         from public;
revoke all on function public.library_comment_create(uuid, text) from public;
revoke all on function public.library_comment_delete(uuid)       from public;
revoke all on function public.library_report_create(uuid, text)  from public;
revoke all on function public.library_report_mine(uuid)          from public;
revoke all on function public.library_report_open_count()        from public;
revoke all on function public.library_report_list()              from public;
revoke all on function public.library_report_handle(uuid)        from public;
revoke all on function public.library_my_reactions(uuid[])       from public;
revoke all on function public.library_list()                     from public;

-- 로그아웃도 보는 것: 목록 · 댓글 읽기(결재 ⑶)
grant execute on function public.library_list()                     to anon, authenticated, service_role;
grant execute on function public.library_comment_list(uuid)         to anon, authenticated, service_role;
-- 로그인해야 하는 것
grant execute on function public.library_react(uuid, text)          to authenticated, service_role;
grant execute on function public.library_comment_create(uuid, text) to authenticated, service_role;
grant execute on function public.library_comment_delete(uuid)       to authenticated, service_role;
grant execute on function public.library_report_create(uuid, text)  to authenticated, service_role;
grant execute on function public.library_report_mine(uuid)          to authenticated, service_role;
grant execute on function public.library_my_reactions(uuid[])       to authenticated, service_role;
-- 운영자만 — **권한과 판정 두 겹**이다. 함수 안에서 is_admin 을 다시 본다.
grant execute on function public.library_report_open_count()        to authenticated, service_role;
grant execute on function public.library_report_list()              to authenticated, service_role;
grant execute on function public.library_report_handle(uuid)        to authenticated, service_role;
-- 가리기는 다른 함수 안에서만 쓴다 — 밖에서 부를 이유가 없다.
grant execute on function public.library_mask_name(text, boolean)   to service_role;
