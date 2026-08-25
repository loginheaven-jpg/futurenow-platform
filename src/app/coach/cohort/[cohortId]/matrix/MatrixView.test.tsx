import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { CheckinRecord, CohortSession, MemberRef } from '@/contracts';
import { MatrixView } from './MatrixView';

const CO = 'co1';
const session = (no: number, d: number): CohortSession => ({
  cohortId: CO,
  sessionNo: no,
  heldAt: `2026-07-${String(d).padStart(2, '0')}T00:00:00Z`,
  opensAt: `2026-07-${String(d).padStart(2, '0')}T00:00:00Z`,
  closesAt: `2026-07-${String(d + 6).padStart(2, '0')}T23:59:59Z`,
});
const SESSIONS = [session(1, 1), session(2, 8), session(3, 15), session(4, 22), session(5, 29)];
const NOW = '2026-07-25T12:00:00Z'; // 1~3 마감 · 4 열림 · 5 아직

const MEMBERS: MemberRef[] = [
  { userId: 'u1', name: '김참여' },
  { userId: 'u2', name: '이참여' },
  { userId: 'u3', name: null },
];

const row = (uid: string, no: number, over: Partial<CheckinRecord> = {}): CheckinRecord => ({
  id: `${uid}-${no}`,
  cohortId: CO,
  userId: uid,
  sessionNo: no,
  answers: {},
  stepPrivate: false,
  shareConsent: false,
  suggestionAnon: false,
  contactRequest: false,
  promptedAt: null,
  promptCount: 0,
  hasContent: true,
  firstOpenedAt: null,
  deepOpened: false,
  submittedAt: '2026-07-05T00:00:00Z',
  editCount: 0,
  updatedAt: '2026-07-05T00:00:00Z',
  ...over,
});

// u1 전부 제출(신호 없음) · u2 2·3 미착수(연속 미착수) · u3 2회차 작성 중 방치
const ROWS = [
  row('u1', 1), row('u1', 2), row('u1', 3), row('u1', 4),
  row('u2', 1), row('u2', 4),
  row('u3', 1), row('u3', 2, { submittedAt: null, hasContent: true }), row('u3', 3), row('u3', 4),
];

const html = renderToStaticMarkup(
  <MatrixView cohortId={CO} members={MEMBERS} sessions={SESSIONS} rows={ROWS} nowIso={NOW} />,
);

describe('화면 B 격자', () => {
  it('행 수 = 명단 수 · 열 = 회차 수', () => {
    expect((html.match(/<tr/g) ?? []).length).toBe(MEMBERS.length + 1); // 머리 한 줄 포함
    for (const s of SESSIONS) expect(html).toContain(`${s.sessionNo}회차 제출`.slice(0, 3)); // aria-label 에 회차
  });

  it('상태 네 기호가 다 나온다', () => {
    for (const mark of ['●', '◐', '○', '·']) expect(html, mark).toContain(mark);
  });

  it('색으로 상태를 구분하지 않는다 — 의미색 0', () => {
    for (const token of ['--care', '--color-success', '--color-danger', '--green', '--red', '--amber', '--gold']) {
      expect(html, token).not.toContain(token);
    }
  });

  it('신호가 있는 행에만 왼쪽 표식 — 색이 아니라 세로 막대', () => {
    // u2(연속 미착수) · u3(작성 중 방치) 둘만. u1 은 전부 제출이라 없다.
    //   `살펴볼 사람` 은 범례에도 한 번 나오므로 **표에서만** 센다.
    const table = html.slice(0, html.indexOf('</table>'));
    expect((table.match(/살펴볼 사람/g) ?? []).length).toBe(2);
    expect((table.match(/background:var\(--color-primary\)/g) ?? []).length).toBe(2);
    expect(html.slice(html.indexOf('</table>'))).toContain('살펴볼 사람'); // 범례가 뜻을 설명한다
  });

  it('신호로 정렬하지 않는다 — 명단 순서 그대로', () => {
    expect(html.indexOf('김참여')).toBeLessThan(html.indexOf('이참여'));
    expect(html.indexOf('이참여')).toBeLessThan(html.indexOf('이름 미입력'));
  });

  it('칸 → 회차 현황 · 이름 → 세로 보기', () => {
    expect(html).toContain(`href="/coach/cohort/${CO}/checkin?session=3&amp;open=u2"`);
    expect(html).toContain(`href="/coach/cohort/${CO}/member/u1"`);
  });

  it('마감·열린 회차를 머리 색이 아니라 캡션으로 구분한다', () => {
    expect(html).toContain('마감된 회차 1·2·3');
    expect(html).toContain('열린 회차 4');
  });

  it('칸이 손가락 크기다 — 격자는 눌러 들어가는 도구다', () => {
    expect(html).toContain('min-height:var(--tap-min)');
  });
});
