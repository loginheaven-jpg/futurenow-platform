-- 갈무리-1b · checkins 직접 쓰기 권한 회수 (D1 강제)
-- 이 프로젝트는 default privileges 로 신규 public 테이블에 authenticated 전체 권한(INSERT/UPDATE/DELETE 등)을
-- 자동 부여한다(responses 등 기존 테이블도 동일). checkins 는 write RLS 정책(checkins_insert/update)이 있어,
-- write GRANT 가 남으면 참여자가 PostgREST 로 자기 행의 submitted_at 을 과거로 써 지각 판정을 무력화하고
-- edit_count·prompt_count(1기 보정 근거)를 조작할 수 있다. D1: 쓰기는 전량 DEFINER RPC 로만.
-- 테이블 단위 GRANT 를 테이블 단위 REVOKE 로 되돌리는 것은 유효하다(컬럼 REVOKE 무효와 다름).
-- SECURITY DEFINER RPC(checkin_save/submit/mark)는 소유자 권한으로 실행되어 이 REVOKE 의 영향을 받지 않는다.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.checkins FROM authenticated;
REVOKE ALL ON public.checkins FROM anon;

-- checkins_insert / checkins_update RLS 정책은 이제 도달 불가(방어 심층으로 존치).

NOTIFY pgrst, 'reload schema';
