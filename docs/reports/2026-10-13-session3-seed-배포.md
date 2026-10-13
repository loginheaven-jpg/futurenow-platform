# 3회차 SEED 운영 배포

사용자 요청: 자체 테스트 후 이상없으면 배포(2026-10-13).

## 배포 전 검증

- `node scripts/verify.mjs`: 타입 오류 0, 린트 오류 0·경고 3, Test Files 156 passed / 7 skipped / 총 163, Tests 1783 passed / 87 skipped / 총 1870, 빌드 성공. 출력 전문은 `2026-10-13-session3-seed-배포전검증.txt`.
- `node scripts/verifyCheckinSeed.mjs`: 12개 키 저장·수정·제출·재조회, 기존 답·비공개 플래그, 본인·인도자·운영자·제3자 RLS 통과. QA 트랜잭션 롤백. 나눔 열의 재사용 키까지 중복 집계하던 검증 도구를 실제 SEED 선언만 검사하도록 수정했다.
- `node scripts/checkinSeedBrowser.mjs`: 모바일 실제 카드 → 서버 액션 → DB → 재방문·편집 → 인도자 12개 상세 열람 통과, 페이지 오류·가로 넘침 0. QA 기록 원복.
- `node scripts/regenCopyBaseline.mjs --verify`·`git diff --check`: 통과.

## 대상과 절차

운영 대상은 `chois-projects-6fad4da6/futurenow-platform` (`prj_aF5WdWPZ3vl26NfyHNwuNhPOoEn3`) · `https://future.yebom.org`다. `origin/main`과 로컬 HEAD를 대조한 뒤 변경분을 커밋·푸시한다. 배포 신원은 `node scripts/postdeploy.mjs`로 원격 main과 대조한다. 기능 검증은 `node scripts/checkinSeedBrowser.mjs https://future.yebom.org`로 실행한다. DB 마이그레이션·권한 변경 없음. `/src/contracts` 변경·계약 이탈 없음. 사양 정합은 `architecture.md` §9.7·ADR-198에 반영되어 있다.

Vercel 연결 도구의 팀별 배포 목록 권한이 403을 반환해, 같은 프로젝트와 팀을 명시한 로컬 CLI 인증으로 조회했다. CLI에서 대상과 운영 배포를 확인했다.

## 결과

배포 및 운영 기능 검증 완료 후 아래에 결과를 추가한다.
