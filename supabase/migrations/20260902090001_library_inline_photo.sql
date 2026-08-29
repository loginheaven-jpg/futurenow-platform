-- 서가 — **전체공개 사진을 목록에서 바로 본다**(최박사 판정 2026-08-29).
--
-- 「피드처럼」의 뜻 셋 중 **사진** 하나다. 글(설명)은 이미 나오고, 반응은 B 범위다.
--
-- **뼈대를 건드리지 않는다** — 목록은 **주소도 경로도 내지 않는다.**
--   `photo` 는 «이 자리에 사진을 그려도 되는가» 라는 **참·거짓 한 칸**이고,
--   화면은 이미 있는 프록시 주소(`/library/{id}/file`)를 스스로 조립한다.
--   그래서 서가 A 의 «목록이 주소를 내지 않는다» 가 **한 겹 더 닫힌 채로** 유지된다.
--   (피드는 경로를 내주고 따로 서명한다 — 서가는 프록시가 있어 그것마저 필요 없다.)
--
-- **판정은 갈라지지 않는다** — `can_view` 가 거짓이면 `photo` 도 반드시 거짓이다.
--   목록에는 «인도자에게 열립니다» 자료도 서기 때문에, 이 곱셈이 없으면 **표지 사진이 샌다.**
--   판정 함수는 `library_can_view` **하나**이고 여기서 **한 번만** 불러 둘이 함께 쓴다 —
--   두 번 부르면 두 값이 갈릴 자리가 생긴다(사본이 둘이면 잠금으로 묶는다 · 불변식 23).
--
-- **성질을 파생하지 않는다**(승격 2026-08-29) — 이미지인지를 **파일 이름 확장자로 추측하지 않고**
--   저장소가 실제로 기록한 `metadata->>'mimetype'` 으로 판정한다. 확장자는 올린 사람이 짓지만
--   mimetype 은 올릴 때 실제로 붙은 값이다.
--
-- **크기 상한** — 저장소 변환(썸네일)이 이 테넌트에 없다(실측: `feature not enabled for this tenant`).
--   그래서 목록에 그리는 것은 **원본**이고, 원본이 크면 목록이 무너진다.
--   상한 위의 사진은 목록에 안 그리고 **눌러서 본다** — 보이지 않는 것이 아니라 한 번 더 누른다.

-- 상한은 **한 곳에만 둔다.** 화면은 이 값을 모른다(RPC 가 참·거짓으로 답하므로 알 필요가 없다).
--   테스트는 이 함수를 **불러서** 값을 얻는다 — 숫자를 옮겨 적으면 사본이 둘이 된다.
create or replace function public.library_inline_photo_max_bytes()
returns bigint language sql immutable set search_path to 'public' as $fn$
  select (5 * 1024 * 1024)::bigint;   -- 5MB. 실물 표본이 2.96MB 였다(2026-08-29 실측).
$fn$;

revoke all on function public.library_inline_photo_max_bytes() from public;
grant execute on function public.library_inline_photo_max_bytes() to anon, authenticated, service_role;

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
         -- 볼 수 있고 · 파일이고 · 실제로 이미지이고 · 상한 안일 때만 참이다.
         --   `coalesce` 로 감싼다 — 저장소 객체가 아직 없으면(올리는 중) 거짓이지 널이 아니다.
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
