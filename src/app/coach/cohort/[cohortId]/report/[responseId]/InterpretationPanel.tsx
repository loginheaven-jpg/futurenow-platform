'use client';
// 코치 리포트 해석 패널(B③-A 비차단 표시). 서버는 existing(getInterpretation·빠름)만 주입 →
//   있으면 즉시 표시, 없으면 마운트 후 생성 트리거(ensureInterpretationAction)로 지연 채움(첫 열람 26s 블랭크 회피).
//   실패·타임아웃은 재시도 안내로 전이(조용한 실패 금지). 리포트 시각화(ReportScreen)는 이 패널과 무관하게 항상 표시.
// (검수 컨트롤 '다듬기·AI 원문으로'는 B③-B 에서 이 패널에 배선.)
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { InterpretationContent } from '@/instruments/futurenow/report/interpretation';
import { ensureInterpretationAction } from './actions';

const boxStyle: CSSProperties = {
  marginTop: 'var(--space-4)',
  padding: 'var(--space-5)',
  borderRadius: 'var(--radius-lg)',
  background: 'var(--color-surface-2)',
  border: 'var(--border-hair) solid var(--color-border)',
};

export function InterpretationPanel({ responseId, initial }: { responseId: string; initial: InterpretationContent | null }) {
  const [content, setContent] = useState<InterpretationContent | null>(initial);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>(initial ? 'idle' : 'loading');
  const triggered = useRef(false);

  async function generate() {
    setStatus('loading');
    const res = await ensureInterpretationAction(responseId);
    if (res.ok) {
      setContent(res.content);
      setStatus('idle');
    } else {
      setStatus('error');
    }
  }

  // 최초 마운트에서 existing 이 없으면 1회 생성 트리거(중복 방지 ref). 서버 렌더는 이미 무블로킹으로 끝난 상태.
  useEffect(() => {
    if (initial || triggered.current) return;
    triggered.current = true;
    let cancelled = false;
    (async () => {
      const res = await ensureInterpretationAction(responseId);
      if (cancelled) return;
      if (res.ok) {
        setContent(res.content);
        setStatus('idle');
      } else {
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initial, responseId]);

  if (content) {
    return (
      <section style={boxStyle}>
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>
          AI 초안 · 참고용입니다. 코치가 다듬어 확정할 수 있어요.
        </p>
        <h2 className="t-h2" style={{ color: 'var(--color-primary)', margin: '0 0 var(--space-3)' }}>{content.headline}</h2>
        {content.axes.length > 0 ? (
          <ul style={{ margin: '0 0 var(--space-3)', paddingLeft: '1.1em', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {content.axes.map((a, i) => (
              <li key={i} className="t-body" style={{ color: 'var(--color-text)' }}>
                <strong>{a.name}</strong> — {a.reading}
              </li>
            ))}
          </ul>
        ) : null}
        {content.caution ? (
          <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>{content.caution}</p>
        ) : null}
        <p className="t-body" style={{ color: 'var(--color-text)', margin: 0 }}>{content.growth}</p>
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section style={boxStyle}>
        <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>
          해석을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
        <button
          type="button"
          onClick={generate}
          className="t-caption"
          style={{ minHeight: 'var(--tap-min)', padding: '0 var(--space-4)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border-strong)', background: 'transparent', color: 'var(--color-primary)', cursor: 'pointer' }}
        >
          다시 시도
        </button>
      </section>
    );
  }

  // status === 'loading' (existing 없음 → 생성 중)
  return (
    <section style={boxStyle}>
      <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
        해석을 준비하고 있어요… 잠시만 기다려 주세요.
      </p>
    </section>
  );
}
