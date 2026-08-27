// 동행 피드 — 참여자 화면(2차 · ADR-124 · 발주 §6.1).
//
// **게시판이 아니라 카톡 대체다.** 성공 판정은 테스트가 아니라 9/21 아침에 인도자가 폰으로
//   사진 한 장과 한 문장을 올릴 수 있는가다(발주 §0). 그래서 입력창이 맨 위에 상시 노출되고,
//   게시 후 화면이 이동하지 않는다.
//
// **게이트 두 겹.** ① `/feed` 는 PROTECTED_PREFIXES 라 미인증이 미들웨어에서 `/login?returnTo=/feed`
//   로 걸린다. ② 기수 자격은 `feed_can_access` 가 RPC 안에서 본다 — 화면은 그 결과를 나를 뿐이다.
//   **게이트를 데이터보다 먼저** 통과시킨다(CLAUDE §9).
//
// 피드를 가진 기수가 없으면 목록을 읽지 않고 안내로 끝낸다 — 빈 화면은 고장으로 읽힌다(IA §5.6).
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/app/_screens/AppHeader';
import { createServerContext } from '@/core/supabase/server';
import { FeedClient } from './FeedClient';

export const dynamic = 'force-dynamic';

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const ctx = await createServerContext();
  const me = await ctx.currentUser();
  if (!me) redirect('/login?returnTo=/feed');

  const cohorts = await ctx.listFeedCohorts();
  const sp = await searchParams;

  if (cohorts.length === 0) {
    return (
      <div className="pc-shell" style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
        <AppHeader variant="sub" title="동행" backHref="/home" />
        <div className="ui-card" style={{ padding: 'var(--space-5)', marginTop: 'var(--space-5)' }}>
          <p className="t-body">아직 동행할 기수가 없어요.</p>
          <p className="t-caption" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
            세미나에 참여하면 그 기수의 동행이 열립니다. 지금은 <Link href="/news">소식</Link>과{' '}
            <Link href="/library">자료실</Link>을 둘러보실 수 있어요.
          </p>
        </div>
      </div>
    );
  }

  // 기본은 가장 최근 활성 기수 — 그 정렬은 `feed_my_cohorts()` 가 한다(발주 §5.1).
  //   쿼리로 온 기수가 목록에 없으면 조용히 기본으로 떨어뜨린다(추측해서 열지 않는다).
  const selected = cohorts.find((c) => c.cohortId === sp.cohort) ?? cohorts[0];
  const posts = await ctx.listFeed({ cohortId: selected.cohortId, limit: 20 });
  const photoUrls = await ctx.signFeedPhotos(
    posts.map((p) => p.photoPath).filter((p): p is string => !!p),
  );

  return (
    <div className="pc-shell" style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <AppHeader variant="sub" title="동행" backHref="/home" />
      <FeedClient
        meId={me.id}
        isCoach={selected.isCoach}
        cohorts={cohorts}
        selectedCohortId={selected.cohortId}
        initialPosts={posts}
        initialPhotoUrls={photoUrls}
      />
    </div>
  );
}
