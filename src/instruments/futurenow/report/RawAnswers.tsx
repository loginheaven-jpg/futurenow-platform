'use client';
// 3면 — 참여자 원응답(코치/운영자 리포트 전용). resp.answers 를 copy.ts 문항 원문으로 섹션 렌더. ADR-77 Phase 2.
//   코드 덤프가 아니라 문항 원문+응답. 파생 점수(활력·GROW 등) 비혼합(§2-5). 채점·AI 불변, 참여자 미노출(ReportScreen 계열에만).
//   화면: 접이식(종합 먼저·원응답은 디테일). PDF: 항상 펼쳐 렌더(globals.css @media print 가 .report-raw-content 강제 표시).
import { useState, type ReactNode } from 'react';
import type { Wave } from '@/contracts';
import { itemPrompts, bipolarLabels, askPrompts, likertLabels, likertCenterLabel, waveKey } from '../copy';

// 리커트 1~5 문구화 — copy.ts 앵커(min/center/max) 사용, 2·4는 코치용 중간 표기(참여자 노출 아님).
const likertText = (v: number): string =>
  [likertLabels.minLabel, '약간 아니다', likertCenterLabel, '약간 그렇다', likertLabels.maxLabel][v - 1] ?? String(v);

// 지금의 나(A·C·D 리커트) — 진단 제시 순서(itemPrompts 키 순서) 그대로.
const NOW_CODES = Object.keys(itemPrompts).filter((k) => k[0] === 'A' || k[0] === 'C' || k[0] === 'D');
const NAV_CODES = ['NAV1', 'NAV2', 'NAV3', 'NAV4'] as const;
const FAITH_CODES = ['F1', 'F2'] as const;
const GAP_CODES = ['B1', 'B2', 'B3', 'B4', 'B5'] as const;

function Item({ prompt, children }: { prompt: string; children: ReactNode }) {
  return (
    <div style={{ padding: 'var(--space-2) 0', borderTop: 'var(--border-hair) solid var(--color-border)' }}>
      <div className="t-body" style={{ color: 'var(--color-text)', marginBottom: 2 }}>{prompt}</div>
      <div className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{children}</div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 'var(--space-4)' }}>
      <h4 className="t-caption" style={{ color: 'var(--color-primary)', letterSpacing: 0.5, margin: '0 0 var(--space-1)' }}>{title}</h4>
      {children}
    </section>
  );
}

export function RawAnswers({ answers, wave }: { answers: Record<string, unknown>; wave: Wave }) {
  const [open, setOpen] = useState(false);
  const wk = waveKey(wave);
  const num = (k: string): number | null => (typeof answers[k] === 'number' ? (answers[k] as number) : null);
  const str = (k: string): string => (typeof answers[k] === 'string' ? (answers[k] as string) : '');
  const intro = str('INTRO');

  return (
    <section style={{ border: 'var(--border-hair) solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-2)', padding: 'var(--space-4)' }}>
      <button
        type="button"
        className="report-raw-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span className="t-h2" style={{ color: 'var(--color-primary)', fontSize: 17 }}>참여자 원응답 (문항별)</span>
        <span className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{open ? '접기 ▲' : '펼치기 ▼'}</span>
      </button>

      {/* 화면: open 일 때만. PDF: @media print 가 강제 표시(.report-raw-content) */}
      <div className="report-raw-content" style={{ display: open ? 'block' : 'none', marginTop: 'var(--space-3)' }}>
        {intro ? (
          <Group title="들어가며 · 인생 조감도">
            <Item prompt="5년 뒤의 나 — 한 문장 스케치">
              <span style={{ color: 'var(--color-text)' }}>{intro}</span>
            </Item>
          </Group>
        ) : null}

        <Group title="나침반">
          {NAV_CODES.map((c) => {
            const v = num(c);
            const bp = bipolarLabels[c];
            const side = v == null ? '' : v < 3 ? ' · 왼쪽에 가까움' : v > 3 ? ' · 오른쪽에 가까움' : ' · 가운데';
            return (
              <Item key={c} prompt={itemPrompts[c]}>
                <div>좌: {bp?.left}</div>
                <div>우: {bp?.right}</div>
                <div style={{ color: 'var(--color-text)' }}>응답: {v == null ? '무응답' : `${v}/5${side}`}</div>
              </Item>
            );
          })}
        </Group>

        <Group title="지금의 나">
          {NOW_CODES.map((c) => {
            const v = num(c);
            return (
              <Item key={c} prompt={itemPrompts[c]}>
                <span style={{ color: 'var(--color-text)' }}>{v == null ? '무응답' : `${likertText(v)} (${v}/5)`}</span>
              </Item>
            );
          })}
        </Group>

        <Group title="믿음의 자리">
          {FAITH_CODES.map((c) => {
            const v = num(c);
            return (
              <Item key={c} prompt={itemPrompts[c]}>
                <span style={{ color: v == null ? 'var(--color-text-muted)' : 'var(--color-text)' }}>{v == null ? '무응답' : `${likertText(v)} (${v}/5)`}</span>
              </Item>
            );
          })}
        </Group>

        <Group title="다섯 영역의 간격">
          {GAP_CODES.map((c) => {
            const v = num(c);
            return (
              <Item key={c} prompt={itemPrompts[c]}>
                <span style={{ color: 'var(--color-text)' }}>{v == null ? '무응답' : `${v} / 10`}</span>
              </Item>
            );
          })}
        </Group>

        <Group title="나에게 묻는 시간">
          {(['E1', 'E2', 'E3'] as const).map((c) => {
            const text = str(c);
            return (
              <Item key={c} prompt={askPrompts[wk][c]}>
                <span style={{ color: text ? 'var(--color-text)' : 'var(--color-text-muted)', whiteSpace: 'pre-line' }}>{text || '(빈칸)'}</span>
              </Item>
            );
          })}
        </Group>
      </div>
    </section>
  );
}
