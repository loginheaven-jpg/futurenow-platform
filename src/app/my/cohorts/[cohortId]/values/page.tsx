// 가치 카드 — 참여자 화면(v3 §9 · V-1 골격).
//
// **게이트 두 겹.** ① `/my` 는 `proxy.guard.ts` PROTECTED_PREFIXES 에 있어 미인증이 미들웨어에서 /login 으로 걸린다.
//   ② 그것은 *인증*만 본다. **차수 소속**은 여기서 본다 — 남의 cohortId 를 URL 에 넣어도 자기 차수가 아니면 못 들어간다
//   (v2 검토 R2-4 부수). 차수 홈(`../page.tsx`)이 쓰는 것과 같은 방식: `listMyCohorts()` 에서 찾지 못하면 목록으로.
//   게이트를 데이터보다 **먼저** 통과시킨다(CLAUDE §9 게이트-데이터 순서).
//
// **스타일 미적용.** `design_system.md` 에 이 화면이 쓸 부품(단일행 입력·카드 그리드·쌍대비교 2열)이 아직 없다.
//   CLAUDE §8 이 "확정 전 UI 임의 디자인 금지 · 불가피하면 기능 골격만"이라 했으므로 골격만 둔다.
//   부품 확정은 지휘부 전달 사항이다(v3 §13 V-4 · 3차 검토 N-12).
import { redirect } from 'next/navigation';
import { AppHeader } from '@/app/_screens/AppHeader';
import { createServerContext } from '@/core/supabase/server';
import { TOTAL_PAGES, VALUE_CARDS } from '@/instruments/futurenow/values';

export const dynamic = 'force-dynamic';

export default async function ValuesPage({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;

  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login');

  const mine = await ctx.listMyCohorts();
  const cohort = mine.find((c) => c.cohortId === cohortId);
  if (!cohort) redirect('/my/cohorts');

  // V-3.5(계약)·V-3(마이그레이션) 이후 여기서 `getMyValueAssessment(cohortId)` 로 진행 상태를 읽고
  //   stage 에 따라 1차/2차 화면으로 가른다. 지금은 라우팅·게이트만 세운다.
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader variant="flow" title="가치 카드" subtitle={cohort.name} />
      <p className="t-body">카드 {VALUE_CARDS.length}장을 {TOTAL_PAGES}개 화면으로 나누어 봅니다.</p>
      <p className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>준비 중입니다.</p>
    </div>
  );
}
