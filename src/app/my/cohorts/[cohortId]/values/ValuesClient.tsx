'use client';
// 가치 카드 흐름 전체(ADR-121). 한 컴포넌트가 `stage` 로 화면을 가른다 — 라우트를 쪼개면
//   중단·재개 때 어느 주소로 보낼지가 또 하나의 상태가 된다. 갈무리 카드와 같은 사고다.
//
// 스타일은 기존 토큰·클래스(`ui-btn`·`ui-card`·`t-*`)만 쓴다. 새 시각 언어를 만들지 않는다(CLAUDE §8).
import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import type { ValueAssessment } from '@/contracts';
import {
  CARD_BY_ID, CARD_PAGES, COUNT_RULES, TOTAL_PAGES, VALUE_CARDS, type ValueCard,
} from '@/instruments/futurenow/values';
import {
  COMPARE, EXPLORE, FIRST_DONE, INTRO, JUDGE_REPLY, LABEL, RESULT, SECOND, TIDY,
} from '@/instruments/futurenow/values/copy';
import {
  buildPairs, choose, groupByWins, initPairwise, isComplete, matchesIds, nextIndex, undo,
  type PairwiseState,
} from '@/instruments/futurenow/values/pairwise';
import { reflectionFor } from '@/instruments/futurenow/values/reflection';
import { finalizeValueAction, patchValueAction, saveValueProgressAction } from './actions';

type Screen =
  | 'intro' | 'explore' | 'tidy' | 'firstDone'
  | 'resume' | 'pickFive' | 'pairwise' | 'final' | 'label' | 'compare' | 'judge' | 'result';

const box = { padding: 'var(--space-4)', background: 'var(--color-surface-1)', border: 'var(--border-hair) solid var(--color-border)', borderRadius: 'var(--radius)', marginBottom: 'var(--space-3)' } as const;
const row = { display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' } as const;
const inputStyle = { width: '100%', minHeight: 'var(--tap-min)', padding: 'var(--space-2) var(--space-3)', border: 'var(--border-hair) solid var(--color-border-strong)', borderRadius: 'var(--radius)', background: 'var(--color-surface-2)', color: 'var(--color-text)', fontSize: 16 } as const;

function Card({ card, on, onClick }: { card: ValueCard; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="ui-tappable"
      style={{
        display: 'block', width: '100%', textAlign: 'left', minHeight: 'var(--tap-min)',
        padding: 'var(--space-3)', borderRadius: 'var(--radius)',
        border: `2px solid ${on ? 'var(--color-primary)' : 'var(--color-border)'}`,
        background: on ? 'var(--color-accent-soft)' : 'var(--color-surface-2)',
        color: 'var(--color-text)', cursor: 'pointer',
      }}
    >
      <span className="t-body-lg" style={{ fontWeight: 600 }}>{card.korean}</span>
      <span className="t-caption" style={{ color: 'var(--color-text-secondary)', marginLeft: 'var(--space-2)' }}>{card.english}</span>
      <div className="t-caption" style={{ color: 'var(--color-text-secondary)', marginTop: 2 }}>{card.description}</div>
    </button>
  );
}

function Grid({ ids, picked, toggle }: { ids: readonly number[]; picked: Set<number>; toggle: (id: number) => void }) {
  return (
    <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
      {ids.map((id) => {
        const c = CARD_BY_ID.get(id);
        return c ? <Card key={id} card={c} on={picked.has(id)} onClick={() => toggle(id)} /> : null;
      })}
    </div>
  );
}

export function ValuesClient({ cohortId, initial }: { cohortId: string; initial: ValueAssessment | null }) {
  const saved = initial?.progress as { picks?: number[]; page?: number; pairwise?: PairwiseState } | undefined;

  const [screen, setScreen] = useState<Screen>(() => {
    if (!initial) return 'intro';
    if (initial.stage === 'final') return 'result';
    if (initial.stage === 'finalists') return 'pairwise';
    if (initial.stage === 'candidates') return 'resume';
    return 'intro';
  });
  const [page, setPage] = useState(saved?.page ?? 0);
  const [picked, setPicked] = useState<Set<number>>(new Set(saved?.picks ?? []));
  const [candidates, setCandidates] = useState<number[]>(initial?.candidates ?? []);
  const [showRest, setShowRest] = useState(false);
  const [five, setFive] = useState<number[]>([]);
  const [pw, setPw] = useState<PairwiseState | null>(saved?.pairwise ?? null);
  const [finalIds, setFinalIds] = useState<number[]>(initial?.finalIds ?? []);
  const [labels, setLabels] = useState({ v1: initial?.labels.v1 ?? '', v2: initial?.labels.v2 ?? '', v3: initial?.labels.v3 ?? '' });
  const [wb, setWb] = useState({ peak: initial?.workbook.peak ?? '', strength: initial?.workbook.strength ?? '', longing: initial?.workbook.longing ?? '' });
  const [align, setAlign] = useState<ValueAssessment['alignment']>(initial?.alignment ?? null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const toggle = (id: number) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, then: () => void) =>
    start(async () => { const r = await fn(); if (r.ok) { setErr(null); then(); } else setErr(r.error ?? '저장에 실패했습니다.'); });

  const pickedIds = useMemo(() => VALUE_CARDS.map((c) => c.id).filter((id) => picked.has(id)), [picked]);
  const rest = useMemo(() => VALUE_CARDS.map((c) => c.id).filter((id) => !picked.has(id)), [picked]);

  const Err = err ? <p className="t-caption" style={{ color: 'var(--color-danger)' }}>{err}</p> : null;

  // ── 1차 ────────────────────────────────────────────────────
  if (screen === 'intro') {
    return (
      <div>
        <p className="t-body">{INTRO.lead}</p>
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>{INTRO.value}</p>
        <p className="t-caption" style={{ color: 'var(--color-text-muted)' }}>{INTRO.time}</p>
        {Err}
        <div style={row}>
          <button className="ui-btn ui-btn--primary" style={{ width: '100%' }} onClick={() => setScreen('explore')}>
            {initial ? INTRO.resume : INTRO.start}
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'explore') {
    const ids = CARD_PAGES[page];
    const last = page === TOTAL_PAGES - 1;
    const go = (nextPage: number, to: Screen) =>
      run(() => saveValueProgressAction(cohortId, 'exploring', { picks: pickedIds, page: nextPage }), () => { setPage(nextPage); setScreen(to); });
    return (
      <div>
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{EXPLORE.page(page + 1, TOTAL_PAGES)}</p>
        <p className="t-body">{EXPLORE.lead}</p>
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{EXPLORE.help}</p>
        <p className="t-caption" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>{EXPLORE.free}</p>
        <Grid ids={ids} picked={picked} toggle={toggle} />
        {Err}
        <div style={row}>
          {page > 0 && <button className="ui-btn ui-btn--ghost" disabled={busy} onClick={() => go(page - 1, 'explore')}>{EXPLORE.prev}</button>}
          <button className="ui-btn ui-btn--primary" style={{ flex: 1 }} disabled={busy}
            onClick={() => (last ? go(page, 'tidy') : go(page + 1, 'explore'))}>
            {last ? EXPLORE.toTidy : EXPLORE.next}
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'tidy') {
    const n = pickedIds.length;
    const okCount = n >= COUNT_RULES.candidates.min && n <= COUNT_RULES.candidates.max;
    return (
      <div>
        <p className="t-body">{TIDY.lead}</p>
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>{TIDY.help}</p>
        <p className="t-body-lg" style={{ fontWeight: 600 }}>{TIDY.count(n)}</p>
        {!okCount && <p className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{n < 8 ? TIDY.tooFew(n) : TIDY.tooMany(n)}</p>}
        <Grid ids={pickedIds} picked={picked} toggle={toggle} />
        <div style={{ marginTop: 'var(--space-3)' }}>
          <button className="ui-btn ui-btn--ghost" style={{ width: '100%' }} onClick={() => setShowRest((v) => !v)}>
            {showRest ? TIDY.addClose : TIDY.add}
          </button>
        </div>
        {showRest && <div style={{ marginTop: 'var(--space-2)' }}><Grid ids={rest} picked={picked} toggle={toggle} /></div>}
        {Err}
        <div style={row}>
          <button className="ui-btn ui-btn--primary" style={{ width: '100%' }} disabled={busy || !okCount}
            onClick={() => run(() => saveValueProgressAction(cohortId, 'candidates', { picks: pickedIds }, pickedIds),
              () => { setCandidates(pickedIds); setScreen('firstDone'); })}>
            {TIDY.done}
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'firstDone') {
    return (
      <div>
        <p className="t-body-lg" style={{ fontWeight: 600 }}>{FIRST_DONE.title}</p>
        <p className="t-body">{FIRST_DONE.lead}</p>
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>{FIRST_DONE.value}</p>
        <div style={row}><Link className="ui-btn ui-btn--ghost" style={{ width: '100%', textDecoration: 'none' }} href="/my/cohorts">{FIRST_DONE.home}</Link></div>
      </div>
    );
  }

  // ── 2차 ────────────────────────────────────────────────────
  if (screen === 'resume') {
    return (
      <div>
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{SECOND.notice}</p>
        <p className="t-body">{SECOND.resumeLead}</p>
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>{SECOND.resumeHelp}</p>
        <div style={box}>
          {candidates.map((id) => <div key={id} className="t-body">{CARD_BY_ID.get(id)?.korean}</div>)}
        </div>
        <div style={row}><button className="ui-btn ui-btn--primary" style={{ width: '100%' }} onClick={() => setScreen('pickFive')}>{INTRO.resume}</button></div>
      </div>
    );
  }

  if (screen === 'pickFive') {
    const sel = new Set(five);
    const ok = five.length === COUNT_RULES.finalists.min;
    return (
      <div>
        <p className="t-body">{SECOND.pickFive}</p>
        <p className="t-body-lg" style={{ fontWeight: 600 }}>{five.length} / 5</p>
        <Grid ids={candidates} picked={sel}
          toggle={(id) => setFive((f) => (f.includes(id) ? f.filter((x) => x !== id) : f.length >= 5 ? f : [...f, id]))} />
        {Err}
        <div style={row}>
          <button className="ui-btn ui-btn--primary" style={{ width: '100%' }} disabled={busy || !ok}
            onClick={() => {
              const st = initPairwise(five);
              run(() => saveValueProgressAction(cohortId, 'finalists', { picks: pickedIds, pairwise: st }),
                () => { setPw(st); setScreen('pairwise'); });
            }}>{EXPLORE.next}</button>
        </div>
      </div>
    );
  }

  if (screen === 'pairwise') {
    const ids = five.length === 5 ? five : (pw?.ids ?? []);
    const state = matchesIds(pw, ids) ? pw! : initPairwise(ids);
    if (isComplete(state)) { setPw(state); setScreen('final'); return null; }
    const i = nextIndex(state);
    const pairs = buildPairs(state.ids);
    const [a, b] = pairs[i];
    const persist = (st: PairwiseState) => { setPw(st); void saveValueProgressAction(cohortId, 'finalists', { picks: pickedIds, pairwise: st }); };
    return (
      <div>
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{SECOND.pairProgress(i + 1, pairs.length)}</p>
        <p className="t-body">{SECOND.pairLead}</p>
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>{SECOND.pairHelp}</p>
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          {[a, b].map((id) => {
            const c = CARD_BY_ID.get(id)!;
            return <Card key={id} card={c} on={false} onClick={() => persist(choose(state, i, id))} />;
          })}
        </div>
        {i > 0 && (
          <div style={row}>
            <button className="ui-btn ui-btn--ghost" onClick={() => persist(undo(state, i - 1))}>{SECOND.pairBack}</button>
          </div>
        )}
      </div>
    );
  }

  if (screen === 'final') {
    const groups = pw ? groupByWins(pw) : [];
    const sel = new Set(finalIds);
    const ok = finalIds.length === 3;
    return (
      <div>
        <p className="t-body">{SECOND.finalLead}</p>
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{SECOND.finalHelp}</p>
        {groups.map((g) => (
          <div key={g.wins} style={{ marginBottom: 'var(--space-3)' }}>
            <div className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>
              {SECOND.wins(g.wins)}{g.ids.length > 1 ? ` · ${SECOND.tie}` : ''}
            </div>
            <Grid ids={g.ids} picked={sel}
              toggle={(id) => setFinalIds((f) => (f.includes(id) ? f.filter((x) => x !== id) : f.length >= 3 ? f : [...f, id]))} />
          </div>
        ))}
        {Err}
        <div style={row}>
          <button className="ui-btn ui-btn--primary" style={{ width: '100%' }} disabled={busy || !ok}
            onClick={() => run(() => finalizeValueAction(cohortId, finalIds as [number, number, number]), () => setScreen('label'))}>
            {SECOND.confirm}
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'label') {
    const keys = ['v1', 'v2', 'v3'] as const;
    const some = keys.some((k) => labels[k].trim());
    return (
      <div>
        <p className="t-body">{LABEL.lead}</p>
        <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>{LABEL.value}</p>
        <p className="t-caption" style={{ color: 'var(--color-text-muted)' }}>{LABEL.required}</p>
        {finalIds.map((id, idx) => (
          <div key={id} style={box}>
            <label className="t-body-lg" htmlFor={`lbl-${id}`} style={{ fontWeight: 600 }}>{CARD_BY_ID.get(id)?.korean}</label>
            <input id={`lbl-${id}`} style={{ ...inputStyle, marginTop: 'var(--space-2)' }} maxLength={60}
              placeholder={LABEL.placeholder} value={labels[keys[idx]]}
              onChange={(e) => setLabels((s) => ({ ...s, [keys[idx]]: e.target.value }))} />
          </div>
        ))}
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{LABEL.notice}</p>
        {Err}
        <div style={row}>
          <button className="ui-btn ui-btn--primary" style={{ width: '100%' }} disabled={busy || !some}
            onClick={() => run(() => patchValueAction(cohortId, { labels }), () => setScreen('compare'))}>{LABEL.next}</button>
        </div>
      </div>
    );
  }

  if (screen === 'compare') {
    const fields = [
      { k: 'peak' as const, label: COMPARE.peak },
      { k: 'strength' as const, label: COMPARE.strength },
      { k: 'longing' as const, label: COMPARE.longing },
    ];
    // 셋 다 비면 판정 화면을 건너뛰고 'skipped' 로 남긴다(v3 §6-2 빈 값 규칙).
    const empty = fields.every((f) => !wb[f.k].trim());
    return (
      <div>
        <p className="t-body">{COMPARE.lead}</p>
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{COMPARE.help}</p>
        {fields.map((f) => (
          <div key={f.k} style={box}>
            <label className="t-body" htmlFor={`wb-${f.k}`}>{f.label}</label>
            <input id={`wb-${f.k}`} style={{ ...inputStyle, marginTop: 'var(--space-2)' }} maxLength={20}
              placeholder={COMPARE.placeholder} value={wb[f.k]}
              onChange={(e) => setWb((s) => ({ ...s, [f.k]: e.target.value }))} />
          </div>
        ))}
        <p className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{COMPARE.notice}</p>
        {Err}
        {/* 건너뛰기는 '다음'과 같은 비중이다(문안 원칙 §3 예외 자리 — 여기서 몰아세우면 이탈한다). */}
        <div style={row}>
          <button className="ui-btn ui-btn--primary" style={{ flex: 1 }} disabled={busy}
            onClick={() => run(() => patchValueAction(cohortId, { workbook: wb, ...(empty ? { alignment: 'skipped' as const } : {}) }),
              () => setScreen(empty ? 'result' : 'judge'))}>{COMPARE.next}</button>
          <button className="ui-btn ui-btn--ghost" style={{ flex: 1 }} disabled={busy}
            onClick={() => run(() => patchValueAction(cohortId, { alignment: 'skipped' }), () => { setAlign('skipped'); setScreen('result'); })}>
            {COMPARE.skip}
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'judge') {
    const shown = [
      [COMPARE.peak, wb.peak], [COMPARE.strength, wb.strength], [COMPARE.longing, wb.longing],
    ].filter(([, v]) => (v as string).trim());
    return (
      <div>
        <div style={box}>
          <div className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{COMPARE.colWorkbook}</div>
          <div className="t-body">{shown.map(([, v]) => v).join(' · ')}</div>
        </div>
        <div style={box}>
          <div className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{COMPARE.colCards}</div>
          <div className="t-body">{finalIds.map((id) => CARD_BY_ID.get(id)?.korean).join(' · ')}</div>
        </div>
        <p className="t-body">{COMPARE.judgeLead}</p>
        {Err}
        <div style={{ display: 'grid', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
          {([['aligned', COMPARE.same], ['different', COMPARE.diff], ['unsure', COMPARE.unsure]] as const).map(([k, t]) => (
            <button key={k} className="ui-btn ui-btn--ghost" disabled={busy}
              onClick={() => run(() => patchValueAction(cohortId, { alignment: k }), () => { setAlign(k); setScreen('result'); })}>{t}</button>
          ))}
        </div>
      </div>
    );
  }

  // ── 결과 ───────────────────────────────────────────────────
  const ids = finalIds.length === 3 ? finalIds : (initial?.finalIds ?? []);
  const labelOf = (i: number) => [labels.v1, labels.v2, labels.v3][i]?.trim();
  return (
    <div>
      <p className="t-body-lg" style={{ fontWeight: 600 }}>{RESULT.title}</p>
      {ids.map((id, i) => (
        <div key={id} style={box}>
          <div className="t-body-lg" style={{ fontWeight: 600 }}>{CARD_BY_ID.get(id)?.korean}</div>
          {labelOf(i) && <div className="t-body" style={{ color: 'var(--color-text-secondary)' }}>{labelOf(i)}</div>}
          <div className="t-caption" style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>{RESULT.reflectTitle}</div>
          {reflectionFor(id).map((q) => <div key={q} className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>· {q}</div>)}
        </div>
      ))}
      {align && align !== 'skipped' && <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>{JUDGE_REPLY[align]}</p>}
      <p className="t-body" style={{ color: 'var(--color-text-secondary)' }}>{RESULT.value}</p>
      <div style={row}><Link className="ui-btn ui-btn--ghost" style={{ width: '100%', textDecoration: 'none' }} href="/my/cohorts">{RESULT.home}</Link></div>
    </div>
  );
}
