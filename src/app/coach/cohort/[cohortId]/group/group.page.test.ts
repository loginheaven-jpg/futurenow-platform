// 그룹 리포트 화면 잠금 — 인수 1·7·8·9(ORDER group_report v2 §4).
//
// **코드에 사는 사실만 잰다.** 렌더 정확성은 `groupModel.test.ts` 가 순수 함수로 잰다 —
//   흉내 낸 페이지 렌더는 내가 만든 것을 내가 부르는 것이라 아무것도 증명하지 못한다(계열 ⑦).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (f: string) => readFileSync(f, 'utf8');
// 줄 나누기 — **이스케이프를 쓰지 않는다**(하네스 계열 ⑫).
const NL = String.fromCharCode(10);
const PAGE = 'src/app/coach/cohort/[cohortId]/group/page.tsx';
const DESIGN = 'src/instruments/futurenow/report/GroupDesign.tsx';
const MODEL = 'src/instruments/futurenow/report/groupModel.ts';

describe('★ 블록 순서 (인수 1)', () => {
  it('0 → 1 → 2 → 3 → 4 가 그 차례로 선다', () => {
    const src = read(DESIGN);
    const order = [...src.matchAll(/no=\{(\d)\}\s*\n\s*title="([^"]+)"/g)].map((m) => [Number(m[1]), m[2]] as const);
    expect(order.map((o) => o[0]), '블록 번호가 순서대로가 아니다').toEqual([0, 1, 2, 3, 4]);
    expect(order.map((o) => o[1])).toEqual([
      '응답 현황', '돌봄 우선 명단', '활력 분포', '함정 분포 · 소그룹 편성', '가장 간절한 영역',
    ]);
  });

  it('★ 블록 5(함께 보는 자료)가 **페이지에서 마지막**이다', () => {
    const src = read(PAGE);
    const design = src.indexOf('<GroupDesign');
    const five = src.indexOf('함께 보는 자료 · 평균 지형');
    expect(design, 'GroupDesign 이 없다').toBeGreaterThan(0);
    expect(five, '블록 5 가 없다').toBeGreaterThan(design);
  });
});

describe('★ 사후 범위 (인수 9)', () => {
  it('블록 0~4 는 **사전 기준으로만** 그린다', () => {
    const src = read(PAGE);
    // GroupDesign 에 넘기는 것은 preMembers 하나여야 한다.
    expect(src).toMatch(/<GroupDesign[^>]*done=\{preMembers\}/);
    expect(src, '사후를 편성 블록에 넘긴다').not.toMatch(/<GroupDesign[^>]*postMembers/);
  });

  it('사후 비교는 **블록 5 안에서만** 산다', () => {
    const src = read(PAGE);
    const five = src.indexOf('함께 보는 자료 · 평균 지형');
    // 비교 렌더(postScores)가 블록 5 뒤에 있어야 한다.
    const post = src.indexOf('all={postScores}');
    expect(post, 'postScores 렌더가 없다').toBeGreaterThan(five);
  });

  it('비교가 있을 때 캡션이 그 사실을 말한다', () => {
    expect(read(PAGE)).toContain('위쪽 편성·돌봄 자료는');
  });
});

describe('★ 이름 링크 (인수 7)', () => {
  it('개인 리포트 경로로 가고 **새 창**으로 연다', () => {
    const src = read(DESIGN);
    expect(src).toContain('/coach/cohort/${cohortId}/report/${m.responseId}');
    expect(src).toContain("target=\"_blank\"");
    expect(src, '새 창에 rel 이 빠지면 opener 가 새어 나간다').toContain('rel="noopener noreferrer"');
  });

  it('모달을 쓰지 않는다 — 개인 리포트는 긴 화면이다', () => {
    expect(read(DESIGN)).not.toMatch(/modal|Modal|Dialog/);
  });
});

describe('★ 참여자 미노출 (인수 8 · 회귀 잠금)', () => {
  it('멤버는 되돌리고 비소유 차수는 404 다', () => {
    const src = read(PAGE);
    expect(src, '참여자 차단이 사라졌다').toContain("me.role === 'user'");
    expect(src).toContain("redirect('/home')");
    expect(src, '소유 게이트가 사라졌다').toContain('notFound()');
    expect(src).toContain("redirect('/login')");
  });
});

describe('★ 경계 — 채점·초안·조회를 건드리지 않았다', () => {
  it('집계 모델이 **채점하지 않는다**(경계 2)', () => {
    const src = read(MODEL);
    expect(src, '집계가 점수를 다시 계산한다').not.toMatch(/scoreFuturenow|futurenowScoring/);
  });

  it('★ 초안(`response_drafts`)에 손대지 않는다(경계 6)', () => {
    // 「작성 중」 3단계는 RLS 가 본인 행만 허용해 만들 수 없고, 만들지 않기로 확정됐다.
    // **주석이 아니라 코드만 본다** — 이 결정을 설명하려면 그 이름을 적어야 하고,
    //   그것까지 세면 자가 재려는 것보다 넓어진다(⑨-b).
    for (const f of [PAGE, DESIGN, MODEL]) {
      const code = read(f).split(NL)
        .filter((l) => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*'); })
        .join(NL);
      expect(code, `${f} 가 초안을 만진다`).not.toMatch(/getDraft|response_drafts|saveDraft/);
    }
  });

  it('★ 컴포넌트가 스스로 조회하지 않는다 — 페이지가 이름을 조인해 넘긴다', () => {
    const src = read(DESIGN);
    expect(src, '컴포넌트가 코어를 부른다').not.toMatch(/createServerContext|listCohortMembers|listResponses/);
    // 조인은 페이지 층에서.
    expect(read(PAGE)).toContain('listCohortMembers(cohortId, true)');
  });

  it('AI 해석(`interpretation`)과 무관하다(경계 3)', () => {
    for (const f of [PAGE, DESIGN, MODEL]) {
      expect(read(f)).not.toContain('interpretation');
    }
  });
});

describe('★ PDF 대비 구조 (ORDER v2 §1)', () => {
  it('앱 크롬이 식별 가능한 컨테이너로 감싸여 있다', () => {
    const src = read(PAGE);
    expect(src).toContain('group-report-root');
    expect(src, '인쇄에서 숨길 크롬을 가릴 수 없다').toContain('group-report-chrome');
  });
});
