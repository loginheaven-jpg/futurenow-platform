import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { CheckinRecord, CohortSession } from '@/contracts';
import { MyJourney } from './MyJourney';
import { MemberJourney } from '@/app/coach/cohort/[cohortId]/member/[userId]/MemberJourney';
import { getCheckinSession } from '@/instruments/futurenow/checkin';

// **배달 검증**(ADR-109 교훈) — 순수 함수가 옳은 값을 내도 컴포넌트가 다른 경로로 그릴 수 있다.
//   ADR-109 에서 심화 placeholder 가 문안에 선언돼 있는데 렌더가 안 넘겨 화면에 안 나왔고,
//   리터럴 잠금·copyBaseline·금지어 검사가 **전부 통과**했다. 그래서 산출물 자체를 단언한다.
//   §8 이 "화면 분기라 타입이 안 잡는다"고 썼는데, 순수 함수 테스트도 안 잡는다.

const CO = 'co1';
const session = (no: number, d: number): CohortSession => ({
  cohortId: CO,
  sessionNo: no,
  heldAt: `2026-07-${String(d).padStart(2, '0')}T00:00:00Z`,
  opensAt: `2026-07-${String(d).padStart(2, '0')}T00:00:00Z`,
  closesAt: `2026-07-${String(d + 6).padStart(2, '0')}T23:59:59Z`,
});
const SESSIONS = [session(1, 1), session(2, 8), session(3, 15), session(4, 22)];
const NOW = '2026-07-25T12:00:00Z';

const box2 = getCheckinSession(2)!.wrap.facilitatorBox;
const row = (no: number, over: Partial<CheckinRecord> = {}): CheckinRecord => ({
  id: `r${no}`,
  cohortId: CO,
  userId: 'u1',
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

// 인도자 화면이라면 셋을 전부 켜는 자료 — 자신감 급락 · 남긴 말 · 연락 요청 · 작성 중 방치.
const LOUD: CheckinRecord[] = [
  row(1, { answers: { confidence: 9, step_what: '조감도 다시 보기', desire_from: '전', desire_to: '후' } }),
  row(2, {
    answers: { confidence: 2, identity_statement: '나는 잇는 사람이다', [box2.need.key]: '자료 미리 주세요' },
    contactRequest: true,
  }),
  row(3, { submittedAt: null, hasContent: true, answers: { mood: ['설렘'] } }), // 마감 지난 작성 중
];

const props = {
  cohortId: CO,
  cohortName: '예봄 1기',
  sessions: SESSIONS,
  rows: LOUD,
  photos: {},
  reportHref: `/my/cohorts/${CO}/report`,
  nowIso: NOW,
};

// 제외 셋은 **편집 블록**(종단 축·한 걸음·마음)에 관한 것이다. ⑦ 회차별 전문은 §5-3 표가
//   `self` 로 명시했고, 그것은 참여자가 자기 글을 되읽는 기존 열람 화면과 같은 렌더다
//   (`/my/cohorts/[id]/checkin/[n]` 에서 이미 보이는 것 — 새로 노출되는 정보가 0이다).
//   ADR-86 이 막은 것은 **자기 숫자 다섯이 세로로 서서 추이 그래프가 되는 것**이지,
//   접힌 회차 안에 자기가 적은 한 값이 있는 것이 아니다. 그래서 단언을 그 경계에 맞춘다.
const beforeFull = (h: string) => h.slice(0, h.indexOf('회차별 전문'));

describe('화면 C 배달 검증 — 편집 블록에 자신감·남긴 말·신호가 없다', () => {
  const html = renderToStaticMarkup(<MyJourney {...props} />);
  const edited = beforeFull(html);

  it('경계가 실재한다 — 전문 블록이 뒤에 있다', () => {
    expect(html).toContain('회차별 전문');
    expect(edited.length).toBeGreaterThan(200);
  });

  it('자신감이 없다 — 숫자도 라벨도', () => {
    expect(edited).not.toContain('자신감');
    expect(edited).not.toContain('아직 자신 없음'); // confidence 척도 라벨
  });

  it('인도자에게 남긴 말이 없다', () => {
    expect(edited).not.toContain('인도자에게');
    expect(edited).not.toContain('자료 미리 주세요'); // need 원문
    expect(edited).not.toContain(box2.need.label);
  });

  it('신호가 없다 — 판정도 근거도', () => {
    expect(edited).not.toContain('신호');
    expect(edited).not.toContain('급락');
    expect(edited).not.toContain('미착수'); // 인도자 낱말
    expect(edited).not.toContain('작성 중(마감 지남)');
    expect(edited).not.toContain('연락 요청');
    // 신호 블록은 화면 전체 어디에도 없다 — 전문은 readModel 이 그리므로 신호가 낄 자리가 없다.
    expect(html).not.toContain('회차 미착수');
  });

  it('⑦ 전문은 self 렌더다 — facilitator 가 아니다', () => {
    // readModel:202 — 익명 체크 상태는 **본인에게만** 보인다. 그 줄이 있으면 self 다.
    const anon = renderToStaticMarkup(
      <MyJourney {...props} rows={[row(2, { answers: { [box2.suggestion.key]: '조금 천천히' }, suggestionAnon: true })]} />,
    );
    expect(anon).toContain(box2.suggestionAnon.label);
    expect(anon).toContain('조금 천천히'); // 본인은 자기 익명 제안을 읽는다
  });

  it('가드가 헛돌지 않았다 — 같은 자료로 화면 A 는 셋을 전부 그린다', () => {
    const a = renderToStaticMarkup(
      <MemberJourney cohortId={CO} userId="u1" name="참여자" sessions={SESSIONS} rows={LOUD} photos={{}} reportId={null} nowIso={NOW} />,
    );
    expect(a).toContain('자신감');
    expect(a).toContain('자료 미리 주세요');
    expect(a).toContain('신호');
    expect(a).toContain('급락'); // 1→2 9→2, 낙폭 7
    expect(a).toContain('연락 요청');
  });
});

describe('화면 C 편집 — 참여자 낱말과 링크', () => {
  const html = renderToStaticMarkup(<MyJourney {...props} />);

  it('상태 문구가 참여자 낱말이다', () => {
    expect(html).toContain('이어서 쓰기'); // 3회차 작성 중
    expect(html).toContain('아직 비어 있어요'); // 4회차 미착수
    expect(html).not.toContain('(작성 중)'); // 인도자 낱말
  });

  it('아직 안 열린 회차는 「곧 열립니다」이고 링크가 아니다', () => {
    const future = renderToStaticMarkup(<MyJourney {...props} sessions={[...SESSIONS, session(5, 29)]} />);
    expect(future).toContain('곧 열립니다');
    expect(future).not.toContain(`/my/cohorts/${CO}/checkin/5`);
  });

  it('빈 칸이 카드로 가는 링크다', () => {
    expect(html).toContain(`href="/my/cohorts/${CO}/checkin/4?edit=1"`); // 미착수 → 카드
    expect(html).toContain(`href="/my/cohorts/${CO}/checkin/3?edit=1"`); // 작성 중 → 이어 쓰기
  });

  it('종단 축은 화면 A 와 같은 조립이다', () => {
    expect(html).toContain('인생의 한 문장'); // AXIS_INDEX[2]=1
    expect(html).toContain('나는 잇는 사람이다');
    expect(html).toContain('전'); // 1회차 pair
  });

  it('맨 아래 한 줄이 왜 계속 쓰는가를 말한다', () => {
    expect(html).toContain('여기 쌓인 것이 마지막 시간의 재료가 됩니다.');
  });
});
