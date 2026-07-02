'use client';
// 코치 리포트 해석 패널 — 비차단 표시(B③-A) + 코치 검수(B③-B).
//   B③-A: 서버는 existing(getInterpretation·빠름)만 주입 → 있으면 즉시 표시, 없으면 마운트 후 생성 트리거(placeholder). 실패→재시도(조용한 실패 금지).
//   B③-B: '다듬기'(setCoachInterpretation·edited_by 본인) / 'AI 원문으로'(clearCoachInterpretation). effective=coach본 우선. 코치/운영자만(page·RLS 게이트).
// 리포트 시각화(ReportScreen)는 이 패널과 무관하게 항상 표시.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useToast } from '@/app/_toast/ToastProvider';
import type { InterpretationContent } from '@/instruments/futurenow/report/interpretation';
import {
  clearCoachInterpretationAction,
  ensureInterpretationAction,
  saveCoachInterpretationAction,
  type InterpretationVM,
} from './actions';

const boxStyle: CSSProperties = {
  marginTop: 'var(--space-4)',
  padding: 'var(--space-5)',
  borderRadius: 'var(--radius-lg)',
  background: 'var(--color-surface-2)',
  border: 'var(--border-hair) solid var(--color-border)',
};
const fieldStyle: CSSProperties = {
  width: '100%',
  minHeight: 'var(--tap-min)',
  padding: 'var(--space-3)',
  borderRadius: 'var(--radius)',
  border: 'var(--border-hair) solid var(--color-border)',
  background: 'var(--color-surface-1)',
  color: 'var(--color-text)',
  font: 'inherit',
  fontSize: 15,
  resize: 'vertical',
  display: 'block',
};
const ghostBtn: CSSProperties = {
  minHeight: 'var(--tap-min)',
  padding: '0 var(--space-4)',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--color-border-strong)',
  background: 'transparent',
  color: 'var(--color-primary)',
  cursor: 'pointer',
};

interface Draft {
  headline: string;
  axes: { name: string; reading: string }[];
  caution: string;
  growth: string;
}
const toDraft = (c: InterpretationContent): Draft => ({
  headline: c.headline,
  axes: c.axes.map((a) => ({ name: a.name, reading: a.reading })),
  caution: c.caution ?? '',
  growth: c.growth,
});
const toContent = (d: Draft): InterpretationContent => ({
  headline: d.headline.trim(),
  axes: d.axes.map((a) => ({ name: a.name, reading: a.reading.trim() })),
  ...(d.caution.trim() ? { caution: d.caution.trim() } : {}),
  growth: d.growth.trim(),
});

export function InterpretationPanel({ responseId, initial }: { responseId: string; initial: InterpretationVM | null }) {
  const toast = useToast();
  const [vm, setVm] = useState<InterpretationVM | null>(initial);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>(initial ? 'idle' : 'loading');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const triggered = useRef(false);

  async function generate() {
    setStatus('loading');
    const res = await ensureInterpretationAction(responseId);
    if (res.ok) {
      setVm(res.vm);
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
        setVm(res.vm);
        setStatus('idle');
      } else {
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initial, responseId]);

  function startEdit() {
    if (!vm) return;
    setDraft(toDraft(vm.effective));
    setEditing(true);
  }

  async function saveEdit() {
    if (!draft) return;
    const content = toContent(draft);
    if (!content.headline || !content.growth) {
      toast.error('제목과 성장 여지는 비울 수 없어요.');
      return;
    }
    setBusy(true);
    try {
      const res = await saveCoachInterpretationAction(responseId, content);
      if (res.ok) {
        setVm((prev) => (prev ? { ...prev, effective: content, coachEdited: true } : prev));
        setEditing(false);
        toast.success('해석을 다듬어 저장했어요.');
      } else {
        toast.error(res.error ?? '저장에 실패했어요.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function revertToAi() {
    if (!vm) return;
    setBusy(true);
    try {
      const res = await clearCoachInterpretationAction(responseId);
      if (res.ok) {
        setVm((prev) => (prev ? { ...prev, effective: prev.ai, coachEdited: false } : prev));
        toast.success('AI가 쓴 원문으로 되돌렸어요.');
      } else {
        toast.error(res.error ?? '되돌리기에 실패했어요.');
      }
    } finally {
      setBusy(false);
    }
  }

  // ── 상태: 콘텐츠 없음(로딩/에러) ─────────────────────────────
  if (!vm) {
    if (status === 'error') {
      return (
        <section style={boxStyle}>
          <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>
            해석을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
          <button type="button" onClick={generate} className="t-caption" style={ghostBtn}>다시 시도</button>
        </section>
      );
    }
    return (
      <section style={boxStyle}>
        <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
          해석을 준비하고 있어요… 잠시만 기다려 주세요.
        </p>
      </section>
    );
  }

  // ── 상태: 편집(다듬기) ──────────────────────────────────────
  if (editing && draft) {
    return (
      <section style={boxStyle}>
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>
          이 해석을 다듬으실 수 있어요. 저장하면 코치가 확정한 문구가 됩니다.
        </p>
        <label className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>전체 인상</label>
        <textarea rows={2} style={{ ...fieldStyle, marginBottom: 'var(--space-3)' }} value={draft.headline} onChange={(e) => setDraft({ ...draft, headline: e.target.value })} aria-label="전체 인상" />
        {draft.axes.map((a, i) => (
          <div key={i} style={{ marginBottom: 'var(--space-3)' }}>
            <label className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{a.name}</label>
            <textarea
              rows={2}
              style={fieldStyle}
              value={a.reading}
              onChange={(e) => setDraft({ ...draft, axes: draft.axes.map((x, j) => (j === i ? { ...x, reading: e.target.value } : x)) })}
              aria-label={`${a.name} 읽기`}
            />
          </div>
        ))}
        <label className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>돌봄 안부 (선택 · 비우면 빠짐)</label>
        <textarea rows={2} style={{ ...fieldStyle, marginBottom: 'var(--space-3)' }} value={draft.caution} onChange={(e) => setDraft({ ...draft, caution: e.target.value })} aria-label="돌봄 안부" />
        <label className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>성장 여지</label>
        <textarea rows={2} style={{ ...fieldStyle, marginBottom: 'var(--space-4)' }} value={draft.growth} onChange={(e) => setDraft({ ...draft, growth: e.target.value })} aria-label="성장 여지" />
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button type="button" onClick={() => setEditing(false)} disabled={busy} className="t-caption" style={{ ...ghostBtn, flex: 1 }}>취소</button>
          <button type="button" onClick={saveEdit} disabled={busy} className="t-caption" style={{ ...ghostBtn, flex: 1, borderColor: 'var(--color-primary)' }}>확정 저장</button>
        </div>
      </section>
    );
  }

  // ── 상태: 표시(+검수 컨트롤) ────────────────────────────────
  const c = vm.effective;
  return (
    <section style={boxStyle}>
      <p className="t-caption" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>
        {vm.coachEdited ? '코치가 다듬어 확정한 문구예요.' : 'AI 초안 · 참고용입니다. 코치가 다듬어 확정할 수 있어요.'}
      </p>
      <h2 className="t-h2" style={{ color: 'var(--color-primary)', margin: '0 0 var(--space-3)' }}>{c.headline}</h2>
      {c.axes.length > 0 ? (
        <ul style={{ margin: '0 0 var(--space-3)', paddingLeft: '1.1em', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {c.axes.map((a, i) => (
            <li key={i} className="t-body" style={{ color: 'var(--color-text)' }}>
              <strong>{a.name}</strong> — {a.reading}
            </li>
          ))}
        </ul>
      ) : null}
      {c.caution ? (
        <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>{c.caution}</p>
      ) : null}
      <p className="t-body" style={{ color: 'var(--color-text)', margin: '0 0 var(--space-4)' }}>{c.growth}</p>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <button type="button" onClick={startEdit} disabled={busy} className="t-caption" style={ghostBtn}>다듬기</button>
        {vm.coachEdited ? (
          <button type="button" onClick={revertToAi} disabled={busy} className="t-caption" style={ghostBtn}>AI 원문으로</button>
        ) : null}
      </div>
    </section>
  );
}
