import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CohortDetail } from './CohortDetail';
import type { CohortSummary, RosterMember } from '../types';
import { TOOL } from '@/app/_vocab/tool';

const cohort: CohortSummary = {
  id: 'co1',
  name: '봄 1기',
  instrumentLabel: TOOL.productLabel,
  responded: 1,
  total: 2,
  careCount: 0,
  code: 'QKN2H',
};
const roster: RosterMember[] = [{ id: 'r1', userId: 'u1', name: '이응답', status: 'done' }];
const noop = () => {};

describe('CohortDetail [그룹 리포트] 진입 (Step 3.3)', () => {
  it('onGroupReport 전달 시 [그룹 리포트 보기] 노출', () => {
    const html = renderToStaticMarkup(<CohortDetail cohort={cohort} roster={roster} onGroupReport={noop} />);
    expect(html).toContain('그룹 리포트 보기');
  });

  it('미전달 시(미리보기) 그룹 리포트 진입 0', () => {
    const html = renderToStaticMarkup(<CohortDetail cohort={cohort} roster={roster} />);
    expect(html).not.toContain('그룹 리포트 보기');
  });
});

describe('CohortDetail 참여자 휴지통 (ADR-73)', () => {
  it('canManageMembers 시 명단 행에 삭제(휴지통) 어포던스 노출', () => {
    const html = renderToStaticMarkup(<CohortDetail cohort={cohort} roster={roster} canManageMembers onRemoveMember={noop} />);
    expect(html).toContain('회기에서 제거'); // aria-label/title
  });

  it('미전달(운영자/소유코치 아님) 시 휴지통 미노출', () => {
    const html = renderToStaticMarkup(<CohortDetail cohort={cohort} roster={roster} />);
    expect(html).not.toContain('회기에서 제거');
  });
});

// ★★ 마무리 체크 독려 (U-8 · 지휘부 지시 2026-09-03 「여러 방식으로 마무리를 독려」).
//
//   **재는 것은 «독려의 전제»다** — 인도자가 **누가 아직 안 했는지** 볼 수 있어야 독려가 시작된다.
//   3숫자(응답 완료·대기·돌봄)는 wave 를 안 가르므로 마무리를 대신 말해 주지 못한다.
describe('마무리 체크 독려 구획', () => {
  const open = { done: 1, total: 3, pending: ['김참여', '이참여'] };

  it('★ **개시 전에는 서지 않는다** — 열지 않은 것을 독려할 수 없다', () => {
    const html = renderToStaticMarkup(<CohortDetail cohort={cohort} roster={roster} postStatus={open} />);
    expect(html).not.toContain('안내 보내기');
  });

  it('★★ **개시되면 누가 아직 안 했는지 보인다**', () => {
    const html = renderToStaticMarkup(<CohortDetail cohort={cohort} roster={roster} postOpened postStatus={open} />);
    expect(html).toContain(TOOL.post);
    expect(html, '완료 수를 안 보인다').toContain('1');
    expect(html, '미완료자 이름이 없다 — 독려할 대상을 모른다').toContain('김참여 · 이참여');
    expect(html, '보낼 길이 없다').toContain('안내 보내기');
  });

  it('★ **모두 마쳤으면 독려하지 않는다** — 보낼 곳이 없는 버튼을 두지 않는다', () => {
    const done = { done: 3, total: 3, pending: [] };
    const html = renderToStaticMarkup(<CohortDetail cohort={cohort} roster={roster} postOpened postStatus={done} />);
    expect(html).toContain(TOOL.post);
    expect(html, '보낼 곳이 없는데 버튼이 있다').not.toContain('안내 보내기');
  });

  it('★ 자료가 없으면 그리지 않는다 — 갤러리·픽스처가 그 자리다', () => {
    const html = renderToStaticMarkup(<CohortDetail cohort={cohort} roster={roster} postOpened />);
    expect(html).not.toContain('안내 보내기');
  });
});
