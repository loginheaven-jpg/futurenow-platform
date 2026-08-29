-- 서가 B 보정 — **`anon` 실행권을 걷는다.** 내가 반만 걷었다(2026-08-30).
--
-- ★ **무엇이 잘못됐나**: 본문(`20260903090001`)이 함수마다 `revoke all … from public` 만 했다.
--   **`revoke … from public` 은 PUBLIC 만 걷는다** — `anon` 에 **따로 붙은 것**은 걷지 못한다.
--
-- ★ **왜 `anon` 에 따로 붙었나**: 이 프로젝트는 **함수에도 default privileges 가 걸려 있다**(실측).
--   `pg_default_acl` 의 함수(`f`) 항목에 `anon=X` 가 있어 **새 함수를 만들면 자동으로 붙는다.**
--   표에 `authenticated` 전권이 붙는 것과 **같은 뿌리이고, 발주서 §0 ② 가 예견한 자리**다 —
--   「함수 권한은 별개다. REVOKE ON TABLE 이 함수를 덮지 않는다」.
--   **예견해 놓고 내가 반만 지켰다.**
--
-- ★ **어떻게 잡혔나**: 「REVOKE 를 썼는가」가 아니라 **「걷혔는가」를 물었기 때문이다**(§0 ③).
--   `has_function_privilege('anon', …)` 이 열둘 중 열에 `true` 를 냈다.
--   **문장은 썼고 결과가 달랐다** — 서가 A 의 `service_role`, 롤백의 함수 둘과 **같은 형태의 셋째**다.
--
-- ★ **A 는 두 겹으로 걷었다** — `from public` 과 `from anon` 둘 다(`library_v2_a.sql` 255·271행).
--   **그 형태를 그대로 따른다.**
--
-- **대조군이 이 진단을 세운다**: A 가 만든 `library_can_upload`·`library_hide` 와 피드의
--   `feed_comment_list` 는 ACL 에 **`anon` 이 없고**, 내 새 함수만 **있었다.**

-- ── `anon` 이 불러서는 안 되는 것 — 걷는다 ──────────────────────────────────
revoke execute on function public.library_react(uuid, text)          from anon;
revoke execute on function public.library_comment_create(uuid, text) from anon;
revoke execute on function public.library_comment_delete(uuid)       from anon;
revoke execute on function public.library_report_create(uuid, text)  from anon;
revoke execute on function public.library_report_mine(uuid)          from anon;
revoke execute on function public.library_report_open_count()        from anon;
revoke execute on function public.library_report_list()              from anon;
revoke execute on function public.library_report_handle(uuid)        from anon;
revoke execute on function public.library_my_reactions(uuid[])       from anon;

-- 가리기는 **다른 함수 안에서만** 쓴다. 밖에서 부를 이유가 없으므로 둘 다 걷는다.
revoke execute on function public.library_mask_name(text, boolean)   from anon;
revoke execute on function public.library_mask_name(text, boolean)   from authenticated;

-- ── `anon` 이 불러야 하는 둘은 그대로 둔다(결재 ⑶) ─────────────────────────
--   `library_list`        — 로그아웃도 목록을 본다
--   `library_comment_list` — 로그아웃도 전체공개 자료의 댓글을 본다(이름은 가려서 나간다)
--   **여기에 적어 두는 이유**: 다음 사람이 「왜 둘만 anon 인가」를 묻지 않게.
