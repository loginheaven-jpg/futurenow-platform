// 회기 문맥 레이아웃 — **회기 띠를 여기서 그린다** (U-5).
//
// **왜 여기인가.** `/coach/layout.tsx` 는 `[cohortId]` 세그먼트 **위**에 있어 그 params 를
//   받지 못한다(Next 16 — 레이아웃은 자기 아래 동적 세그먼트의 params 를 받지 않는다).
//   회기 이름은 서버 데이터라 경로만으로는 나오지 않으므로, **이름을 아는 가장 위 자리**가 여기다.
//
// **화면 여덟 곳에 띠를 붙이지 않는다** — 붙이면 새 화면이 늘 때마다 빠뜨리고,
//   빠뜨린 화면에서만 띠가 사라진다(불변식 23 의 전형적인 모양).
//
// ★ **왕복이 늘지 않는다**(U-6). U-5 에서는 아래 일곱이 각자 `getCohort` 를 불러 같은 렌더에
//   단일행 조회가 둘이었다(여덟 라우트 합계 15회). 지금은 여기도 화면들도 `requestCohort` 를
//   지나므로 **라우트당 한 번**이다 — 리포트 상세만 키가 다르면(`resp.cohortId`) 둘이고, 그것은 옳다.
//
// **게이트가 아니다.** 차단은 각 페이지와 RLS 가 한다 — 조회가 실패하면 이름 없이 통과시킨다
//   (칩만 안 선다). 게이트를 여기 두면 같은 판정이 두 곳에 살게 된다.
import { requestCohort } from '@/app/_lib/requestScope';
import { ConsoleBand } from '@/app/_screens/console/ConsoleBand';

export default async function CohortConsoleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ cohortId: string }>;
}) {
  const { cohortId } = await params;
  const cohort = await requestCohort(cohortId).catch(() => null);
  return (
    <>
      <ConsoleBand cohortId={cohortId} name={cohort?.name ?? null} />
      {children}
    </>
  );
}
