// 갈무리 사진 경로 규약(ADR-197) — 올리는 쪽과 읽고 지우는 쪽이 같은 이름을 만든다.
import { describe, expect, it } from 'vitest';
import { isThumbPath, pairCheckinPhotoPaths, thumbPathOf } from './checkinPhotos';

const P = 'c/u/1';

describe('미리보기 경로', () => {
  it('원본 옆 같은 폴더에 선다 — 폴더를 더 파면 저장소 정책의 경로 [1]·[2]·[3] 이 어긋난다', () => {
    expect(thumbPathOf(`${P}/a.jpg`)).toBe(`${P}/a.thumb.jpg`);
    expect(thumbPathOf(`${P}/a.jpg`).split('/')).toHaveLength(4);
  });

  it('두 번 붙지 않는다', () => {
    expect(thumbPathOf(thumbPathOf(`${P}/a.jpg`))).toBe(`${P}/a.thumb.jpg`);
  });

  it('원본과 미리보기를 가른다', () => {
    expect(isThumbPath(`${P}/a.thumb.jpg`)).toBe(true);
    expect(isThumbPath(`${P}/a.jpg`)).toBe(false);
  });
});

describe('목록 묶기', () => {
  it('원본 단위로 묶고 **올린 순서를 보존한다** — 워크북은 쪽 순서가 뜻이다', () => {
    const names = [`${P}/z.jpg`, `${P}/z.thumb.jpg`, `${P}/a.jpg`, `${P}/a.thumb.jpg`];
    expect(pairCheckinPhotoPaths(names)).toEqual([
      { path: `${P}/z.jpg`, thumb: `${P}/z.thumb.jpg` },
      { path: `${P}/a.jpg`, thumb: `${P}/a.thumb.jpg` },
    ]);
  });

  it('미리보기가 없는 옛 사진(ADR-197 이전)은 원본만 낸다', () => {
    expect(pairCheckinPhotoPaths([`${P}/old.jpg`])).toEqual([{ path: `${P}/old.jpg`, thumb: null }]);
  });

  it('원본 없이 남은 미리보기 조각은 내지 않는다 — 누를 것이 없다', () => {
    expect(pairCheckinPhotoPaths([`${P}/lost.thumb.jpg`])).toEqual([]);
  });
});
