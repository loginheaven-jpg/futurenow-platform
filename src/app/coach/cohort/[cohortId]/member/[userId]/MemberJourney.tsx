// 화면 A 본문(ADR-118) — 한 사람의 전 회차를 여섯 블록으로 세운다.
//   서버 컴포넌트다. 접힘은 네이티브 <details> 라 클라이언트 JS 가 없다.
//
// 표시 규율(ADR-86·80 유지): 막대·게이지·색·백분위·평균·정렬키를 쓰지 않는다. 자신감은 **숫자만** 적는다.
//   의미색(care)은 연락 요청에만. 주 신호는 굵기·테두리로 가른다.
import type { CheckinPhoto, CheckinRecord, CohortSession } from '@/contracts';
import { CheckinReadView } from '@/instruments/futurenow/checkin/CheckinReadView';
import { buildCheckinRead } from '@/instruments/futurenow/checkin/readModel';
import { getCheckinSession } from '@/instruments/futurenow/checkin';
import {
  cellState,
  checkinSignals,
  facilitatorNotes,
  journeyProgress,
  longitudinalAxis,
  moodTrail,
  stepChain,
  type CellState,
} from '@/instruments/futurenow/checkin/journey';

const gray = { color: 'var(--color-text-muted)' } as const;
const sub = { color: 'var(--color-text-secondary)' } as const;

// 인도자에게는 **사실**이다. 참여자 화면(C)은 같은 상태를 다른 낱말로 쓴다 — 거기서는 판정이 되기 때문이다.
const STATE_TEXT: Record<CellState, string> = {
  submitted: '',
  drafting: '(작성 중)',
  empty: '(미착수)',
  notopen: '(아직 열리지 않음)',
};
// 격자와 같은 기호 — 색이 아니라 형태로 가른다(성적표가 되지 않게).
const MARK: Record<CellState, string> = { submitted: '●', drafting: '◐', empty: '○', notopen: '·' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 'var(--space-6)' }}>
      <h2 className="t-h2" style={{ color: 'var(--color-primary)', fontSize: 17, margin: '0 0 var(--space-3)' }}>{title}</h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: 'var(--space-3) 0', borderTop: 'var(--border-hair) solid var(--color-border)' }}>{children}</div>
  );
}

export function MemberJourney({
  cohortId,
  userId,
  name,
  cohortName,
  sessions,
  rows,
  photos,
  reportId,
  nowIso,
}: {
  cohortId: string;
  userId: string;
  name: string;
  cohortName: string;
  sessions: CohortSession[];
  rows: CheckinRecord[];
  photos: Record<number, CheckinPhoto[]>;
  reportId: string | null;
  nowIso: string;
}) {
  const now = new Date(nowIso);
  const ordered = [...sessions].sort((a, b) => a.sessionNo - b.sessionNo);
  const byNo = new Map(rows.map((r) => [r.sessionNo, r]));
  const progress = journeyProgress(rows, ordered, now);
  const axis = longitudinalAxis(rows, ordered, now);
  const chain = stepChain(rows);
  const moods = moodTrail(rows);
  const { notes, contactSessions } = facilitatorNotes(rows);
  const signals = checkinSignals(rows, ordered, now);

  return (
    <div>
      {/* ① 머리 — 이름·차수·진행. 회차 수는 cohort_sessions 가 정한다(7로 박지 않는다). */}
      <div style={{ borderBottom: 'var(--border-hair) solid var(--color-border)', paddingBottom: 'var(--space-4)' }}>
        <div className="t-h2" style={{ color: 'var(--color-text)', fontSize: 20 }}>
          {name}
          {cohortName ? <span className="t-caption" style={{ ...gray, marginLeft: 'var(--space-2)' }}>· {cohortName}</span> : null}
        </div>
        {/* 두 문서가 서로를 알되 섞이지 않는다 — 리포트가 없으면 버튼을 그리지 않는다. */}
        {reportId ? (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <a
              className="t-caption"
              href={`/coach/cohort/${cohortId}/report/${reportId}`}
              style={{ display: 'inline-block', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius)', border: 'var(--border-hair) solid var(--color-border)', color: 'var(--color-primary)', textDecoration: 'none' }}
            >
              사전 체크 리포트 보기
            </a>
          </div>
        ) : null}
        <div className="t-caption" style={{ ...sub, marginTop: 'var(--space-3)' }}>
          <span style={{ letterSpacing: 2, marginRight: 'var(--space-2)' }}>
            {ordered.map((s) => MARK[cellState(byNo.get(s.sessionNo) ?? null, s, now)]).join('')}
          </span>
          {progress.total}회차 · 제출 {progress.submitted} · 작성 중 {progress.drafting}
          {progress.open > 0 ? ` · 미착수 ${progress.open}` : ''}
          {progress.notopen > 0 ? ` · 남은 ${progress.notopen}회차` : ''}
        </div>
      </div>

      {/* ⑥ 신호 — 판정만 보이면 인도자가 이유를 다시 찾는다. 근거를 함께 싣는다. */}
      {signals.length > 0 ? (
        <Section title="신호">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {signals.map((s) => (
              <div
                key={s.kind}
                style={{
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius)',
                  border: `${s.tier === 'primary' ? 1.5 : 'var(--border-hair)'}px solid ${s.tier === 'care' ? 'var(--care-text)' : 'var(--color-border)'}`,
                }}
              >
                <span
                  className="t-body"
                  style={{ color: s.tier === 'care' ? 'var(--care-text)' : 'var(--color-text)', fontWeight: s.tier === 'primary' || s.tier === 'care' ? 700 : 400 }}
                >
                  {s.reason}
                </span>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {/* ② 종단 축 — 이 화면의 존재 이유다. 라벨은 summaryFields 원문(새 문안 0). */}
      <Section title="종단 축">
        {axis.map((a) => (
          <Row key={a.sessionNo}>
            <div className="t-caption" style={gray}>
              {a.sessionNo}회차{a.label ? ` · ${a.label}` : ''}
            </div>
            {a.value === null ? (
              <div className="t-body" style={gray}>{STATE_TEXT[a.state] || '(비어 있음)'}</div>
            ) : a.value.kind === 'pair' ? (
              <div className="t-body" style={{ color: 'var(--color-text)' }}>
                {a.value.from} <span style={gray}>→</span> {a.value.to}
              </div>
            ) : (
              <div className="t-body" style={{ color: 'var(--color-text)', whiteSpace: 'pre-line' }}>{a.value.text}</div>
            )}
          </Row>
        ))}
      </Section>

      {/* ③ 한 걸음의 연쇄 — 자신감은 숫자만. 미응답은 '—'(빈칸은 0으로 오해된다). */}
      {chain.length > 0 ? (
        <Section title="한 걸음의 연쇄">
          {chain.map((s) => (
            <Row key={s.sessionNo}>
              <div className="t-caption" style={gray}>{s.sessionNo}회차</div>
              <div className="t-body" style={{ color: 'var(--color-text)' }}>
                {s.what || '—'}
                {s.when ? <span style={sub}> · {s.when}</span> : null}
              </div>
              <div className="t-caption" style={{ ...sub, marginTop: 2 }}>
                결산 {s.result || '—'} · 자신감 <span className="tnum">{s.confidence === null ? '—' : s.confidence}</span>
              </div>
            </Row>
          ))}
        </Section>
      ) : null}

      {/* ④ 마음의 궤적 — 칩과 직접 쓰기를 함께(ADR-101). */}
      {moods.length > 0 ? (
        <Section title="마음의 궤적">
          {moods.map((m) => (
            <Row key={m.sessionNo}>
              <div className="t-caption" style={gray}>{m.sessionNo}회차</div>
              <div className="t-body" style={{ color: 'var(--color-text)' }}>
                {[...m.words, m.custom].filter(Boolean).join(' · ')}
              </div>
            </Row>
          ))}
        </Section>
      ) : null}

      {/* ⑤ 인도자에게 남긴 말 — 익명 제안은 여기 오지 않는다(journey.ts facilitatorNotes 주석). */}
      {notes.length > 0 || contactSessions.length > 0 ? (
        <Section title="인도자에게 남긴 말">
          {notes.map((n, i) => (
            <Row key={`${n.sessionNo}-${i}`}>
              <div className="t-caption" style={gray}>{n.sessionNo}회차 · {n.label}</div>
              <div className="t-body" style={{ color: 'var(--color-text)', whiteSpace: 'pre-line' }}>{n.text}</div>
            </Row>
          ))}
          {contactSessions.length > 0 ? (
            <Row>
              <div className="t-body" style={{ color: 'var(--care-text)', fontWeight: 600 }}>
                {contactSessions.join('·')}회차 연락 요청
              </div>
            </Row>
          ) : null}
        </Section>
      ) : null}

      {/* ⑦ 회차별 전문 — readModel·CheckinReadView 를 audience='facilitator' 로 재사용(문안 0). */}
      <Section title="회차별 전문">
        {ordered.map((s) => {
          const r = byNo.get(s.sessionNo) ?? null;
          const state = cellState(r, s, now);
          if (!r || !getCheckinSession(s.sessionNo)) {
            return (
              <Row key={s.sessionNo}>
                <span className="t-caption" style={gray}>{s.sessionNo}회차 {STATE_TEXT[state] || '(문안 준비 중)'}</span>
              </Row>
            );
          }
          const blocks = buildCheckinRead(
            s.sessionNo,
            r.answers,
            { stepPrivate: r.stepPrivate, suggestionAnon: r.suggestionAnon, contactRequest: r.contactRequest },
            'facilitator',
          );
          return (
            <details key={s.sessionNo} className="journey-full" style={{ borderTop: 'var(--border-hair) solid var(--color-border)', padding: 'var(--space-3) 0' }}>
              <summary className="t-caption" style={{ ...sub, cursor: 'pointer' }}>
                {s.sessionNo}회차 전문 {STATE_TEXT[state]}
              </summary>
              <div style={{ marginTop: 'var(--space-3)' }}>
                <CheckinReadView blocks={blocks} photos={photos[s.sessionNo] ?? []} />
              </div>
            </details>
          );
        })}
      </Section>

      <p className="t-caption" style={{ ...gray, marginTop: 'var(--space-6)' }}>
        인도자·운영자 전용 화면입니다. 참여자에게는 보이지 않습니다.
      </p>
      <span hidden data-user={userId} />
    </div>
  );
}
