// 서가 목록 한 줄 — **제목과 권한만 말한다.**
//
// **주소를 들지 않는다**(§4). 옛 목록은 `path` 를 받아 클릭 때 서명 URL 을 받았다.
//   지금은 **자료 화면(`/library/[id]`)이 통째로 관문**이고 파일은 프록시 라우트로만 나간다 —
//   관문을 지난 사람이 주소를 넘길 수 있는 **잔여 창이 없다**(판정 ④).
//
// **못 여는 것을 감추지 않는다**(§5). 목록은 전원에게 보이고, 못 여는 줄은 **왜 못 여는지**를 적는다.
//
// **사진은 바로 보인다**(최박사 판정 2026-08-29 — 「전체공개시 사진」).
//   그래도 **주소를 들지 않는다.** 서버가 `photo` 라는 **참·거짓 한 칸**만 주고,
//   화면은 이미 있는 프록시 주소를 조립한다 — 매 요청이 관문을 다시 지난다.
//   **화면은 판정하지 않는다** — `photo` 를 다시 계산하지 않고 그대로 따른다.
import Link from 'next/link';
import type { LibraryItem } from '@/contracts/domain';
import { LIBRARY_TIER_LABEL } from '@/app/_vocab/library';

const muted = { color: 'var(--color-text-secondary)' } as const;

/** 반응 수 합계. **정렬키가 아니다** — 「그릴 것이 있는가」만 묻는다. */
function reactionTotal(r: LibraryItem['reactions']): number {
  return Object.values(r).reduce<number>((a, b) => a + (b ?? 0), 0);
}
/** 눌린 이모지만 순서대로. **크기를 그리지 않는다**(막대·게이지·색 없음 · 불변식 11). */
function reactionSummary(r: LibraryItem['reactions']): string {
  return Object.entries(r).filter(([, n]) => (n ?? 0) > 0).map(([e, n]) => `${e} ${n}`).join(' ');
}

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
            {i.photo ? (
              // `alt=""` 다 — 제목이 바로 위에 있으므로 읽어 주면 **같은 말을 두 번** 한다.
              //   `lazy` 로 받는다 — 저장소 변환(썸네일)이 이 테넌트에 없어 **원본**이 오기 때문에,
              //   화면에 보이는 것만 받게 하는 것이 목록을 지키는 유일한 수단이다.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/library/${i.id}/file`}
                alt=""
                loading="lazy"
                decoding="async"
                style={{
                  display: 'block', width: '100%', maxHeight: '18rem', objectFit: 'cover',
                  borderRadius: 'var(--radius)', marginTop: 'var(--space-3)',
                  background: 'var(--color-surface-2)',
                }}
              />
            ) : null}
            <span className="t-caption" style={{ ...muted, display: 'block', marginTop: 'var(--space-2)' }}>
              {badges.join(' · ')}
              {i.authorName ? ` · ${i.authorName}` : ''}
              {/* 반응·댓글 수 — **보이되 정렬에 쓰지 않는다**(불변식 11 · 발주 §0-2).
                  목록 순서는 시간순 그대로다. 0 이면 그리지 않는다 — 늘 떠 있는 0 은 자리만 차지한다. */}
              {reactionTotal(i.reactions) > 0 ? ` · ${reactionSummary(i.reactions)}` : ''}
              {i.commentCount > 0 ? ` · 한마디 ${i.commentCount}` : ''}
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
