// 서가 목록 한 줄 — **제목과 권한만 말한다.**
//
// **주소를 들지 않는다**(§4). 옛 목록은 `path` 를 받아 클릭 때 서명 URL 을 받았다.
//   지금은 **자료 화면(`/library/[id]`)이 통째로 관문**이고 파일은 프록시 라우트로만 나간다 —
//   관문을 지난 사람이 주소를 넘길 수 있는 **잔여 창이 없다**(판정 ④).
//
// **못 여는 것을 감추지 않는다**(§5). 목록은 전원에게 보이고, 못 여는 줄은 **왜 못 여는지**를 적는다.
import Link from 'next/link';
import type { LibraryItem } from '@/contracts/domain';
import { LIBRARY_TIER_LABEL } from '@/app/_vocab/library';

const muted = { color: 'var(--color-text-secondary)' } as const;

/** 못 여는 줄에 붙는 말. **의미색을 쓰지 않는다**(불변식 9) — 사실만 적는다. */
function lockNote(item: LibraryItem): string {
  if (item.cohortName) return `${item.cohortName} 참여자에게 열립니다.`;
  if (item.tier === 'coach') return '인도자에게 열립니다.';
  return '포럼회원께 열립니다.';
}

export function LibraryList({ items }: { items: LibraryItem[] }) {
  return (
    <ul className="pc-cards" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--space-3)' }}>
      {items.map((i) => {
        const badges = [
          i.cohortName ?? LIBRARY_TIER_LABEL[i.tier],
          i.kind === 'link' ? '링크' : null,
          i.hidden ? '가림' : null,
        ].filter(Boolean);
        const body = (
          <>
            <span className="t-body" style={{ fontWeight: 600 }}>{i.title}</span>
            {i.description ? (
              <span className="t-caption" style={{ ...muted, display: 'block', marginTop: 'var(--space-1)' }}>{i.description}</span>
            ) : null}
            <span className="t-caption" style={{ ...muted, display: 'block', marginTop: 'var(--space-2)' }}>
              {badges.join(' · ')}
              {i.authorName ? ` · ${i.authorName}` : ''}
            </span>
            {i.canView ? null : (
              <span className="t-caption" style={{ ...muted, display: 'block', marginTop: 'var(--space-1)' }}>
                {lockNote(i)}
              </span>
            )}
          </>
        );
        const box = {
          display: 'block', padding: 'var(--space-4)',
          border: 'var(--border-hair) solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-1)',
        } as const;

        return (
          <li key={i.id}>
            {i.canView ? (
              // **자료 화면이 관문이다.** 목록은 문을 열지 않고 문 앞까지만 데려간다.
              <Link href={`/library/${i.id}`} className="ui-tappable" style={{ ...box, textDecoration: 'none', color: 'inherit' }}>
                {body}
              </Link>
            ) : (
              <div style={box}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
