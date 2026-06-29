-- 20260629061345_definer_search_path_hardening.sql
-- 보안 하드닝(Step 2.S1) — 불변식 "모든 DEFINER 함수는 SET search_path = public" 보강.
-- 감사 발견: resolve_group_by_code(DEFINER·search_path 미설정), touch_updated_at(트리거·미설정).
-- 본문·시그니처·권한(proacl: anon/authenticated EXECUTE) 불변 — CREATE OR REPLACE 가 ACL 유지. search_path 옵션만 추가.
-- group(SAIL) 자산은 보존(로드맵 보류) — 규약 위반만 닫는다. 본문은 실DB 정의 그대로.
CREATE OR REPLACE FUNCTION public.resolve_group_by_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_group_id UUID;
BEGIN
  SELECT id INTO v_group_id
  FROM public.groups
  WHERE code = UPPER(p_code)
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
  RETURN v_group_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
