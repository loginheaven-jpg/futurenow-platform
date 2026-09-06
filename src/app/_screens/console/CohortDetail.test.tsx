import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
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
    // ★ **「아직 안 함」을 쓰지 않는다**(지휘부 지적 2026-09-03) — 아래 명단 묶음이 같은 낱말을
    //   **다른 뜻**(응답 0건)으로 쓴다. 갈무리 화면이 이미 쓰는 「미작성」으로 갈랐다(새 문안 0).
    expect(html, '미완료를 「미작성」이라 부르지 않는다').toContain('미작성 — 김참여 · 이참여');
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

  // ★★ **한 화면에 「마무리 체크」가 둘이 아니다**(U-9 · 반증자가 U-8 의 중복을 잡았다).
  //   개시는 단방향이라 열린 뒤 관리 패널에 남는 것은 **아무 동작도 없는 뱃지**뿐이었고,
  //   본문 독려 구획과 제목이 같아 한 화면에 같은 이름이 둘이 됐다.
  it('★★ **개시 뒤 관리 패널의 마무리 줄이 걷힌다** — 이름이 한 번만 선다', () => {
    const src = readFileSync('src/app/_screens/console/CohortDetail.tsx', 'utf8');
    // 렌더로 재려면 관리 패널을 눌러야 하는데 정적 렌더에는 클릭이 없다 —
    //   그래서 **조건이 실재하는지**를 잰다(⑦: 물 것이 있는가).
    expect(src, '개시 뒤에도 관리 패널이 마무리 줄을 그린다').toContain('{!postOpened ? (');
    // 그리고 본문 구획은 개시 뒤에만 선다 — 둘이 동시에 서는 조합이 없어야 한다.
    expect(src).toContain('{postOpened && postStatus ? (');
  });

  it('★ **개시 전에는 개시 버튼이 살아 있다** — 걷은 것은 뱃지뿐이다', () => {
    const src = readFileSync('src/app/_screens/console/CohortDetail.tsx', 'utf8');
    expect(src, '개시 버튼이 사라졌다').toContain('개시</Button>');
  });
});

// ★★★ 관리 — **펼침·접힘이라는 사실이 화면에서 읽혀야 한다** (U-10 · 지휘부 지시 2026-09-03
//   「펼침, 접힘 기능인가? 그렇다면 (관리 버튼 대신) 접힘 느낌이 들도록 UI 를 고치자」).
//
//   **이 자리에는 잠금이 하나도 없었다.** `manageOpen`·DOM 순서를 재는 케이스가 0이었고,
//   그래서 「열림 표시가 없다」는 결함이 오래 살아 있었다 — 아무도 재지 않으면 아무도 모른다.
//   **먼저 붉게 만들고 고친다**(⑪ — 물 것이 실재하는가 → 물려 본다 → 잠근다).
describe('관리 — 펼침·접힘', () => {
  const html = () => renderToStaticMarkup(<CohortDetail cohort={cohort} roster={roster} onGroupReport={noop} />);

  it('★★ **접힘이라는 사실이 마크업에 있다** — `aria-expanded`', () => {
    // 없으면 보조기술은 「그냥 버튼」으로 읽고, 눈으로도 열렸는지 알 수 없다.
    expect(html(), '관리 토글에 aria-expanded 가 없다').toContain('aria-expanded="false"');
  });

  it('★★ **열림 여부를 «글자»가 말한다** — ADR-88 의 핵심', () => {
    // ADR-88: 「화살표를 두 차례 고쳤는데도 '누를 수 있는 줄'로 분간되지 않았다 …
    //   **핵심은 아이콘이 아니라 글자다** — '펼치기'/'접기'가 지금 열려 있는지까지 말해 준다.」
    expect(html(), '열림 상태를 글자로 말하지 않는다').toContain('펼치기');
  });

  it('★ **접힘 표시가 눈에도 있다** — 꺾쇠(열리면 180° 회전)', () => {
    expect(html(), '접힘 표시가 없다').toContain('ui-disc__caret');
  });

  it('★ **줄 전체가 버튼이다** — 오른쪽 끝 작은 버튼은 「딸린 것」으로 안 읽힌다', () => {
    expect(html(), '전폭 머리가 아니다').toContain('ui-disc__head');
  });

  it('★★★ **새로 그리지 않았다** — 확정 부품을 쓴다(불변식 20 · ADR-88)', () => {
    const src = readFileSync('src/app/_screens/console/CohortDetail.tsx', 'utf8');
    expect(src, '공용 접힘 부품을 안 쓴다').toContain('Disclosure');
    // 손으로 만든 토글이 되살아나면 규격이 다시 갈린다.
    expect(src, '토글을 손으로 다시 만들었다').not.toContain('setManageOpen');
  });
});
