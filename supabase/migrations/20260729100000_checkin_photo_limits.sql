-- 편지 사진 버킷(ADR-83) 서버측 상한 — 클라이언트 재인코딩(jpeg 0.85·장변 2000px)을 서버가 이중 방어.
--   업로드 경로는 항상 image/jpeg(LetterPhotos.processImage)로 재인코딩되므로 jpeg-only가 가장 조인 허용집합.
--   file_size_limit 3MB: 2000px jpeg(0.85)의 실측 상한(대개 0.3~1.5MB)에 헤드룸. 초과·비jpeg는 스토리지가 거부.
--   운영 정책·RLS(20260728120000_checkin_photos.sql)는 불변 — 여기서는 버킷 메타(상한)만 조인다.
update storage.buckets
set
  file_size_limit = 3145728,               -- 3 MiB
  allowed_mime_types = array['image/jpeg']
where id = 'checkin-photos';
