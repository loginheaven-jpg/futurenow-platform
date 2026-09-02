import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemberHome } from './MemberHome';
import type { MyCohortSummary } from '@/contracts';
import { TOOL } from '@/app/_vocab/tool';
import { readFileSync } from 'node:fs';
import { JOIN_BY_CODE, MY_REPORT, MY_SEMINARS } from '@/app/_vocab/memberMenu';
import { roleTargets } from '@/app/(member)/home/roleTarget';

const cohort = (over: Partial<MyCohortSummary> = {}): MyCohortSummary => ({
  cohortId: 'co1',
  name: '봄 1기',
  coachName: '김코치',
  status: 'active',
  preDone: false,
  postDone: false,
  postOpened: false,
  openSessionNo: null,
  openSessionSubmitted: false,
  openSessionHasContent: false,
  joinedAt: '2026-06-01',
  ...over,
});

describe('MemberHome (멤버 홈 본문 — 진입-3)', () => {
  it('진행 중 체크(pre_done=false) → 골드 카드 + [이어서 체크하기]→/join?cohort=', () => {
    const html = renderToStaticMarkup(<MemberHome greetingName="이멤버" cohorts={[cohort({ cohortId: 'co1', preDone: false })]} />);
    expect(html).toContain('이멤버님');
    expect(html).toContain(`진행 중인 ${TOOL.short}`);
    expect(html).toContain(`이어서 ${TOOL.short}하기`);
    expect(html).toContain('href="/join?cohort=co1"');
    expect(html).toContain('--color-text-on-gold'); // 골드 버튼 네이비 글자
  });

  it('진행 중 없으면(전부 완료) 카드 생략', () => {
    const html = renderToStaticMarkup(<MemberHome greetingName="이멤버" cohorts={[cohort({ cohortId: 'c2', preDone: true })]} />);
    expect(html).not.toContain(`진행 중인 ${TOOL.short}`);
  });

  it('사후 개시·미완이면 마무리 체크 카드', () => {
    const html = renderToStaticMarkup(
      <MemberHome greetingName="이멤버" cohorts={[cohort({ cohortId: 'c3', preDone: true, postOpened: true, postDone: false })]} />,
    );
    expect(html).toContain(`${TOOL.post} 하기`);
    expect(html).toContain('href="/join?cohort=c3&amp;wave=post"');
  });
});

// ★★ **옮겨 간 것을 「사라졌다」로 재지 않는다** (ADR-181).
//
//   옛 잠금 일곱이 여기서 「내 세미나」·「내 리포트」·「코드로 세미나 참여」·운영 카드를 쟀다.
//   그 넷은 **지워진 것이 아니라 시트와 역할 카드로 갔다**(지시: 「메뉴들은 햄버거버튼 휘하에 있다」).
//   그러므로 잠금도 **없어졌는가가 아니라 옮겨 갔는가**를 재야 한다 — 지우면 그 문들이
//   다음 회차에 조용히 사라져도 아무도 모른다.
describe('★★ 옮겨 간 문들이 새 자리에 실재한다', () => {
  it('본문에는 더 이상 없다 — 한 화면에서 두 번 말하지 않는다', () => {
    const html = renderToStaticMarkup(<MemberHome greetingName="이멤버" cohorts={[cohort({ preDone: true })]} />);
    for (const gone of [MY_SEMINARS, MY_REPORT, JOIN_BY_CODE, '인도자 콘솔', '본부']) {
      expect(html, `본문에 아직 있다: ${gone}`).not.toContain(gone);
    }
  });

  it('★ 시트가 그 셋을 든다 — 이름이 바뀌지 않았다', () => {
    const sheet = readFileSync('src/app/_lib/memberSheet.ts', 'utf8');
    for (const moved of ['MY_SEMINARS', 'MY_REPORT', 'JOIN_BY_CODE']) {
      expect(sheet, `시트가 ${moved} 를 안 든다`).toContain(moved);
    }
    // 이름은 한 곳에서 온다 — 옮기면서 손으로 다시 적지 않았다(불변식 23).
    expect(MY_SEMINARS).toBe('내 세미나');
    expect(MY_REPORT).toBe('내 리포트');
    expect(JOIN_BY_CODE).toBe('코드로 세미나 참여');
  });

  it('★★ 운영 두 문은 **역할 카드**가 든다 — 승인 대기 건수까지', () => {
    expect(roleTargets('admin', [], { pendingCoachApps: 2 }).map((t) => t.href)).toContain('/admin');
    expect(roleTargets('coach', []).map((t) => t.href)).toContain('/coach');
    expect(roleTargets('admin', [], { pendingCoachApps: 2 })[0].sub, '건수를 잃었다').toContain('2건');
  });
});
