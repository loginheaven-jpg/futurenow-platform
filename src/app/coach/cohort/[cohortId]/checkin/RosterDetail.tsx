'use client';
// 인도자 명단 행 펼침(ADR-86). 행을 그 자리에서 열어 그 사람의 갈무리 전 항목을 본다 — 라우트 이동 0·서버 왕복 0.
//   데이터는 listCohortCheckins 가 이미 answers 를 통째로 가져왔고 서버에서 ReadBlock[] 으로 바꿔 내려온다.
//   copy 객체를 prop 으로 받지 않는다(filledCount·counter 가 함수 → 직렬화 파손. ADR-85 digest 3203392472).
//   펼친 내용은 열었을 때만 렌더한다 — 12명 전문이 접힌 채 DOM 에 상주하면 어깨너머 노출·Ctrl+F 면적이 커진다.
import { useState } from 'react';
import type { CheckinPhoto } from '@/contracts';
import type { ReadBlock } from '@/instruments/futurenow/checkin/readModel';
import { CheckinReadView } from '@/instruments/futurenow/checkin/CheckinReadView';

export type RosterEntry = {
  userId: string;
  name: string;
  status: string;
  late: boolean;
  contact: boolean;
  hasRow: boolean;
  blocks: ReadBlock[];
  photos: CheckinPhoto[];
};

// 다른 회차로 — 펼친 사람을 물고 이동한다(?session=N&open={userId}). 링크만이라 서버 왕복은 페이지 이동 1회.
function SessionTabs({ cohortId, sessionNos, current, userId, label }: { cohortId: string; sessionNos: number[]; current: number; userId: string; label: string }) {
  if (sessionNos.length < 2) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center', paddingTop: 'var(--space-3)' }}>
      <span className="t-caption" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      {sessionNos.map((n) => (
        <a
          key={n}
          href={`/coach/cohort/${cohortId}/checkin?session=${n}&open=${userId}`}
          className="t-caption"
          style={{
            padding: '4px var(--space-3)', borderRadius: 'var(--radius)', textDecoration: 'none',
            border: `var(--border-hair) solid ${n === current ? 'var(--color-primary)' : 'var(--color-border)'}`,
            color: n === current ? 'var(--color-primary)' : 'var(--color-text-secondary)',
          }}
        >
          {n}회차
        </a>
      ))}
    </div>
  );
}

function Row({ entry, initialOpen, tabs }: { entry: RosterEntry; initialOpen: boolean; tabs: React.ReactNode }) {
  const [open, setOpen] = useState(initialOpen);
  // 펼침 가능 여부는 '갈무리 행이 있는가'로만 판정한다 — 내용 유무로 갈리면 부채널이 된다.
  //   익명 '바라는 점'만 쓴 사람은 개인 상세가 비므로(익명분은 여기 싣지 않는다),
  //   내용 기준으로 화살표를 감추면 명단만 훑어도 그가 익명 제보자임이 드러난다.
  const expandable = entry.hasRow;

  const head = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', width: '100%' }}>
      <span className="t-body" style={{ flex: 1, color: 'var(--color-text)', textAlign: 'left' }}>{entry.name}</span>
      <span className="t-caption" style={{ color: 'var(--color-text-secondary)' }}>{entry.status}</span>
      {entry.late ? <span className="t-caption" style={{ color: 'var(--color-care, var(--color-text-muted))' }}>지각</span> : null}
      {entry.contact ? <span className="t-caption" style={{ color: 'var(--color-care, var(--color-primary))' }}>연락 요청</span> : null}
      {expandable ? <span className="t-caption" style={{ color: 'var(--color-text-muted)' }} aria-hidden>{open ? '▲' : '▼'}</span> : null}
    </div>
  );

  if (!expandable) return <div style={{ display: 'flex', minHeight: 'var(--tap-min)', alignItems: 'center' }}>{head}</div>;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{ width: '100%', minHeight: 'var(--tap-min)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      >
        {head}
      </button>
      {open ? (
        <div style={{ padding: 'var(--space-2) 0 var(--space-4)' }}>
          <CheckinReadView blocks={entry.blocks} photos={entry.photos} />
          {tabs}
        </div>
      ) : null}
    </div>
  );
}

/** 명단 + 행 펼침. openUserId 는 회차를 옮겨도 같은 사람이 펼쳐진 채 남게 한다(?open=).
 *  prop 은 전부 순수 데이터다 — 함수·copy 객체를 경계 너머로 넘기지 않는다. */
export function RosterDetail({
  entries,
  openUserId,
  cohortId,
  sessionNos,
  currentSession,
  tabsLabel,
}: {
  entries: RosterEntry[];
  openUserId: string | null;
  cohortId: string;
  sessionNos: number[];
  currentSession: number;
  tabsLabel: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {entries.map((e) => (
        <Row
          key={e.userId}
          entry={e}
          initialOpen={e.userId === openUserId}
          tabs={<SessionTabs cohortId={cohortId} sessionNos={sessionNos} current={currentSession} userId={e.userId} label={tabsLabel} />}
        />
      ))}
    </div>
  );
}
