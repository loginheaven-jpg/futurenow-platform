import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminMembers } from './AdminMembers';
import type { CoachApplication, MemberSummary } from '@/contracts';

const members: MemberSummary[] = [
  { id: 'a1', email: 'admin@t.test', name: '운영자', role: 'admin', memberState: 'individual', isSuperAdmin: false },
  { id: 'u1', email: 'user@t.test', name: '이멤버', role: 'user', memberState: 'pending', isSuperAdmin: false },
  { id: 'c1', email: 'coach@t.test', name: null, role: 'coach', memberState: 'cohort', isSuperAdmin: false },
];
const applications: CoachApplication[] = [
  { id: 'app1', userId: 'u1', applicantName: '김신청', status: 'pending', motivation: '함께 돕고 싶어요', reviewedBy: null, reviewedAt: null, reviewNote: null, createdAt: '2026-07-02T00:00:00Z' },
];
const noop = () => {};
const render = (over: Partial<Parameters<typeof AdminMembers>[0]> = {}) =>
  renderToStaticMarkup(
    <AdminMembers members={members} applications={applications} currentUserId="a1" isSuperAdmin={false} onDecide={noop} onPromote={noop} onDemote={noop} onDelete={noop} onSetPassword={async () => ({ ok: true })} onApprove={noop} onReject={noop} {...over} />,
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

  // **셸 헤더 단언은 껍데기로 옮겼다**(U-3) — 제목 `본부` 는 `screenChrome` 표가 들고
  //   `tests/screenChrome.test.ts` 가 잠근다. 여기서는 **화면이 더는 안 그린다**를 잰다.
  it('**화면이 헤더를 그리지 않는다** — 껍데기가 그린다', () => {
    expect(html, '헤더가 남아 있으면 사이드바 자리와 두 겹이 된다').not.toContain('<header');
  });
});

// ── 5-3 회원 관리에서 승급·보류 ─────────────────────────────────────────────
describe('회원 관리 — 상태 열과 버튼 둘 (5-3)', () => {
  it('**보류된 사람도 목록에 뜬다** — 감추면 되돌릴 길이 화면에서 사라진다', () => {
    const html = render({
      members: [{ id: 'x1', email: 'x@t.test', name: '보류된 사람', role: 'user',
                  memberState: 'expired', isSuperAdmin: false }],
    });
    expect(html, '상태로 거르면 안 된다').toContain('보류된 사람');
    expect(html, '상태 이름이 열로 보여야 한다').toContain('이용 보류');
  });

  it('★ **보류된 사람의 승급 버튼이 활성이다** — 승급이 곧 해제다', () => {
    const html = render({
      members: [{ id: 'x1', email: 'x@t.test', name: '보류된 사람', role: 'user',
                  memberState: 'expired', isSuperAdmin: false }],
    });
    // 승급 버튼이 있고, 그 버튼이 disabled 가 아니어야 한다.
    const m = html.match(/<button[^>]*>승급<\/button>/);
    expect(m, '승급 버튼이 없다').toBeTruthy();
    expect(m![0], '보류된 사람의 승급이 잠겨 있다 — 되돌릴 길이 없어진다').not.toContain('disabled');
  });

  it('상태 이름을 화면이 짓지 않는다 — 단일 출처 어휘가 그대로 뜬다', () => {
    const html = render({
      members: [{ id: 'x1', email: 'x@t.test', name: 'A', role: 'user', memberState: 'individual', isSuperAdmin: false }],
    });
    expect(html).toContain('포럼회원');
  });
});
