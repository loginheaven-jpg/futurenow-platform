import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminMembers } from './AdminMembers';
import type { MemberSummary } from '@/contracts';

const members: MemberSummary[] = [
  { id: 'a1', email: 'admin@t.test', name: '운영자', role: 'admin' },
  { id: 'u1', email: 'user@t.test', name: '이멤버', role: 'user' },
  { id: 'c1', email: 'coach@t.test', name: null, role: 'coach' },
];
const noop = () => {};
const html = renderToStaticMarkup(<AdminMembers members={members} currentUserId="a1" onPromote={noop} onDemote={noop} />);

describe('AdminMembers (본부 멤버 관리)', () => {
  it('역할 라벨·이름(null 폴백)·이메일 렌더', () => {
    expect(html).toContain('운영자');
    expect(html).toContain('코치');
    expect(html).toContain('멤버');
    expect(html).toContain('이름 미입력'); // c1 name null
    expect(html).toContain('user@t.test');
  });

  it('user 행에 [코치로 승격], coach 행에 [멤버로 강등]', () => {
    expect(html).toContain('코치로 승격');
    expect(html).toContain('멤버로 강등');
  });

  it('본인(운영자) 행은 "나" 표시 + 강등 버튼 없음', () => {
    expect(html).toContain('· 나');
    // 운영자 본인 행에는 승격/강등 버튼이 없다(admin role). 강등은 coach 행에만.
    const demoteCount = (html.match(/멤버로 강등/g) ?? []).length;
    expect(demoteCount).toBe(1); // coach(c1) 한 줄만
  });

  it('셸 헤더(본부) + headerActions 슬롯 전달(로그아웃·내 정보) — Step 3.1', () => {
    const withAction = renderToStaticMarkup(
      <AdminMembers members={members} currentUserId="a1" onPromote={noop} onDemote={noop} headerActions={<span>ADMIN_HDR</span>} />,
    );
    expect(withAction).toContain('본부'); // AppHeader title
    expect(withAction).toContain('ADMIN_HDR'); // action 슬롯 전달
  });
});
