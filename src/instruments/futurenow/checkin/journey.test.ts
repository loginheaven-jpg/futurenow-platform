import { describe, expect, it } from 'vitest';
import type { CheckinRecord, CohortSession } from '@/contracts';
import { AXIS_INDEX, CONFIDENCE_DROP, cellState, checkinSignals, facilitatorNotes, journeyProgress, longitudinalAxis, moodTrail, stepChain } from './journey';
import { getCheckinSession } from './index';

const CO = 'co1';
const U = 'u1';

// 회차 창 — 1주 간격. NOW 를 옮겨 가며 열림/마감을 만든다.
const session = (no: number, opensDay: number, closesDay: number): CohortSession => ({
  cohortId: CO,
  sessionNo: no,
  heldAt: `2026-07-${String(opensDay).padStart(2, '0')}T00:00:00Z`,
  opensAt: `2026-07-${String(opensDay).padStart(2, '0')}T00:00:00Z`,
  closesAt: `2026-07-${String(closesDay).padStart(2, '0')}T23:59:59Z`,
});
const SESSIONS = [session(1, 1, 7), session(2, 8, 14), session(3, 15, 21), session(4, 22, 28)];
const NOW = new Date('2026-07-25T12:00:00Z'); // 1~3 마감 지남 · 4 열려 있음

const row = (no: number, over: Partial<CheckinRecord> = {}): CheckinRecord => ({
  id: `r${no}`,
  cohortId: CO,
  userId: U,
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
const draft = (no: number, over: Partial<CheckinRecord> = {}) => row(no, { submittedAt: null, hasContent: true, ...over });
/** 전면 안내(배너)가 만든 빈 행 — 행은 있는데 내용이 없다. */
const blank = (no: number) => row(no, { submittedAt: null, hasContent: false });

describe('cellState (네 갈래 — 행 없음과 아직 안 열림을 가른다)', () => {
  it('제출 · 작성 중 · 미착수 · 아직 안 열림', () => {
    expect(cellState(row(1), SESSIONS[0], NOW)).toBe('submitted');
    expect(cellState(draft(1), SESSIONS[0], NOW)).toBe('drafting');
    expect(cellState(null, SESSIONS[0], NOW)).toBe('empty');
    expect(cellState(null, session(9, 30, 31), NOW)).toBe('notopen');
  });

  it('행이 없어도 opensAt 전이면 notopen, 후면 empty', () => {
    const later = session(5, 29, 31);
    expect(cellState(null, later, NOW)).toBe('notopen');
    expect(cellState(null, later, new Date('2026-07-30T00:00:00Z'))).toBe('empty');
  });

  it('hasContent=false 인 행(배너가 만든 빈 행)은 empty — 행 존재 ≠ 작성 중', () => {
    expect(cellState(blank(1), SESSIONS[0], NOW)).toBe('empty');
    expect(cellState(blank(9), session(9, 30, 31), NOW)).toBe('notopen');
  });

  it('drafting 은 마감 전후를 구별하지 않는다 — 그 구별은 신호가 한다', () => {
    expect(cellState(draft(1), SESSIONS[0], NOW)).toBe('drafting'); // 마감 지남
    expect(cellState(draft(4), SESSIONS[3], NOW)).toBe('drafting'); // 마감 전
  });
});

describe('종단 축 (summaryFields 를 읽되 [0] 이 아니다)', () => {
  it('AXIS_INDEX 가 가리키는 라벨이 문안 원문과 같다', () => {
    const want: Record<number, string> = {
      1: '갈망',
      2: '인생의 한 문장',
      3: '지금 가장 바라는 것',
      4: '인생의 원씽',
      5: '바꾼 환경',
    };
    for (const [no, label] of Object.entries(want)) {
      const copy = getCheckinSession(Number(no))!;
      expect(copy.summaryFields[AXIS_INDEX[Number(no)]]?.label, `${no}회차`).toBe(label);
    }
  });

  it('[0] 을 기계적으로 뽑으면 둘이 축에서 벗어난다 — 표가 필요한 이유', () => {
    expect(getCheckinSession(2)!.summaryFields[0].label).toBe('영역');
    expect(getCheckinSession(4)!.summaryFields[0].label).toBe('이번에 시작할 프로젝트');
    expect(AXIS_INDEX[2]).not.toBe(0);
    expect(AXIS_INDEX[4]).not.toBe(0);
  });

  it('회차마다 한 줄 · 값이 없으면 상태가 이유를 말한다', () => {
    const rows = [row(2, { answers: { identity_statement: '나는 잇는 사람이다' } }), draft(3)];
    const axis = longitudinalAxis(rows, SESSIONS, NOW);
    expect(axis.map((a) => a.sessionNo)).toEqual([1, 2, 3, 4]);
    expect(axis[1]).toMatchObject({ label: '인생의 한 문장', value: { kind: 'text', text: '나는 잇는 사람이다' }, state: 'submitted' });
    expect(axis[2]).toMatchObject({ value: null, state: 'drafting' }); // 작성 중 · 값 없음
    expect(axis[0]).toMatchObject({ value: null, state: 'empty' });
    // 4회차는 창이 열려 있고 행이 없다 — 미착수다. 라벨은 그래도 나온다(빈 줄이 아니라 상태 줄이 된다).
    expect(axis[3]).toMatchObject({ label: '인생의 원씽', value: null, state: 'empty' });
  });

  it('pair 변형(1회차)이 from → to 로 조립된다', () => {
    const rows = [row(1, { answers: { desire_from: '나는 늘 게을렀다', desire_to: '나는 주도적인 삶을 갈망한다' } })];
    const axis = longitudinalAxis(rows, SESSIONS, NOW);
    expect(axis[0].label).toBe('갈망');
    expect(axis[0].value).toEqual({ kind: 'pair', from: '나는 늘 게을렀다', to: '나는 주도적인 삶을 갈망한다' });
  });

  it('pair 는 한쪽만 있으면 그리지 않는다 — 화살표가 거짓말을 한다', () => {
    const rows = [row(1, { answers: { desire_from: '나는 늘 게을렀다' } })];
    expect(longitudinalAxis(rows, SESSIONS, NOW)[0].value).toBeNull();
  });

  it('미등록 회차(7)는 라벨이 없고 상태만 남는다', () => {
    // ★ **6회차가 등록되어 대상을 7로 옮겼다**(ADR-117 · 2026-08-30).
    //   규칙 자체는 그대로다 — 「등록되지 않은 회차는 라벨을 만들지 않는다」.
    //   아래 가드가 그것을 지킨다: **7이 등록되는 날 이 잠금이 먼저 운다.**
    //   (6이 등록됐을 때 실제로 울었고, 그래서 잠금을 지우지 않고 대상을 옮겼다.)
    const axis = longitudinalAxis([], [session(7, 29, 31)], NOW);  // 아직 열리지 않은 날짜
    expect(axis[0]).toMatchObject({ sessionNo: 7, label: null, value: null, state: 'notopen' });
    expect(getCheckinSession(7)).toBeNull(); // 가드가 헛돌지 않았음
  });

  it('★ 등록된 6회차는 라벨이 선다 — 위 규칙의 반대편', () => {
    // 「라벨이 없다」만 잠그면 **등록해도 라벨이 안 서는 결함**을 못 본다.
    expect(getCheckinSession(6)).not.toBeNull();
    const axis = longitudinalAxis([], [session(6, 29, 31)], NOW);
    expect(axis[0].sessionNo).toBe(6);
    expect(axis[0].label, '6회차가 등록됐는데 라벨이 없다').not.toBeNull();
  });
});

describe('신호 (규칙 기반 · 세 축)', () => {
  const kinds = (s: ReturnType<typeof checkinSignals>) => s.map((x) => x.kind);
  const find = (s: ReturnType<typeof checkinSignals>, k: string) => s.find((x) => x.kind === k);

  it('아무 신호도 없으면 빈 배열', () => {
    expect(checkinSignals([row(1), row(2), row(3), row(4)], SESSIONS, NOW)).toEqual([]);
  });

  it('연속 미착수 — 열린 회차 2회 연속에서 주 신호, 1회에서는 없음', () => {
    const two = checkinSignals([row(1), row(4)], SESSIONS, NOW); // 2·3 비었음
    expect(find(two, 'idle-streak')).toMatchObject({ tier: 'primary', reason: '2·3회차 미착수' });
    const one = checkinSignals([row(1), row(3), row(4)], SESSIONS, NOW); // 2 만 비었음
    expect(kinds(one)).not.toContain('idle-streak');
  });

  it('연속 미착수 — 아직 안 열린 회차는 세지 않는다', () => {
    const withFuture = [...SESSIONS, session(5, 29, 31), session(6, 32 - 32 + 1, 7)];
    const s = checkinSignals([row(1), row(2), row(3), row(4)], withFuture, NOW);
    expect(kinds(s)).not.toContain('idle-streak'); // 5·6 은 notopen
  });

  it('작성 중 방치 — 마감 지난 drafting 에서 주 신호, 마감 전에는 없음', () => {
    const stale = checkinSignals([draft(2)], SESSIONS, NOW); // 2회차 마감 07-14 지남
    expect(find(stale, 'stale-draft')).toMatchObject({ tier: 'primary', reason: '2회차 작성 중(마감 지남)' });
    const fresh = checkinSignals([row(1), row(2), row(3), draft(4)], SESSIONS, NOW); // 4회차 마감 전
    expect(kinds(fresh)).not.toContain('stale-draft');
  });

  it('자신감 급락 — 직전 응답 회차 대비. 인접이 아니어도 잡는다(1기 1→4 실례)', () => {
    // 1회차 5 · 2·3 미제출 · 4회차 2 → 직전 응답은 1회차다
    const s = checkinSignals(
      [row(1, { answers: { confidence: 5 } }), row(4, { answers: { confidence: 2 } })],
      SESSIONS,
      NOW,
    );
    expect(find(s, 'confidence-drop')).toMatchObject({ tier: 'primary', reason: '1→4회차 급락(5→2)' });
  });

  it('자신감 급락 — 임계 미만은 잡지 않는다', () => {
    const s = checkinSignals(
      [row(1, { answers: { confidence: 8 } }), row(2, { answers: { confidence: 6 } })], // 낙폭 2
      SESSIONS,
      NOW,
    );
    expect(kinds(s)).not.toContain('confidence-drop');
    expect(CONFIDENCE_DROP).toBe(3);
  });

  it('자신감 급락 — 한쪽이 없으면 판정하지 않는다', () => {
    const s = checkinSignals(
      [row(1, { answers: { confidence: 9 } }), row(2, { answers: {} }), row(3, { answers: {} }), row(4, { answers: {} })],
      SESSIONS,
      NOW,
    );
    expect(kinds(s)).not.toContain('confidence-drop');
  });

  it('자신감 급락 — 초안은 세지 않는다(값이 아직 바뀔 수 있다)', () => {
    const s = checkinSignals(
      [row(1, { answers: { confidence: 9 } }), draft(2, { answers: { confidence: 1 } })],
      SESSIONS,
      NOW,
    );
    expect(kinds(s)).not.toContain('confidence-drop');
  });

  it('연락 요청 — 급이 아니라 돌봄 채널이다', () => {
    const s = checkinSignals([row(1), row(2, { contactRequest: true }), row(3), row(4)], SESSIONS, NOW);
    expect(find(s, 'contact-request')).toMatchObject({ tier: 'care', reason: '2회차 연락 요청' });
    // 주/보조 축에 올라오지 않는다
    expect(s.filter((x) => x.tier === 'primary')).toEqual([]);
  });

  it('결산 악화 — 보조', () => {
    const s = checkinSignals(
      [
        row(1, { answers: { last_step_result: '했습니다' } }),
        row(2, { answers: { last_step_result: '잊고 지냈습니다' } }),
        row(3),
        row(4),
      ],
      SESSIONS,
      NOW,
    );
    expect(find(s, 'result-worse')).toMatchObject({ tier: 'secondary', reason: '1→2회차 결산 악화' });
  });

  it('근거 문자열이 회차 번호를 담는다 — 판정만 보이면 이유를 다시 찾는다', () => {
    const s = checkinSignals([draft(2), row(4)], SESSIONS, NOW);
    for (const sig of s) expect(sig.reason, sig.kind).toMatch(/\d회차/);
  });

  it('주 신호는 셋뿐 — 돌봄과 보조는 다른 축이다', () => {
    const all = checkinSignals(
      [
        draft(1, { contactRequest: true, answers: { confidence: 9, last_step_result: '했습니다' } }),
        row(3, { answers: { confidence: 2, last_step_result: '잊고 지냈습니다' } }),
      ],
      SESSIONS,
      NOW,
    );
    const primary = all.filter((x) => x.tier === 'primary').map((x) => x.kind);
    expect(new Set(primary).size).toBeLessThanOrEqual(3);
    expect(primary).not.toContain('contact-request');
    expect(primary).not.toContain('result-worse');
  });
});

describe('한 걸음 연쇄 · 마음 궤적 · 남긴 말', () => {
  it('한 걸음 — 자신감 미응답은 null(화면이 — 로 그린다)', () => {
    const c = stepChain([
      row(2, { answers: { step_what: '조감도 다시 보기', step_when: '토요일 아침', last_step_result: '했습니다', confidence: 7 } }),
      row(3, { answers: { step_what: '문자 보내기', last_step_result: '조금 했습니다' } }),
    ]);
    expect(c[0]).toMatchObject({ sessionNo: 2, confidence: 7 });
    expect(c[1].confidence).toBeNull();
  });

  it('마음 — 칩과 직접 쓰기를 함께 준다(ADR-101)', () => {
    const t = moodTrail([
      row(1, { answers: { mood: ['설렘', '두려움'] } }),
      row(2, { answers: { mood: [], mood_custom: '얼떨떨함' } }),
      row(3, { answers: {} }),
    ]);
    expect(t).toHaveLength(2); // 빈 회차는 빠진다
    expect(t[0].words).toEqual(['설렘', '두려움']);
    expect(t[1]).toMatchObject({ words: [], custom: '얼떨떨함' });
  });

  it('남긴 말 — 익명 제안은 싣지 않는다(지휘부 결정 2026-08-02)', () => {
    const box = getCheckinSession(2)!.wrap.facilitatorBox;
    const open = facilitatorNotes([row(2, { answers: { [box.suggestion.key]: '조금 천천히' }, suggestionAnon: false })]);
    expect(open.notes.map((n) => n.text)).toContain('조금 천천히');

    const anon = facilitatorNotes([row(2, { answers: { [box.suggestion.key]: '조금 천천히' }, suggestionAnon: true })]);
    expect(anon.notes.map((n) => n.text)).not.toContain('조금 천천히');
  });

  it('남긴 말 — need 는 익명과 무관하게 싣는다 · 연락 요청 회차를 모은다', () => {
    const box = getCheckinSession(2)!.wrap.facilitatorBox;
    const r = facilitatorNotes([
      row(2, { answers: { [box.need.key]: '자료 미리 주세요' }, suggestionAnon: true, contactRequest: true }),
      row(3, { contactRequest: true }),
    ]);
    expect(r.notes.map((n) => n.text)).toEqual(['자료 미리 주세요']);
    expect(r.contactSessions).toEqual([2, 3]);
    expect(r.notes[0].label).toBe(box.need.label); // 라벨은 문안 원문
  });
});

describe('진행 요약 (회차 수는 cohort_sessions 가 정한다)', () => {
  it('제출·작성 중·미착수·미개시를 센다', () => {
    const p = journeyProgress([row(1), draft(2)], [...SESSIONS, session(5, 29, 31)], NOW);
    expect(p).toEqual({ total: 5, submitted: 1, drafting: 1, open: 2, notopen: 1 });
  });

  it('7 로 박지 않는다 — 회기마다 회차 수가 다르다', () => {
    expect(journeyProgress([], SESSIONS.slice(0, 2), NOW).total).toBe(2);
  });
});
