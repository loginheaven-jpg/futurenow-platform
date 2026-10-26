import { describe, expect, it } from 'vitest';
import { CHECKIN_SESSION_5 as five } from './session5';
import { CHECKIN_SESSION_6 as six } from './session6';
import { pairRows, preferredPair, removePair, reviewPair } from './pairs';
import { buildCheckinRead, readSelfHighlights } from './readModel';

const block = five.today.pairText;
const two = {
  trigger_if: '설거지를 마치면', trigger_then: '책 한 문단 읽기',
  trigger_if_2: '점심을 먹으면', trigger_then_2: '계단 한 층 오르기', trigger_count: 2, trigger_focus: 1,
};
const full = { ...two, env_change: '책을 책상 위에 두기', mood: ['의욕'], last_step_result: '했습니다', self_note: '한 번 해보자' };
const flags = { stepPrivate: false, suggestionAnon: false, contactRequest: false };

describe('신호 여러 쌍의 저장과 다음 회차 연결', () => {
  it('기존 단일 키도 그대로 읽고, 선택한 둘째 쌍을 완료·대시보드에 돌려준다', () => {
    expect(pairRows(block, { trigger_if: '기존 신호', trigger_then: '기존 행동' })).toHaveLength(1);
    expect(preferredPair(block, two)?.index).toBe(1);
    expect(readSelfHighlights(5, two)).toMatchObject({ stepWhat: two.trigger_then_2, stepWhen: two.trigger_if_2 });
  });

  it('최소 한 쌍이 필요하고, 반쯤 쓴 추가 쌍은 제출을 막으며, 빈 추가 줄은 허용한다', () => {
    expect(five.filledCount(full)).toBe(5);
    expect(five.missingKeys(full)).toEqual([]); // 삭제한 step_what/when 없이 완성
    expect(five.missingKeys({ ...full, trigger_then_2: ' ' })).toEqual(['trigger_then_2']);
    expect(five.missingLabels({ ...full, trigger_then_2: ' ' })).toEqual(['신호 2 · 나는']);
    expect(five.filledCount({ ...full, trigger_if_2: '', trigger_then_2: '' })).toBe(5);
    expect(five.filledCount({ ...full, trigger_if: '', trigger_then: '' })).toBe(5);
    expect(five.missingKeys({})).toContain('trigger_if');
  });

  it('첫 줄 삭제 시 둘째 쌍과 선택을 이동하며 다른 답변을 보존한다', () => {
    const next = removePair(block, { ...two, self_note: '보존' }, 0);
    expect(next).toMatchObject({ trigger_if: two.trigger_if_2, trigger_then: two.trigger_then_2, trigger_count: 1, trigger_focus: 0, self_note: '보존' });
    expect(next).not.toHaveProperty('trigger_if_2');
    expect(preferredPair(block, next)?.from).toBe(two.trigger_if_2);
    expect(removePair(block, next, 0)).toBe(next);
  });

  it('저장된 줄 수가 없어도 추가 답을 찾으며 유효하지 않은 선택은 완성한 쌍으로 돌아간다', () => {
    expect(pairRows(block, { trigger_if_3: '셋째' })).toHaveLength(3);
    expect(pairRows(block, { trigger_count: 100 })).toHaveLength(8);
    expect(preferredPair(block, { ...two, trigger_focus: 99 })?.index).toBe(0);
    expect(preferredPair(block, { ...two, trigger_then_2: '' })?.index).toBe(0);
  });

  it('6회차는 5회차 선택을 기본으로 읽고, 저장한 경험의 대상은 이전 답 수정 후에도 유지한다', () => {
    const review = six.step.lastStep.reviewPairs;
    expect(reviewPair(review, block, two, {})).toMatchObject({ from: two.trigger_if_2, to: two.trigger_then_2 });
    const saved = { review_trigger_if: '그때의 신호', review_trigger_then: '그때의 행동' };
    expect(reviewPair(review, block, two, saved)).toEqual({ from: '그때의 신호', to: '그때의 행동' });
    expect(reviewPair(review, block, {}, saved)).toEqual({ from: '그때의 신호', to: '그때의 행동' });
    expect(reviewPair(review, block, {}, {})).toBeUndefined();
  });

  it('본인·인도자 상세 모두 추가 쌍을 읽고, 옛 비공개 실천은 인도자에게 노출하지 않는다', () => {
    const old = { ...two, step_what: '옛 비공개 행동', step_when: '옛 비공개 시간', relief: '옛 깨달음' };
    for (const audience of ['self', 'facilitator'] as const) {
      const content = JSON.stringify(buildCheckinRead(5, old, { ...flags, stepPrivate: true }, audience));
      expect(content).toContain(two.trigger_then_2);
      expect(content).toContain('옛 깨달음');
      expect(content.includes('옛 비공개 행동')).toBe(audience === 'self');
    }
  });

  it('6회차의 새 경험과 과거 결산은 서로 다른 키와 문맥으로 읽는다', () => {
    const answers = { last_step_result: '조금 했습니다', last_step_note: '과거 기록', trigger_experience: six.step.lastStep.options[2], review_trigger_if: '신호', review_trigger_then: '행동' };
    const content = JSON.stringify(buildCheckinRead(6, answers, flags, 'self'));
    for (const value of Object.values(answers)) expect(content).toContain(value);
    expect(six.missingKeys({ last_step_result: '했습니다' })).toContain('trigger_experience');
  });
});
