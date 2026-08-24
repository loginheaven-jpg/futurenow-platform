'use client';
// 3면 — 참여자 원응답(코치/운영자 리포트 전용). resp.answers 를 copy.ts 문항 원문으로 섹션 렌더. ADR-77 Phase 2.
//   코드 덤프가 아니라 문항 원문+응답. 파생 점수(활력·GROW 등) 비혼합(§2-5). 채점·AI 불변, 참여자 미노출(ReportScreen 계열에만).
//   화면: 접이식(종합 먼저·원응답은 디테일). PDF: 항상 펼쳐 렌더(globals.css @media print 가 .report-raw-content 강제 표시).
//
// 배열·코드 라벨은 **인도자 가이드와 나란히 대조**하라고 있는 것이다(ADR-111 · ORDER rawanswers_reorder_v1).
//   가이드는 활력 → 나침반 → 준비도 → 간격 → 언어 → 숨은 층 순으로 읽고 각 문항을 A2·C5·D1 같은 코드로 부른다.
//   그래서 진단 제시 순서가 아니라 **가이드 지표 순서**로 묶고, 문항마다 코드를 작게 붙인다.
//   코드는 문항 원문을 대체하지 않는다 — 매칭용 보조 라벨일 뿐이다(ORDER §2.3). 참여자 경로에는 배선하지 않는다(§2.2).
import { useState, type ReactNode } from 'react';
import type { Wave } from '@/contracts';
import { itemPrompts, bipolarLabels, askPrompts, likertLabels, likertCenterLabel, waveKey } from '../copy';
import { GROW_AXES, MONO_STACK } from './labels';

// 리커트 1~5 문구화 — copy.ts 앵커(min/center/max) 사용, 2·4는 코치용 중간 표기(참여자 노출 아님).
const likertText = (v: number): string =>
  [likertLabels.minLabel, '약간 아니다', likertCenterLabel, '약간 그렇다', likertLabels.maxLabel][v - 1] ?? String(v);

// 활력 — 생기(A1·A3) 뒤 마모(A2·A5·A4).
//   마모 셋이 역채점 문항이지만 그 표기는 하지 않는다 — 원응답은 원문+응답만이다(ORDER §2.4).
const VITALITY_CODES = ['A1', 'A3', 'A2', 'A5', 'A4'] as const;
const NAV_CODES = ['NAV1', 'NAV2', 'NAV3', 'NAV4'] as const;
// 준비도 — GROW 축 **짝 순서**. scoring.ts ③(G=C2·C1 · R=C3·C4 · O=C6·C5 · W=C8·C7 · F=C9)과 1:1 이다.
//   코드 번호순(C1~C9)이 아닌 이유: 가이드 준비도 표가 축별로 짝지어 읽힌다. 축 이름은 GROW_AXES 가 단일 출처다.
const READY_PAIRS: Record<string, readonly string[]> = {
  G: ['C2', 'C1'],
  R: ['C3', 'C4'],
  O: ['C6', 'C5'],
  W: ['C8', 'C7'],
  F: ['C9'],
};
const GAP_CODES = ['B1', 'B2', 'B3', 'B4', 'B5'] as const;
const ASK_CODES = ['E1', 'E2', 'E3'] as const;
// 숨은 층 — 함정(D)+믿음(F)을 끝으로 모은다. 인도자 참고용이라 맨 뒤가 제자리다.
const HIDDEN_CODES = ['D1', 'D2', 'D3', 'F1', 'F2'] as const;

// 매칭용 보조 라벨. 문항 원문이 주(主)이고 코드는 보조라, 크기·색을 눌러 둔다(ORDER §3.2).
function CodeTag({ code }: { code: string }) {
  return (
    <span
      className="t-caption"
      style={{
        fontFamily: MONO_STACK,
        color: 'var(--color-text-secondary)',
        border: 'var(--border-hair) solid var(--color-border)',
        borderRadius: 4,
        padding: '0 4px',
        marginRight: 6,
        whiteSpace: 'nowrap',
      }}
    >
      {code}
    </span>
  );
}

function Item({ code, prompt, children }: { code?: string; prompt: string; children: ReactNode }) {
  return (
    <div style={{ padding: 'var(--space-2) 0', borderTop: 'var(--border-hair) solid var(--color-border)' }}>
      <div className="t-body" style={{ color: 'var(--color-text)', marginBottom: 2 }}>
        {code ? <CodeTag code={code} /> : null}
        {prompt}
      </div>
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

  // 리커트 한 줄(A·C·D·F 공용). 무응답은 흐리게 — F1·F2 는 선택 문항이라 정상적으로 비어 있을 수 있다.
  const likertRow = (c: string) => {
    const v = num(c);
    return (
      <Item key={c} code={c} prompt={itemPrompts[c]}>
        <span style={{ color: v == null ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
          {v == null ? '무응답' : `${likertText(v)} (${v}/5)`}
        </span>
      </Item>
    );
  };

  return (
    <section style={{ border: 'var(--border-hair) solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-2)', padding: 'var(--space-4)' }}>
      <button
        type="button"
        className="report-raw-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span className="t-h2" style={{ color: 'var(--color-primary)', fontSize: 17 }}>참여자 원응답 (질문별)</span>
        <span className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{open ? '접기 ▲' : '펼치기 ▼'}</span>
      </button>

      {/* 화면: open 일 때만. PDF: @media print 가 강제 표시(.report-raw-content) */}
      <div className="report-raw-content" style={{ display: open ? 'block' : 'none', marginTop: 'var(--space-3)' }}>
        {/* 1 — 도입 맥락. 자유서술이라 코드가 없다. */}
        {intro ? (
          <Group title="들어가며 · 인생 조감도">
            <Item prompt="5년 뒤의 나 — 한 문장 스케치">
              <span style={{ color: 'var(--color-text)' }}>{intro}</span>
            </Item>
          </Group>
        ) : null}

        {/* 2 — 활력 */}
        <Group title="활력">{VITALITY_CODES.map(likertRow)}</Group>

        {/* 3 — 나침반(bipolar) */}
        <Group title="나침반">
          {NAV_CODES.map((c) => {
            const v = num(c);
            const bp = bipolarLabels[c];
            const side = v == null ? '' : v < 3 ? ' · 왼쪽에 가까움' : v > 3 ? ' · 오른쪽에 가까움' : ' · 가운데';
            return (
              <Item key={c} code={c} prompt={itemPrompts[c]}>
                <div>좌: {bp?.left}</div>
                <div>우: {bp?.right}</div>
                <div style={{ color: 'var(--color-text)' }}>응답: {v == null ? '무응답' : `${v}/5${side}`}</div>
              </Item>
            );
          })}
        </Group>

        {/* 4 — 준비도. 축 소제목은 짝 순서를 눈으로 읽히게 한다(ORDER §3.3). 강의 어휘이나 코치 전용 화면이다. */}
        <Group title="준비도 (GROW+F)">
          {GROW_AXES.map((a) => (
            <div key={a.key}>
              <div className="t-caption" style={{ color: 'var(--color-text-secondary)', fontWeight: 600, marginTop: 'var(--space-2)' }}>{a.label}</div>
              {(READY_PAIRS[a.key] ?? []).map(likertRow)}
            </div>
          ))}
        </Group>

        {/* 5 — 다섯 영역의 간격(0~10) */}
        <Group title="다섯 영역의 간격">
          {GAP_CODES.map((c) => {
            const v = num(c);
            return (
              <Item key={c} code={c} prompt={itemPrompts[c]}>
                <span style={{ color: 'var(--color-text)' }}>{v == null ? '무응답' : `${v} / 10`}</span>
              </Item>
            );
          })}
        </Group>

        {/* 6 — 참여자의 언어(자유서술). 진단지에서는 '나에게 묻는 시간'이나, 가이드 표기로 통일한다(ORDER §3.1). */}
        <Group title="참여자의 언어">
          {ASK_CODES.map((c) => {
            const text = str(c);
            return (
              <Item key={c} code={c} prompt={askPrompts[wk][c]}>
                <span style={{ color: text ? 'var(--color-text)' : 'var(--color-text-muted)', whiteSpace: 'pre-line' }}>{text || '(빈칸)'}</span>
              </Item>
            );
          })}
        </Group>

        {/* 7 — 숨은 층. 함정(D)+믿음(F). 점수·유형 판정은 여기 넣지 않는다 — 그것은 인도자 패널(2면) 몫이다. */}
        <Group title="숨은 층 · 인도자 참고">{HIDDEN_CODES.map(likertRow)}</Group>
      </div>
    </section>
  );
}
