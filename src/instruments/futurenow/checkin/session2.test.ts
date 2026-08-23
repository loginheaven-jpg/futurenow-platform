import { describe, expect, it } from 'vitest';
import { CHECKIN_SESSION_2 } from './session2';

const filledCount = CHECKIN_SESSION_2.filledCount;

// §5-5: 필수 6칸. future_area·future_line 둘 다, last_step_result 칩만으로 1칸.
describe('session2 filledCount — 필수 6칸', () => {
  const full = {
    future_area: '관계',
    future_line: '동네에서 꼭 들러야 하는 가게를 운영하고 있다',
    identity_statement: '나는 상생의 사람이다',
    mood: ['설렘'],
    last_step_result: '했습니다',
    step_what: '편지 다시 읽기',
    step_when: '토요일 아침',
    self_note: '괜찮아',
  };

  it('전부 채우면 6', () => {
    expect(CHECKIN_SESSION_2.requiredTotal).toBe(6);
    expect(filledCount(full)).toBe(6);
  });

  it('영역 칩만 있고 문장 비면 그 칸 미충족 → 5(§7-9)', () => {
    expect(filledCount({ ...full, future_line: '' })).toBe(5);
    expect(filledCount({ ...full, future_area: '   ' })).toBe(5);
  });

  it('지난 한 걸음(last_step_result) 없으면 → 5', () => {
    expect(filledCount({ ...full, last_step_result: '' })).toBe(5);
  });

  it('mood 빈 배열·self_note 공백은 미충족', () => {
    expect(filledCount({ ...full, mood: [] })).toBe(5);
    expect(filledCount({ ...full, self_note: '  ' })).toBe(5);
  });

  it('다음 한 걸음은 무엇을·언제 둘 다 있어야 1칸', () => {
    expect(filledCount({ ...full, step_when: '' })).toBe(5);
  });

  it('confidence·last_step_note·심화 두 칸은 세지 않는다', () => {
    expect(filledCount({ ...full, confidence: 7, last_step_note: '메모', future_scene: '방', letter_line: '한 줄' })).toBe(6);
  });

  it('빈 답 → 0', () => {
    expect(filledCount({})).toBe(0);
  });
});

// 문안 회귀 — 금지어(§7-13)·책 참조(§7-14)·신규 블록 키·되비추기 플래그.
describe('session2 문안 — 금지어·책 참조·구조', () => {
  const flat = JSON.stringify(CHECKIN_SESSION_2);
  it('금지어 없음(2회차는 진단 예외조차 없음)', () => {
    for (const banned of ['설문', '진단', '지각', '미제출', '워크북']) expect(flat).not.toContain(banned);
  });
  it('firstVisitOnce 를 두지 않는다(§5-1)', () => {
    expect('firstVisitOnce' in CHECKIN_SESSION_2.cover).toBe(false);
  });
  it('책 페이지 참조 4곳(§7-14)', () => {
    expect(flat).toContain('(책 69~73쪽)');
    expect(flat).toContain('(책 74~77쪽)');
    expect(flat).toContain('(책 78~84쪽)');
    expect(flat).toContain('(책 85~87쪽)');
  });
  it('신규 블록 키 — 영역 칩·지난 한 걸음·공개 토글·letter_line 공유', () => {
    expect(CHECKIN_SESSION_2.today.areaPick.key).toBe('future_area');
    expect(CHECKIN_SESSION_2.today.areaPick.lines.map((l) => l.key)).toEqual(['future_line']); // ADR-98: 2회차는 한 줄
    expect(CHECKIN_SESSION_2.today.identity.key).toBe('identity_statement');
    // ADR-90: mirror 가 boolean 에서 블록 속성(label+keys)으로 일반화됐다. 렌더 결과는 동일하다.
    expect(CHECKIN_SESSION_2.today.identity.mirror).toEqual({ label: '지난 시간에 쓰신 문장', keys: ['identity_sentence'] });
    expect(CHECKIN_SESSION_2.step.lastStep.key).toBe('last_step_result');
    expect(CHECKIN_SESSION_2.step.share.toggleLabel).toContain('나만 볼게요');
    expect(CHECKIN_SESSION_2.deepen.fields[1].key).toBe('letter_line');
  });
  it('요약 열(§5-6) — 영역·인생의 한 문장·장면', () => {
    expect(CHECKIN_SESSION_2.summaryFields).toEqual([
      { label: '영역', key: 'future_area' },
      { label: '인생의 한 문장', key: 'identity_statement' },
      { label: '장면', key: 'future_scene' },
    ]);
  });
});

// 레지스트리 가드는 registry.guard.test.ts 로 옮겼다(ADR-108) — 넷에 흩어져 있어 4·5회차에서 연속으로 누락됐다.
