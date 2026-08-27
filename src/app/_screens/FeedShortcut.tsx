// 동행 피드 바로가기(2차 · ADR-124 · 발주 §6.3).
//
// **하단 탭바를 짓지 않는다**가 rev.1 확정이다 — `design_system.md` 에 탭바 사양이 없고
//   불변식 20 이 임의 제작을 금한다. 9/21 아침에 필요한 것은 탭바가 아니라 **링크**다.
//   임의로 지으면 design_system v4 가 도착했을 때 두 번 짓는다.
//
// 피드를 가진 기수가 없으면 아무것도 그리지 않는다 — 막다른 링크를 만들지 않는다.
import Link from 'next/link';

export function FeedShortcut({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Link
      href="/feed"
      className="ui-card ui-tappable"
      style={{ display: 'block', textDecoration: 'none', padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}
    >
      <span className="t-body" style={{ fontWeight: 600 }}>동행</span>
      <span className="t-caption" style={{ display: 'block', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
        오늘의 걸음을 남기고 서로의 걸음을 봅니다.
      </span>
    </Link>
  );
}
