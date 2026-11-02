import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyRecommendationText, recommendationText, recommendationsText } from './recommendationCopy';

afterEach(() => vi.unstubAllGlobals());

describe('추천 글 복사 형식 (ADR-205)', () => {
  it('원문 뒤 줄바꿈·괄호 표기, 글 사이는 빈 줄 하나다', () => {
    const first = { text: ' 첫 줄\n둘째 줄 ', attribution: '남·30대' };
    const second = { text: '다른 글', attribution: '참여자' };
    expect(recommendationText(first)).toBe(' 첫 줄\n둘째 줄 \n(남·30대)');
    expect(recommendationsText([first, second])).toBe(' 첫 줄\n둘째 줄 \n(남·30대)\n\n다른 글\n(참여자)');
    expect(recommendationsText([])).toBe('');
  });
});

describe('추천 글 복사 성공 판정 (ADR-205)', () => {
  it('실제 writeText가 끝난 뒤에만 성공 콜백을 실행한다', async () => {
    let finish!: () => void;
    const writeText = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const copied = vi.fn();
    const result = copyRecommendationText('원문\n(남·30대)', copied);
    expect(writeText).toHaveBeenCalledWith('원문\n(남·30대)');
    expect(copied).not.toHaveBeenCalled();
    finish();
    expect(await result).toBe(true);
    expect(copied).toHaveBeenCalledTimes(1);
  });

  it('permission denied는 성공 표시 없이 false이고 다음 시도는 가능하다', async () => {
    const writeText = vi.fn()
      .mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
      .mockResolvedValueOnce(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const copied = vi.fn();
    expect(await copyRecommendationText('동일 원문', copied)).toBe(false);
    expect(copied).not.toHaveBeenCalled();
    expect(await copyRecommendationText('동일 원문', copied)).toBe(true);
    expect(copied).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledTimes(2);
  });

  it.each([undefined, {}, { clipboard: {} }])('clipboard API가 없거나 불완전해도 성공으로 처리하지 않는다: %j', async (navigator) => {
    vi.stubGlobal('navigator', navigator);
    const copied = vi.fn();
    expect(await copyRecommendationText('원문', copied)).toBe(false);
    expect(copied).not.toHaveBeenCalled();
  });
});
