import { describe, expect, it } from 'vitest';
import { consoleSheet } from './consoleSheet';
import { ACCOUNT_GROUP } from '@/app/_lib/memberSheet';
import { ADMIN_DOOR, CONSOLE_DOOR, HOME_DOOR, SITE_DOOR } from '@/app/_vocab/doors';
import { PUBLIC_SHEET_MINE } from '@/app/_screens/site/publicNav';

const labels = (role: 'coach' | 'admin') => consoleSheet(role).flatMap((g) => g.items.map((i) => i.label));

describe('콘솔 시트 — 참여자와 같은 구획 (U-5)', () => {
  it('**구획이 넷이다** — 「운영」을 「내 자리」에 합쳤다(결재 2026-09-03)', () => {
    expect(consoleSheet('admin').map((g) => g.title)).toEqual([PUBLIC_SHEET_MINE, '인도자', '자료', ACCOUNT_GROUP]);
  });

  it('**운영자의 「본부」는 「내 자리」에 있다** — 별도 구획을 만들지 않는다', () => {
    const mine = consoleSheet('admin').find((g) => g.title === PUBLIC_SHEET_MINE);
    expect(mine?.items.map((i) => i.label)).toEqual([CONSOLE_DOOR.label, ADMIN_DOOR.label, SITE_DOOR.label]);
  });

  it('**인도자에게는 운영자 문이 없다** — 역할이 실제로 갈린다', () => {
    expect(labels('coach')).not.toContain(ADMIN_DOOR.label);
    expect(labels('coach')).not.toContain('가입 승인');
    expect(labels('admin')).toContain('가입 승인');
  });

  it('**「내 홈」이 없다** — 인도자의 홈이 곧 이 화면이다(ADR-181 과 같은 규율)', () => {
    expect(labels('coach')).not.toContain(HOME_DOOR.label);
  });

  it('**언제든 서비스 현관으로 갈 수 있다**(지휘부 지시 2026-09-02)', () => {
    expect(labels('coach')).toContain(SITE_DOOR.label);
  });

  it('**빈 구획이 없다** — 제목만 남은 줄을 시트에 넘기지 않는다', () => {
    for (const role of ['coach', 'admin'] as const) {
      for (const g of consoleSheet(role)) expect(g.items.length, `${role}/${g.title} 가 비었다`).toBeGreaterThan(0);
    }
  });
});
