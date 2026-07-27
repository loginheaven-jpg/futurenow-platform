import { describe, expect, it } from 'vitest';
import { nextChipSelection } from './MultiChoiceChips';

// 수용 §5: 최대 2개, 세 번째 선택 시 가장 먼저 고른 것 해제, 배타, 무선택 허용.
describe('nextChipSelection — 칩 선택 전이', () => {
  const MAX = 2;
  const EX = '아직 모르겠음';

  it('선택→해제 토글', () => {
    expect(nextChipSelection(['후련함'], '후련함', MAX, EX)).toEqual([]);
  });

  it('max 초과 시 최선입 축출', () => {
    expect(nextChipSelection(['후련함', '고마움'], '놀라움', MAX, EX)).toEqual(['고마움', '놀라움']);
  });

  it('배타 옵션 선택 → 나머지 해제', () => {
    expect(nextChipSelection(['후련함', '고마움'], EX, MAX, EX)).toEqual([EX]);
  });

  it('배타 선택 상태에서 일반 옵션 → 배타 해제', () => {
    expect(nextChipSelection([EX], '후련함', MAX, EX)).toEqual(['후련함']);
  });

  it('무선택에서 하나 추가', () => {
    expect(nextChipSelection([], '고마움', MAX, EX)).toEqual(['고마움']);
  });
});
