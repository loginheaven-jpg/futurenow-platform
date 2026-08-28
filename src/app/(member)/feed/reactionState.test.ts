// 반응 낙관적 갱신 — 전수 (5차 소건 2).
import { describe, expect, it } from 'vitest';
import { applyReaction } from './reactionState';

describe('applyReaction — 내 변화만큼만 옮긴다', () => {
  it('새로 켜면 +1', () => {
    expect(applyReaction({}, [], ['👏'])).toEqual({ '👏': 1 });
    expect(applyReaction({ '👏': 3 }, [], ['👏'])).toEqual({ '👏': 4 });
  });

  it('끄면 −1 이고, 0 이 된 칸은 **지운다** — `{👏:0}` 이 남으면 화면이 `👏 0` 을 그린다', () => {
    expect(applyReaction({ '👏': 1 }, ['👏'], [])).toEqual({});
    expect(applyReaction({ '👏': 3 }, ['👏'], [])).toEqual({ '👏': 2 });
  });

  it('**복수를 함께 켠다** — 박수와 기도가 동시에 산다(소건 2 의 목적)', () => {
    // 시작 집계는 before 와 **아귀가 맞아야** 한다 — 내가 이미 👏 를 눌렀다면 집계에 그 1 이 있다.
    expect(applyReaction({ '👏': 1 }, ['👏'], ['👏', '🙏'])).toEqual({ '👏': 1, '🙏': 1 });
    // 남이 이미 누른 위에 내가 하나를 더 켜는 경우도 같다.
    expect(applyReaction({ '👏': 3 }, ['👏'], ['👏', '🙏'])).toEqual({ '👏': 3, '🙏': 1 });
  });

  it('하나를 켜고 하나를 끄는 것이 한 번에 와도 맞는다 — 경합 뒤 서버 값이 그럴 수 있다', () => {
    expect(applyReaction({ '👏': 2, '🙏': 1 }, ['👏'], ['🙏'])).toEqual({ '👏': 1, '🙏': 2 });
  });

  it('바뀐 것이 없으면 집계도 그대로다', () => {
    expect(applyReaction({ '👏': 2, '🙏': 1 }, ['👏'], ['👏'])).toEqual({ '👏': 2, '🙏': 1 });
  });

  it('남의 수를 건드리지 않는다 — 이 함수가 아는 것은 내 변화뿐이다', () => {
    expect(applyReaction({ '💪': 7 }, [], ['👏'])).toEqual({ '💪': 7, '👏': 1 });
  });

  it('집계가 어긋나 있어도 0 아래로 내려가지 않는다', () => {
    expect(applyReaction({}, ['👏'], [])).toEqual({});
    expect(applyReaction({ '👏': 0 }, ['👏'], [])).toEqual({});
  });

  it('원본을 변형하지 않는다 — 상태를 제자리에서 고치면 리렌더가 안 도는 자리가 생긴다', () => {
    const src = { '👏': 1 } as const;
    applyReaction(src, [], ['🙏']);
    expect(src).toEqual({ '👏': 1 });
  });

  it('넷 다 켜도 넷 다 산다', () => {
    expect(applyReaction({}, [], ['👏', '🙏', '💪', '❤️'])).toEqual({ '👏': 1, '🙏': 1, '💪': 1, '❤️': 1 });
  });

  it('넷 다 끄면 빈 표다', () => {
    expect(applyReaction({ '👏': 1, '🙏': 1, '💪': 1, '❤️': 1 }, ['👏', '🙏', '💪', '❤️'], [])).toEqual({});
  });
});
