// 회기 문맥 레이아웃 — **회기 띠를 여기서 그린다** (U-5).
//
// **왜 여기인가.** `/coach/layout.tsx` 는 `[cohortId]` 세그먼트 **위**에 있어 그 params 를
//   받지 못한다(Next 16 — 레이아웃은 자기 아래 동적 세그먼트의 params 를 받지 않는다).
//   회기 이름은 서버 데이터라 경로만으로는 나오지 않으므로, **이름을 아는 가장 위 자리**가 여기다.
//
// **화면 여덟 곳에 띠를 붙이지 않는다** — 붙이면 새 화면이 늘 때마다 빠뜨리고,
//   빠뜨린 화면에서만 띠가 사라진다(불변식 23 의 전형적인 모양).
//
// **왕복 하나가 는다**(단일행 `cohorts` select). 아래 여덟 중 일곱은 이미 각자 `getCohort` 를
//   부르므로 같은 렌더에서 두 번이 된다 — 지금은 그대로 두고 완주 보고에 올렸다.
//   합치려면 화면들을 `requestScope` 로 옮겨야 하고, 그것은 이 회차의 범위가 아니다.
//
// **게이트가 아니다.** 차단은 각 페이지와 RLS 가 한다 — 조회가 실패하면 이름 없이 통과시킨다
//   (칩만 안 선다). 게이트를 여기 두면 같은 판정이 두 곳에 살게 된다.
import { createServerContext } from '@/core/supabase/server';
import { ConsoleBand } from '@/app/_screens/console/ConsoleBand';

export default async function CohortConsoleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ cohortId: string }>;
}) {
  const { cohortId } = await params;
  const ctx = await createServerContext();
  const cohort = await ctx.getCohort(cohortId).catch(() => null);
  return (
    <>
      <ConsoleBand cohortId={cohortId} name={cohort?.name ?? null} />
      {children}
    </>
  );
}
