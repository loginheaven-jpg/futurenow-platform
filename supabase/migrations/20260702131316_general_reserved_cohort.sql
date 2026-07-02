-- general 예약 차수 인프라(트랙 D-1). 세미나 코드 없이 로그인 사용자가 체험할 general 진단.
-- 코드 CHECK 를 예약어 허용으로 확장(기존 5자 랜덤 생성/검증 무변경 — 예약어 1개만 예외) + general 차수 1건 시드.

-- 1) 코드 CHECK 예약어 확장: 기존 5자 정규식(혼동문자 제외) + 예약어 'JOINF' 허용. 기존 행(모두 5자)은 상위집합이라 그대로 통과.
ALTER TABLE public.cohorts DROP CONSTRAINT cohorts_code_check;
ALTER TABLE public.cohorts ADD CONSTRAINT cohorts_code_check
  CHECK (code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$' OR code = 'JOINF');

-- 2) general 차수 시드(멱등) — 운영자(bootstrap admin) 소유, 상시 active, 무기한(expires_at NULL).
--    코치 배정 없음(운영자 관장). 공개 체험이라 정원 사실상 무제한(max_members 대량 — enrollByCode 정원검사 회피).
--    coach_id 는 최초 admin 서브쿼리(환경 무관·생성 UUID 하드코딩 회피 — apply_migration 규약). admin 부재 시 0행.
--    code UNIQUE(cohorts_code_key) → 재적용 시 ON CONFLICT DO NOTHING(멱등).
INSERT INTO public.cohorts (coach_id, instrument_id, name, code, status, max_members, expires_at)
SELECT u.id, 'futurenow', '체험 진단', 'JOINF', 'active', 1000000, NULL
  FROM public.users u WHERE u.role = 'admin' ORDER BY u.created_at LIMIT 1
ON CONFLICT (code) DO NOTHING;
