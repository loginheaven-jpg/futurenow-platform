import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { cohortTabs } from './consoleNav';

// 회기 띠 (U-5) — **회기 칩 + 탭 한 줄**.
const ID = '00000000-0000-0000-0000-000000000000';
const COHORT = `/coach/cohort/${ID}`;

async function render(pathname: string, name: string | null) {
  vi.resetModules();
  vi.doMock('next/navigation', () => ({ usePathname: () => pathname }));
  const { ConsoleBand } = await import('./ConsoleBand');
  return renderToStaticMarkup(<ConsoleBand cohortId={ID} name={name} />);
}

describe('회기 띠', () => {
  it('**회기 이름이 서버 그림에 실린다** — 통로(useEffect)를 쓰지 않는 이유다', async () => {
    const html = await render(COHORT, '[QA] 검증 전용');
    expect(html, '첫 그림에 회기 이름이 없다 — 칩이 늦게 끼어들어 탭을 민다').toContain('[QA] 검증 전용');
  });

  it('**칩은 회기 목록으로 가는 문이다**(결재 물음 1 답)', async () => {
    const html = await render(COHORT, '[QA] 검증 전용');
    expect(html).toContain('href="/coach/cohorts"');
    expect(html).toContain('console-cohort');
  });

  it('**이름이 없으면 칩을 그리지 않는다** — 무엇을 가리키는지 모르는 문을 세우지 않는다', async () => {
    const html = await render(COHORT, null);
    expect(html).not.toContain('console-cohort');
    expect(html, '탭은 그대로 서야 한다').toContain('console-tab');
  });

  it('**켜지는 탭은 하나다** — 가장 긴 일치가 이긴다', async () => {
    const html = await render(`${COHORT}/checkin`, 'QA');
    expect(html.split('aria-current="page"').length - 1, '켜진 탭이 하나가 아니다').toBe(1);
    expect(html).toContain(`href="${COHORT}/checkin"`);
  });

  it('**내비에 없는 화면에서도 위치를 잃지 않는다** — 리포트 상세는 대시보드가 켜진다', async () => {
    const html = await render(`${COHORT}/report/abc`, 'QA');
    expect(html.split('aria-current="page"').length - 1).toBe(1);
  });

  it('**탭 이름에 「회기」가 없다**(결재 2026-09-03) — 칩이 이미 그것을 말한다', () => {
    // 칩과 탭이 같은 말을 두 번 하지 않는다. 「회차 갈무리」의 *회차* 는 다른 낱말이다.
    expect(cohortTabs(ID).map((t) => t.label)).not.toContain('회기 대시보드');
    expect(cohortTabs(ID).map((t) => t.label)).toContain('대시보드');
  });
});
