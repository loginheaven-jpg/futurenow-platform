// 화면 C 본문(ADR-118) — 참여자 세로 보기. 화면 A 와 **같은 데이터, 다른 편집**이다.
//
// 빠지는 셋(§5-3). 실수로 들어가면 ADR-86·80 위반이고 화면 분기라 타입이 안 잡는다 —
//   `MyJourney.test.tsx` 가 **렌더 산출물**로 잠근다(ADR-109 배달 검증).
//   · **실행 자신감** — 자기 숫자 다섯 개가 세로로 서면 그 자체가 추이 그래프가 되고,
//     ADR-86 이 `막대·게이지·색·백분위·평균·정렬키 금지`로 막은 것이 정확히 그 효과다.
//     1기 실측에서 제출 24건 중 16건(67%)이 채워져 있어 **실제로 그래프가 그려진다.**
//   · **인도자에게 남긴 말** · **신호** — 인도자 판단의 재료이지 자기 점검의 재료가 아니다.
//
// 상태 문구도 다르다. 인도자에게는 사실이고 참여자에게는 판정이 된다.
//   그리고 **빈 칸은 링크여야 한다** — 자기 점검의 결과가 행동으로 이어지지 않으면 점검이 아니다.
import Link from 'next/link';
import type { CheckinPhoto, CheckinRecord, CohortSession } from '@/contracts';
import { JourneyCollapsible } from '@/app/_screens/JourneyCollapsible';
import { CheckinReadView } from '@/instruments/futurenow/checkin/CheckinReadView';
import { buildCheckinRead } from '@/instruments/futurenow/checkin/readModel';
import { getCheckinSession } from '@/instruments/futurenow/checkin';
import { cellState, journeyProgress, longitudinalAxis, moodTrail, stepChain, type CellState } from '@/instruments/futurenow/checkin/journey';

const gray = { color: 'var(--color-text-muted)' } as const;
const sub = { color: 'var(--color-text-secondary)' } as const;

/** 화면 A 와 같은 상태, 다른 낱말. `미착수`는 참여자에게 판정이 된다. */
const STATE_TEXT: Record<CellState, string> = {
  submitted: '',
  drafting: '이어서 쓰기',
  empty: '아직 비어 있어요',
  notopen: '곧 열립니다',
};
/** 열려 있고 아직 못 쓴 자리만 링크다 — 아직 안 열린 회차는 갈 곳이 없다. */
const LINKABLE: Record<CellState, boolean> = { submitted: false, drafting: true, empty: true, notopen: false };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 'var(--space-6)' }}>
      <h2 className="t-h2" style={{ color: 'var(--color-primary)', fontSize: 17, margin: '0 0 var(--space-3)' }}>{title}</h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: 'var(--space-3) 0', borderTop: 'var(--border-hair) solid var(--color-border)' }}>{children}</div>;
}

export function MyJourney({
  cohortId,
  cohortName,
  sessions,
  rows,
  photos,
  reportHref,
  nowIso,
}: {
  cohortId: string;
  cohortName: string;
  sessions: CohortSession[];
  rows: CheckinRecord[];
  photos: Record<number, CheckinPhoto[]>;
  reportHref: string | null;
  nowIso: string;
}) {
  const now = new Date(nowIso);
  const ordered = [...sessions].sort((a, b) => a.sessionNo - b.sessionNo);
  const byNo = new Map(rows.map((r) => [r.sessionNo, r]));
  const progress = journeyProgress(rows, ordered, now);
  const axis = longitudinalAxis(rows, ordered, now);
  const chain = stepChain(rows);
  const moods = moodTrail(rows);

  const cardHref = (no: number, state: CellState) =>
    `/my/cohorts/${cohortId}/checkin/${no}${state === 'drafting' || state === 'empty' ? '?edit=1' : ''}`;

  /** 값이 없는 자리 — 링크가 되는 상태면 눌러서 바로 그 카드로 간다. */
  const StateLine = ({ no, state }: { no: number; state: CellState }) => {
    const text = STATE_TEXT[state] || '아직 비어 있어요';
    return LINKABLE[state] ? (
      <Link className="t-body" href={cardHref(no, state)} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
        {text} →
      </Link>
    ) : (
      <span className="t-body" style={gray}>{text}</span>
    );
  };

  return (
    <div>
      {/* 머리 — 진행. 숫자는 세지만 등급을 만들지 않는다. */}
      <div style={{ borderBottom: 'var(--border-hair) solid var(--color-border)', paddingBottom: 'var(--space-4)' }}>
        <div className="t-h2" style={{ color: 'var(--color-text)', fontSize: 20 }}>나의 기록</div>
        {cohortName ? <div className="t-caption" style={gray}>{cohortName}</div> : null}
        <div className="t-caption" style={{ ...sub, marginTop: 'var(--space-2)' }}>
          {progress.total}회차 중 {progress.submitted}회차를 남기셨어요
          {progress.drafting > 0 ? ` · 쓰다 만 것 ${progress.drafting}` : ''}
        </div>
        {reportHref ? (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <Link
              className="t-caption"
              href={reportHref}
              style={{ display: 'inline-block', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius)', border: 'var(--border-hair) solid var(--color-border)', color: 'var(--color-primary)', textDecoration: 'none' }}
            >
              내 리포트 보기
            </Link>
          </div>
        ) : null}
      </div>

      {/* 종단 축 — 화면 A 와 같은 조립(journey.ts). 라벨은 문안 원문. */}
      <Section title="한 줄로 이어 보기">
        {axis.map((a) => (
          <Row key={a.sessionNo}>
            <div className="t-caption" style={gray}>
              {a.sessionNo}회차{a.label ? ` · ${a.label}` : ''}
            </div>
            {a.value === null ? (
              <StateLine no={a.sessionNo} state={a.state} />
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

      {/* 한 걸음 — **결산만.** 자신감은 싣지 않는다(§5-3). */}
      {chain.length > 0 ? (
        <Section title="한 걸음">
          {chain.map((s) => (
            <Row key={s.sessionNo}>
              <div className="t-caption" style={gray}>{s.sessionNo}회차</div>
              <div className="t-body" style={{ color: 'var(--color-text)' }}>
                {s.what || '—'}
                {s.when ? <span style={sub}> · {s.when}</span> : null}
              </div>
              {s.result ? <div className="t-caption" style={{ ...sub, marginTop: 2 }}>{s.result}</div> : null}
            </Row>
          ))}
        </Section>
      ) : null}

      {/* 마음 */}
      {moods.length > 0 ? (
        <Section title="마음의 궤적">
          {moods.map((m) => (
            <Row key={m.sessionNo}>
              <div className="t-caption" style={gray}>{m.sessionNo}회차</div>
              <div className="t-body" style={{ color: 'var(--color-text)' }}>{[...m.words, m.custom].filter(Boolean).join(' · ')}</div>
            </Row>
          ))}
        </Section>
      ) : null}

      {/* 회차별 전문 — audience='self'. 익명 체크 상태는 본인에게만 보인다(readModel). */}
      <Section title="회차별 전문">
        {ordered.map((s) => {
          const r = byNo.get(s.sessionNo) ?? null;
          const state = cellState(r, s, now);
          if (!r || !getCheckinSession(s.sessionNo)) {
            return (
              <Row key={s.sessionNo}>
                <div className="t-caption" style={gray}>{s.sessionNo}회차</div>
                <StateLine no={s.sessionNo} state={state} />
              </Row>
            );
          }
          const blocks = buildCheckinRead(
            s.sessionNo,
            r.answers,
            { stepPrivate: r.stepPrivate, suggestionAnon: r.suggestionAnon, contactRequest: r.contactRequest },
            'self',
          );
          return (
            <JourneyCollapsible key={s.sessionNo} label={`${s.sessionNo}회차`}>
              <CheckinReadView blocks={blocks} photos={photos[s.sessionNo] ?? []} />
              <div style={{ marginTop: 'var(--space-3)' }}>
                <Link className="t-caption no-print" href={cardHref(s.sessionNo, state)} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                  고쳐 쓰기 →
                </Link>
              </div>
            </JourneyCollapsible>
          );
        })}
      </Section>

      {/* 자기 점검을 넘어 **왜 계속 쓰는가**를 말한다(ADR-102 축2). */}
      <p className="t-body" style={{ ...sub, marginTop: 'var(--space-6)', textAlign: 'center' }}>
        여기 쌓인 것이 마지막 시간의 재료가 됩니다.
      </p>
    </div>
  );
}
