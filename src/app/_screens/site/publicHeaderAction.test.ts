// 공개 헤더 버튼 — **문구와 목적지가 함께 움직인다** (5차 소건 1-바 · ADR-86 계열).
//
// 이 파일이 막는 것은 하나다: **문구만 고치고 목적지를 안 고치는 것**(또는 그 반대).
// ADR-86 이 그 사고를 이름 붙인 규율이고, 여기서는 둘을 **한 객체**로 묶어 두었으므로
// 갈라지려면 이 테스트를 지나야 한다.
import { describe, expect, it } from 'vitest';
import { publicHeaderAction, PUBLIC_NAV } from './publicNav';

describe('publicHeaderAction — 세션에 따라 문구와 목적지가 함께 바뀐다', () => {
  it('비로그인: 로그인 → /login', () => {
    expect(publicHeaderAction(false)).toEqual({ href: '/login', label: '로그인' });
  });

  it('로그인: **내 홈 → /home**', () => {
    expect(publicHeaderAction(true)).toEqual({ href: '/home', label: '내 홈' });
  });

  it('**문구와 목적지가 어긋나지 않는다** — 라벨이 가리키는 곳으로 간다', () => {
    // ADR-86 의 본체. 라벨과 href 를 각각 검사하지 않고 **짝**을 검사한다.
    const pairs = [
      [publicHeaderAction(false), '/login', '로그인'],
      [publicHeaderAction(true), '/home', '내 홈'],
    ] as const;
    for (const [action, href, label] of pairs) {
      expect(action.href, `${label} 은 ${href} 로 가야 한다`).toBe(href);
      expect(action.label).toBe(label);
    }
  });

  it('로그인한 사람에게 `로그인` 이라고 적지 않는다 — 이 조항이 고치려는 증상 그 자체', () => {
    expect(publicHeaderAction(true).label).not.toContain('로그인');
  });

  it('**공개 현관에 로그아웃을 두지 않는다** — 어포던스는 멤버 셸 하나다(불변식 23)', () => {
    // 골드 면·700 은 헤더에서 가장 강한 자리다. 돌아온 참여자에게 앱이 권하는 첫 행동이
    // *나가기* 가 되어서는 안 되고, 같은 동작이 두 곳에 생겨서도 안 된다.
    expect(publicHeaderAction(true).label).not.toContain('로그아웃');
    expect(publicHeaderAction(false).label).not.toContain('로그아웃');
  });

  it('목적지가 공개 메뉴 6 과 겹치지 않는다 — 같은 곳으로 가는 길을 두 개 만들지 않는다', () => {
    const navHrefs = PUBLIC_NAV.map((i) => i.href);
    expect(navHrefs).not.toContain('/home');
    expect(navHrefs).not.toContain('/login');
  });

  it('순수하다 — 같은 입력이면 같은 출력이고 전역을 읽지 않는다', () => {
    expect(publicHeaderAction(true)).toEqual(publicHeaderAction(true));
    expect(publicHeaderAction(false)).toEqual(publicHeaderAction(false));
  });
});
