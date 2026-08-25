// 화면 B 본문(ADR-118) — 명단 × 회차 격자.
//
// 용도가 셋이다: 이탈 조기 발견 · 소그룹 편성 · 오늘 연락할 사람 고르기.
//
// **색을 뿌리지 않는다.** 성적표가 된다 — 상태는 기호로, 신호는 행 왼쪽 표식으로.
// **신호로 정렬하지 않는다.** 순위가 된다. 행은 기존 명단 순서 그대로.
import type { CheckinRecord, CohortSession, MemberRef } from '@/contracts';
import { cellState, checkinSignals, type CellState } from '@/instruments/futurenow/checkin/journey';

const MARK: Record<CellState, string> = { submitted: '●', drafting: '◐', empty: '○', notopen: '·' };
const LABEL: Record<CellState, string> = { submitted: '제출', drafting: '작성 중', empty: '미착수', notopen: '아직 안 열림' };

export function MatrixView({
  cohortId,
  members,
  sessions,
  rows,
  nowIso,
}: {
  cohortId: string;
  members: MemberRef[];
  sessions: CohortSession[];
  rows: CheckinRecord[];
  nowIso: string;
}) {
  const now = new Date(nowIso);
  const ordered = [...sessions].sort((a, b) => a.sessionNo - b.sessionNo);
  const byUser = new Map<string, CheckinRecord[]>();
  for (const r of rows) byUser.set(r.userId, [...(byUser.get(r.userId) ?? []), r]);

  return (
    <div>
      {/* 인원이 늘면 가로가 아니라 세로로 늘어난다 — 열은 회차 수라 고정이고 행만 는다. */}
      <div style={{ overflowX: 'auto' }}>
        <table className="tnum" style={{ borderCollapse: 'collapse', width: '100%', minWidth: 320 }}>
          <thead>
            <tr>
              <th scope="col" className="t-caption" style={{ textAlign: 'left', padding: 'var(--space-2)', color: 'var(--color-text-secondary)', fontWeight: 400 }}>
                이름
              </th>
              {ordered.map((s) => (
                <th key={s.sessionNo} scope="col" className="t-caption" style={{ padding: 'var(--space-2)', color: 'var(--color-text-secondary)', fontWeight: 400, minWidth: 34 }}>
                  {s.sessionNo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const mine = byUser.get(m.userId) ?? [];
              // 신호 유무만 본다 — 어느 신호인지는 세로 보기에서 읽는다(격자는 고르는 도구다).
              const flagged = checkinSignals(mine, ordered, now).length > 0;
              return (
                <tr key={m.userId} style={{ borderTop: 'var(--border-hair) solid var(--color-border)' }}>
                  <th scope="row" style={{ textAlign: 'left', padding: 0, fontWeight: 400 }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {/* 살펴볼 사람 — 색이 아니라 세로 막대. 색을 쓰면 격자가 성적표가 된다. */}
                      <span
                        aria-hidden
                        style={{ width: 3, alignSelf: 'stretch', minHeight: 'var(--tap-min)', background: flagged ? 'var(--color-primary)' : 'transparent', marginRight: 'var(--space-2)' }}
                      />
                      <a
                        className="t-body"
                        href={`/coach/cohort/${cohortId}/member/${m.userId}`}
                        style={{ color: 'var(--color-text)', textDecoration: 'none', padding: 'var(--space-2) 0', display: 'inline-block' }}
                      >
                        {m.name ?? '이름 미입력'}
                        {flagged ? <span className="t-caption" style={{ color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)' }}>살펴볼 사람</span> : null}
                      </a>
                    </div>
                  </th>
                  {ordered.map((s) => {
                    const st = cellState(mine.find((r) => r.sessionNo === s.sessionNo) ?? null, s, now);
                    return (
                      <td key={s.sessionNo} style={{ textAlign: 'center', padding: 0 }}>
                        <a
                          href={`/coach/cohort/${cohortId}/checkin?session=${s.sessionNo}&open=${m.userId}`}
                          aria-label={`${m.name ?? '이름 미입력'} ${s.sessionNo}회차 ${LABEL[st]}`}
                          title={LABEL[st]}
                          style={{ display: 'block', minHeight: 'var(--tap-min)', lineHeight: 'var(--tap-min)', color: st === 'notopen' ? 'var(--color-text-muted)' : 'var(--color-text)', textDecoration: 'none' }}
                        >
                          {MARK[st]}
                        </a>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 범례 — 기호의 뜻과 열 머리의 마감 여부. 머리 색이 아니라 캡션으로 구분한다. */}
      <div className="t-caption" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-4)', lineHeight: 1.9 }}>
        <div>● 제출 &nbsp; ◐ 작성 중 &nbsp; ○ 미착수 &nbsp; · 아직 안 열림</div>
        <div>왼쪽 세로 막대 = 살펴볼 사람 &nbsp;·&nbsp; 이름을 누르면 그 사람의 전 회차, 칸을 누르면 그 회차 현황</div>
        <div style={{ color: 'var(--color-text-muted)' }}>
          마감된 회차 {ordered.filter((s) => now.getTime() > Date.parse(s.closesAt)).map((s) => s.sessionNo).join('·') || '없음'}
          {' · '}열린 회차 {ordered.filter((s) => now.getTime() >= Date.parse(s.opensAt) && now.getTime() <= Date.parse(s.closesAt)).map((s) => s.sessionNo).join('·') || '없음'}
        </div>
      </div>
    </div>
  );
}
