'use client';

import { useState } from 'react';
import type { RecommendationItem } from './groupModel';
import { RECOMMENDATIONS_COPY } from './labels';
import { copyRecommendationText, recommendationText, recommendationsText } from './recommendationCopy';
import { Panel } from './ReportScreen';

// 호출부가 최신 사후의 동의 목록을 확정한다. 화면·인쇄·복사는 이 한 목록만 쓴다(ADR-205).
export function RecommendationList({ items, unconsentedCount }: { items: readonly Pick<RecommendationItem, 'text' | 'attribution'>[]; unconsentedCount: number }) {
  const [copied, setCopied] = useState<{ key: string; text: string } | null>(null);
  const allText = recommendationsText(items);

  async function copy(key: string, text: string) {
    setCopied(null);
    await copyRecommendationText(text, () => setCopied({ key, text }));
  }

  const isCopied = (key: string, text: string) => copied?.key === key && copied.text === text;

  return (
    <Panel title={RECOMMENDATIONS_COPY.title}>
      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>
        {RECOMMENDATIONS_COPY.intro}
      </p>
      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4)' }}>
        {RECOMMENDATIONS_COPY.review}
      </p>
      {items.length > 0 ? (
        <>
          <button type="button" className="ui-btn ui-btn--ghost no-print" onClick={() => copy('all', allText)}>
            <span aria-live="polite">{isCopied('all', allText) ? RECOMMENDATIONS_COPY.copied : RECOMMENDATIONS_COPY.copyAll}</span>
          </button>
          <ol style={{ listStyle: 'none', padding: 0, margin: 'var(--space-4) 0 0', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {items.map((item, index) => {
              const key = `item-${index}`;
              const text = recommendationText(item);
              return (
                <li key={key} style={{ borderTop: 'var(--border-hair) solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
                  <blockquote className="t-body" style={{ color: 'var(--color-text)', margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                    {item.text}
                  </blockquote>
                  <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: 'var(--space-2) 0' }}>
                    ({item.attribution})
                  </p>
                  <button type="button" className="ui-btn ui-btn--ghost no-print" onClick={() => copy(key, text)}>
                    <span aria-live="polite">{isCopied(key, text) ? RECOMMENDATIONS_COPY.copied : RECOMMENDATIONS_COPY.copy}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </>
      ) : null}
      {unconsentedCount > 0 ? (
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: 'var(--space-4) 0 0' }}>
          {RECOMMENDATIONS_COPY.excluded(unconsentedCount)}
        </p>
      ) : null}
    </Panel>
  );
}
