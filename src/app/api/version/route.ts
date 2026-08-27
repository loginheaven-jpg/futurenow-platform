// 배포 신원 노출 — `/api/version` (3차 T-3).
//
// **왜 필요한가.** 1차까지는 HTML 에 `/_next/static/<buildId>/…` 가 있어 거기서 빌드 id 를 읽어
//   "지금 응답한 것이 새 빌드인가"를 가렸다. **turbopack 전환으로 그 마커가 사라졌다**(2차 §0) —
//   청크가 내용 해시로 나가고 `<buildId>` 경로 세그먼트가 없다. `get_deployment` 응답에도 없다.
//   그 결과 배포 반영을 별칭 응답으로 재게 되고, 그것이 **위양성을 낸다**(2차 §9.6에서 실제로 냈다).
//   여기서 코드가 스스로 신원을 말하면 그 추측이 사라진다.
//
// **공개해도 무해한 값만 담는다**(발주 §4). 커밋 SHA·브랜치·환경·배포 id·빌드 시각뿐이고,
//   **환경 변수·키·내부 경로·의존성 목록은 싣지 않는다.** 저장소가 공개이므로 커밋 SHA 는 이미 공개다.
//
// **인증을 걸지 않는다.** 배포 신원 확인은 **미인증 상태에서 해야 의미가 있다** —
//   로그인해야 볼 수 있으면 배포 직후 확인에 쓸 수 없다. `/api` 는 `PROTECTED_PREFIXES` 밖이고
//   `PROXY_MATCHER` 는 건드리지 않았다(불변식 17).
//
// `force-static` 인 이유: 값이 전부 **빌드 시점 상수**다. 배포마다 새로 생성되므로 옛 값이 남지 않고,
//   요청마다 함수를 깨울 이유도 없다.
export const dynamic = 'force-static';

/** 빌드 시점에 굳는다 — 모듈 평가가 prerender 중에 일어난다. */
const BUILT_AT = new Date().toISOString();

const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? null;

export function GET(): Response {
  return Response.json(
    {
      commit: sha,
      commitShort: sha ? sha.slice(0, 7) : null,
      ref: process.env.VERCEL_GIT_COMMIT_REF ?? null, // 브랜치 — 프리뷰 구분용
      env: process.env.VERCEL_ENV ?? 'local', // production | preview | development | local
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null, // Vercel API 대조용
      builtAt: BUILT_AT,
    },
    { headers: { 'cache-control': 'public, max-age=0, must-revalidate' } },
  );
}
