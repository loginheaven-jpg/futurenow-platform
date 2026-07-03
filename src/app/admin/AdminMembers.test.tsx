import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminMembers } from './AdminMembers';
import type { CoachApplication, MemberSummary } from '@/contracts';

const members: MemberSummary[] = [
  { id: 'a1', email: 'admin@t.test', name: '운영자', role: 'admin' },
  { id: 'u1', email: 'user@t.test', name: '이멤버', role: 'user' },
  { id: 'c1', email: 'coach@t.test', name: null, role: 'coach' },
];
const applications: CoachApplication[] = [
  { id: 'app1', userId: 'u1', applicantName: '김신청', status: 'pending', motivation: '함께 돕고 싶어요', reviewedBy: null, reviewedAt: null, reviewNote: null, createdAt: '2026-07-02T00:00:00Z' },
];
const noop = () => {};
const render = (over: Partial<Parameters<typeof AdminMembers>[0]> = {}) =>
  renderToStaticMarkup(
    <AdminMembers members={members} applications={applications} currentUserId="a1" onPromote={noop} onDemote={noop} onApprove={noop} onReject={noop} {...over} />,
  );

describe('AdminMembers (본부 — 승인 대기 + 멤버 관리)', () => {
  const html = render();

  it('역할 라벨·이름(null 폴백)·이메일 렌더', () => {
    expect(html).toContain('운영자');
    expect(html).toContain('인도자'); // coach 역할 라벨(용어 통일)
    expect(html).toContain('멤버');
    expect(html).toContain('이름 미입력'); // c1 name null
    expect(html).toContain('user@t.test');
  });

  it('user 행에 [인도자로 승격], coach 행에 [멤버로 강등]', () => {
    expect(html).toContain('인도자로 승격');
    expect(html).toContain('멤버로 강등');
  });

  it('본인(운영자) 행은 "나" 표시 + 강등 버튼 없음', () => {
    expect(html).toContain('· 나');
    // 운영자 본인 행에는 승격/강등 버튼이 없다(admin role). 강등은 coach 행에만.
    const demoteCount = (html.match(/멤버로 강등/g) ?? []).length;
    expect(demoteCount).toBe(1); // coach(c1) 한 줄만
  });

  it('승인 대기 섹션 — 신청자·계기 + 승인/거절 버튼(멤버 관리와 구분)', () => {
    expect(html).toContain('승인 대기 (1)');
    expect(html).toContain('김신청');
    expect(html).toContain('함께 돕고 싶어요');
    expect(html).toContain('거절');
    expect(html).toContain('멤버 관리'); // 두 섹션 구분 헤더
  });

  it('승인 대기 0건 — 빈 안내(신청자 미노출)', () => {
    const empty = render({ applications: [] });
    expect(empty).toContain('대기 중인 신청이 없어요');
    expect(empty).not.toContain('김신청');
  });

  it('셸 헤더(본부) + headerActions 슬롯 전달 — Step 3.1', () => {
    const withAction = render({ headerActions: <span>ADMIN_HDR</span> });
    expect(withAction).toContain('본부'); // AppHeader title
    expect(withAction).toContain('ADMIN_HDR'); // action 슬롯 전달
    // A′-2: root 로고=통합 홈 링크(/home), 뒤로 없음
    expect(withAction).toContain('href="/home"');
    expect(withAction).not.toContain('aria-label="뒤로"');
  });
});
