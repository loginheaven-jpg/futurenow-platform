import { describe, expect, it } from 'vitest';
import { CHECKIN_SESSION_1 } from './session1';

// ADR-85: 판정 함수·필수 총계는 세션 객체 내부로 이관(레지스트리 형태). 참조 경로만 바뀌고 규칙은 v2 그대로.
const checkinFilledCount = CHECKIN_SESSION_1.filledCount;
const CHECKIN_REQUIRED_TOTAL = CHECKIN_SESSION_1.requiredTotal;

// 수정지시서 §5-9: 필수 5칸. 갈망 두 칸 중 하나만 채우면 미충족.
describe('checkinFilledCount — 필수 5칸(문안 v2)', () => {
  const full = {
    identity_sentence: '나는 사람이다',
    desire_from: '나는 늘 게을렀다',
    desire_to: '나는 주도적인 삶을 갈망한다',
    mood: ['후련함'],
    step_what: '편지 다시 읽기',
    step_when: '토요일 아침',
    self_note: '괜찮아',
  };

  it('전부 채우면 5', () => {
    expect(CHECKIN_REQUIRED_TOTAL).toBe(5);
    expect(checkinFilledCount(full)).toBe(5);
  });

  it('갈망 한 칸만 채우면 그 칸 미충족 → 4', () => {
    expect(checkinFilledCount({ ...full, desire_to: '' })).toBe(4);
    expect(checkinFilledCount({ ...full, desire_from: '   ' })).toBe(4);
  });

  it('mood 빈 배열·공백 문자열은 미충족', () => {
    expect(checkinFilledCount({ ...full, mood: [] })).toBe(4);
    expect(checkinFilledCount({ ...full, self_note: '  ' })).toBe(4);
  });

  it('step 은 무엇을·언제 둘 다 있어야 1칸', () => {
    expect(checkinFilledCount({ ...full, step_when: '' })).toBe(4);
  });

  it('빈 답 → 0', () => {
    expect(checkinFilledCount({})).toBe(0);
  });
});

// 문안 회귀 — 금지어(§5-7)·순서 핵심 확인.
describe('1회차 문안 v2 — 금지어·핵심 문자열', () => {
  const flat = JSON.stringify(CHECKIN_SESSION_1);
  it('금지어 없음(진단은 지정 예외)', () => {
    expect(flat).not.toContain('설문');
    expect(flat).not.toContain('지각');
    expect(flat).not.toContain('미제출');
    expect(flat).not.toContain('워크북');
  });
  it("'이건 진단이 아닙니다'는 지정 예외로 존재", () => {
    expect(CHECKIN_SESSION_1.cover.firstVisitOnce).toBe('이건 진단이 아닙니다. 점수도, 정답도 없습니다.');
  });
  it('desire 쌍·letter_line·질문형 라벨·책 참조', () => {
    expect(CHECKIN_SESSION_1.today.desire.from.key).toBe('desire_from');
    expect(CHECKIN_SESSION_1.today.desire.to.key).toBe('desire_to');
    expect(CHECKIN_SESSION_1.deepen.fields[1].key).toBe('letter_line');
    expect(CHECKIN_SESSION_1.wrap.facilitatorBox.need.label).toContain('부탁하고 싶은');
    expect(CHECKIN_SESSION_1.today.identity.label).toContain('(책 53~58쪽)');
  });
  it('공유 동의(share_target) 문자열이 문안에서 사라졌다', () => {
    expect(flat).not.toContain('share_target');
    expect(flat).not.toContain('나눠도 좋습니다');
  });
});
