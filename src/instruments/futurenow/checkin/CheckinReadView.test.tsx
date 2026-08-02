import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CheckinReadView } from './CheckinReadView';
import { DEEPEN_GROUP_ID, type ReadBlock } from './readModel';

const PHOTO = [{ path: 'c/u/1/a.jpg', url: 'https://example.test/a.jpg' }];
const render = (blocks: ReadBlock[], photos = PHOTO) => renderToStaticMarkup(<CheckinReadView blocks={blocks} photos={photos} />);
// React 19 는 <img> 마다 preload <link href> 도 함께 내보내므로 URL 문자열이 아니라 img 태그 수를 센다.
const imgCount = (html: string) => html.split('<img').length - 1;

describe('CheckinReadView — 편지 사진', () => {
  it('글이 하나도 없어도 사진만 있으면 그린다(사진 삼킴 회귀 방지)', () => {
    const html = render([]);
    expect(html).toContain('https://example.test/a.jpg');
  });

  it('블록도 사진도 없으면 아무것도 그리지 않는다', () => {
    expect(render([], [])).toBe('');
  });

  it('심화 묶음이 있으면 사진은 그 안에 한 번만 붙는다', () => {
    const blocks: ReadBlock[] = [
      { kind: 'group', id: DEEPEN_GROUP_ID, title: '깊은 생각', blocks: [{ kind: 'text', label: '편지', value: '한 줄' }] },
    ];
    const html = render(blocks);
    expect(imgCount(html)).toBe(1);
  });

  it('심화 묶음이 없으면 사진은 끝에 한 번만 붙는다', () => {
    const html = render([{ kind: 'text', label: '문장', value: '값' }]);
    expect(imgCount(html)).toBe(1);
  });
});

describe('CheckinReadView — 블록 종류별 렌더', () => {
  it('pair 는 양쪽 값을 모두 낸다', () => {
    const html = render([{ kind: 'pair', label: 'L', fromLabel: '전', fromValue: '소심했다', toLabel: '후', toValue: '신중하다' }], []);
    expect(html).toContain('소심했다');
    expect(html).toContain('신중하다');
  });

  it('list 는 가운뎃점으로 잇는다', () => {
    const html = render([{ kind: 'list', label: 'L', values: ['후련함', '고마움'] }], []);
    expect(html).toContain('후련함 · 고마움');
  });

  it('scale 은 값과 양끝 라벨만 낸다(막대·백분위 없음)', () => {
    const html = render([{ kind: 'scale', label: 'L', value: 7, leftLabel: '왼', rightLabel: '오' }], []);
    expect(html).toContain('7');
    expect(html).toContain('왼');
    expect(html).toContain('오');
    expect(html).not.toContain('%');
    expect(html).not.toContain('progress');
  });

  it('hidden 은 라벨만 내고 어떤 응답 값도 새지 않는다(step_private 경로)', () => {
    const html = render([{ kind: 'hidden', label: '이번 한 걸음은 나만 볼게요' }], []);
    expect(html).toContain('이번 한 걸음은 나만 볼게요');
    expect(html).not.toContain('아침에 10분 걷기');
  });

  it('읽는 화면에 파괴적 액션(삭제 버튼)을 두지 않는다', () => {
    const html = render([{ kind: 'text', label: 'L', value: '값' }]);
    expect(html).not.toContain('<button');
    expect(html).not.toContain('삭제');
  });
});
