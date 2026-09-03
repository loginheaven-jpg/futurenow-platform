// 회기 전환이 **화면으로 보이는가** — 실기기 2차 지적(2026-08-27)의 회귀 잠금.
//
// 지적: *"칩 클릭 자체가 안 된다. 버튼이 아니라 텍스트 박스 같다."*
//   실측하니 마크업은 정상 `<a href>` 였고 덮개도 `pointer-events` 도 없었다.
//   원인은 **화면이 아무 답도 하지 않은 것**이다 —
//     ① 선택 배경 `--color-surface-2` 가 `--gray-0`, 즉 **페이지 배경과 같은 색**이라 선택이 안 보였다.
//     ② 양쪽 회기 모두 글이 0건이라 목록도 똑같았다.
//   전환이 실제로 일어나도 화면은 한 픽셀도 바뀌지 않는다. 죽은 클릭과 구분할 수 없다.
//
// **이 테스트가 지키는 것은 "전환이 눈에 보인다" 하나다.** 링크가 존재하는지가 아니라,
//   선택된 회기와 안 된 회기가 **다르게 보이는지**를 단언한다.
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FeedClient } from './FeedClient';

const A = { cohortId: 'aaa', name: '2기', status: 'active' as const, isCoach: false, lastPostAt: null };
const B = { cohortId: 'bbb', name: '1기', status: 'active' as const, isCoach: true, lastPostAt: null };

const render = (selected: string, cohorts = [A, B]) =>
  renderToStaticMarkup(
    <FeedClient meId="me" isCoach={false} cohorts={cohorts}
      selectedCohortId={selected} initialPosts={[]} initialPhotoUrls={{}} />,
  );

describe('회기 전환이 눈에 보인다', () => {
  it('칩이 **누를 수 있는 부품**이다 — 인라인 텍스트가 아니라 ui-btn', () => {
    const html = render(A.cohortId);
    // ui-btn 은 cursor:pointer·탭 최소 높이·focus 링을 이미 갖고 있다(ui.css).
    expect(html).toContain('class="ui-btn ui-btn--primary"');
    expect(html).toContain('class="ui-btn ui-btn--ghost"');
  });

  it('**선택된 회기와 안 된 회기가 다르게 보인다** — 같으면 클릭이 먹었는지 알 수 없다', () => {
    const html = render(A.cohortId);
    const primary = html.match(/class="ui-btn ui-btn--primary"[^>]*>([^<]*)</);
    const ghost = html.match(/class="ui-btn ui-btn--ghost"[^>]*>([^<]*)</);
    expect(primary?.[1], '선택된 쪽이 primary').toBe('2기');
    expect(ghost?.[1], '안 된 쪽이 ghost').toBe('1기');
  });

  it('전환하면 두 칩의 역할이 뒤바뀐다', () => {
    const html = render(B.cohortId);
    expect(html.match(/class="ui-btn ui-btn--primary"[^>]*>([^<]*)</)?.[1]).toBe('1기');
    expect(html.match(/class="ui-btn ui-btn--ghost"[^>]*>([^<]*)</)?.[1]).toBe('2기');
  });

  it('선택 상태를 색만으로 말하지 않는다 — aria-current 도 붙는다', () => {
    const html = render(A.cohortId);
    expect(html).toContain('aria-current="page"');
    expect((html.match(/aria-current="page"/g) ?? []).length, '선택은 하나뿐이다').toBe(1);
  });

  it('**글이 0건이어도 빈 화면이 회기를 말한다** — 전환의 유일한 증거일 때가 있다', () => {
    // 살아 있는 글이 0건이면(라이브 실측 그러했다) 목록으로는 전환을 알 수 없다.
    expect(render(A.cohortId)).toContain('2기에는 아직 아무도 남기지 않았어요');
    expect(render(B.cohortId)).toContain('1기에는 아직 아무도 남기지 않았어요');
  });

  it('회기가 하나면 칩도 이름도 붙이지 않는다 — 없는 선택을 암시하지 않는다', () => {
    const html = render(A.cohortId, [A]);
    expect(html).not.toContain('ui-btn--ghost');
    expect(html).toContain('아직 아무도 남기지 않았어요');
    expect(html).not.toContain('2기에는');
  });

  it('"내 걸음만" 토글도 눌림 상태를 색 밖에서 알린다', () => {
    const html = render(A.cohortId);
    expect(html).toContain('aria-pressed="true"');  // 기본 '모두'
    expect(html).toContain('aria-pressed="false"');
  });
});
