-- 20260629100002_block_role_self_escalation.sql
-- 권한 상승 차단(critical) — users.role 직접 update 봉쇄.
-- 발견(적대적 감사): authenticated/anon 이 public.users 에 TABLE-level UPDATE 보유 → 전 컬럼(role 포함) 쓰기 가능.
--   users_update RLS(USING id=auth.uid() OR is_admin, WITH CHECK 없음) + role 보호 트리거 없음
--   → 멤버가 PostgREST 직접 update({role:'admin'}).eq('id',본인) 으로 자기 승격 가능(뒷문).
-- 주의: TABLE-level 권한 앞에서 `REVOKE UPDATE (role)` 단독은 no-op → 테이블 권한을 회수하고 **비-role 컬럼만 재부여**한다.
-- role 변경은 set_user_role RPC(SECURITY DEFINER, 소유자 권한 실행)로만 — DEFINER 라 이 컬럼 권한 회수에 영향 없음(정문 보존).

-- authenticated: 테이블 UPDATE 회수 → 비-role 컬럼(name 등 본인 수정 유지)만 재부여. role 봉쇄.
REVOKE UPDATE ON public.users FROM authenticated;
GRANT UPDATE (id, nickname, email, created_at, updated_at, name) ON public.users TO authenticated;

-- anon: users UPDATE 정당 경로 없음(RLS 차단·앱 미사용) → 전부 회수(표면 축소).
REVOKE UPDATE ON public.users FROM anon;

-- PUBLIC: 잔여 회수(있다면).
REVOKE UPDATE ON public.users FROM PUBLIC;
