import { WISH_PAIR_LABELS } from './labels';
import { Panel } from './ReportScreen';

// 참여자·인도자 공용. 원문 두 개만 받으며, 짝의 선택은 호출 경로가 책임진다(ADR-204).
export function WishPair({ before, after }: { before: string; after: string }) {
  if (!before.trim() || !after.trim()) return null;

  return (
    <Panel title={WISH_PAIR_LABELS.title}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 'var(--space-4)' }}>
        {([['before', before], ['after', after]] as const).map(([key, text]) => (
          <div key={key} style={{ minWidth: 0 }}>
            <h4 className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-2)' }}>
              {WISH_PAIR_LABELS[key]}
            </h4>
            <p className="t-body" style={{ color: 'var(--color-text)', margin: 0, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
              {text}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
