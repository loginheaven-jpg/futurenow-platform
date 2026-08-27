// 인도자 콘솔 — 피드 흐름 요약(2차 · ADR-124 · 발주 §6.2).
//
// **판정 없이 사실만**(ADR-114 계열). 색으로 경고하지 않고, 순위를 매기지 않고, 참여율을 내지 않는다.
//   '조용한 분'은 지목이 아니라 **안부의 재료**다 — 그래서 목록과 마지막 시각만 적는다.
//
// **이 정보는 참여자에게 새지 않는다.** 화면을 여기 두는 것으로 막는 것이 아니라
//   `feed_flow`·`feed_quiet` RPC 가 코치·운영자 외의 호출을 거부한다(통합테스트가 잠근다).
//   여기서 실패하면 조용히 구획을 그리지 않는다 — 요약이 안 뜨는 것과 콘솔이 안 열리는 것은
//   심각도가 다르다(ADR-110·123 과 같은 판단).
import Link from 'next/link';
import { createServerContext } from '@/core/supabase/server';

const QUIET_DAYS = 3; // 발주 §9-1 확정. RPC 파라미터라 운영 중 조정 가능하다

export async function FeedSummary({ cohortId }: { cohortId: string }) {
  const ctx = await createServerContext();
  const [flow, quiet] = await Promise.all([
    ctx.getFeedFlow(cohortId, 7).catch(() => null),
    ctx.listQuietMembers(cohortId, QUIET_DAYS).catch(() => null),
  ]);
  if (flow === null && quiet === null) return null;

  const total = (flow ?? []).reduce((n, d) => n + d.posts, 0);
  const muted = { color: 'var(--color-text-secondary)' } as const;

  return (
    <section className="ui-card" style={{ padding: 'var(--space-5)', marginTop: 'var(--space-5)', display: 'grid', gap: 'var(--space-4)' }}>
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)' }}>
        <h2 className="t-title">동행</h2>
        <Link className="t-caption" href="/feed">피드 열기</Link>
      </header>

      <div>
        <p className="t-caption" style={muted}>최근 7일</p>
        {total === 0 ? (
          <p className="t-body" style={{ marginTop: 'var(--space-2)' }}>아직 올라온 글이 없어요.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 'var(--space-2) 0 0', display: 'grid', gap: 'var(--space-1)' }}>
            {(flow ?? []).map((d) => (
              <li key={d.day} className="t-caption" style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <span style={{ minWidth: '6.5em' }}>{d.day}</span>
                <span>{d.posts}개</span>
                <span style={muted}>{d.authors}명</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="t-caption" style={muted}>{QUIET_DAYS}일째 소식이 없는 분</p>
        {(quiet ?? []).length === 0 ? (
          <p className="t-body" style={{ marginTop: 'var(--space-2)' }}>없습니다.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 'var(--space-2) 0 0', display: 'grid', gap: 'var(--space-1)' }}>
            {(quiet ?? []).map((m) => (
              <li key={m.userId} className="t-caption" style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <span>{m.name ?? '이름 없음'}</span>
                <span style={muted}>
                  {m.lastPostAt ? `마지막 ${m.lastPostAt.slice(0, 10)}` : '아직 없음'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
