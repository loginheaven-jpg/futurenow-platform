import { describe, it, expect } from 'vitest';
import { satisfiesRole, canAccessContact } from './authz';

describe('satisfiesRole (계층: user < coach < admin)', () => {
  it('동일 역할은 충족', () => {
    expect(satisfiesRole('user', 'user')).toBe(true);
    expect(satisfiesRole('coach', 'coach')).toBe(true);
    expect(satisfiesRole('admin', 'admin')).toBe(true);
  });
  it('상위 역할은 하위 요구를 충족', () => {
    expect(satisfiesRole('admin', 'coach')).toBe(true);
    expect(satisfiesRole('admin', 'user')).toBe(true);
    expect(satisfiesRole('coach', 'user')).toBe(true);
  });
  it('하위 역할은 상위 요구를 충족하지 못함', () => {
    expect(satisfiesRole('user', 'coach')).toBe(false);
    expect(satisfiesRole('user', 'admin')).toBe(false);
    expect(satisfiesRole('coach', 'admin')).toBe(false);
  });
});

describe('canAccessContact (전화번호 — 본인 또는 운영자만, ADR-04)', () => {
  it('본인은 자기 번호 접근 가능', () => {
    expect(canAccessContact({ id: 'u1', role: 'user' }, 'u1')).toBe(true);
    expect(canAccessContact({ id: 'c1', role: 'coach' }, 'c1')).toBe(true);
  });
  it('운영자는 타인 번호 접근 가능', () => {
    expect(canAccessContact({ id: 'a1', role: 'admin' }, 'u2')).toBe(true);
  });
  it('코치는 타인 번호 접근 불가(상호 비열람)', () => {
    expect(canAccessContact({ id: 'c1', role: 'coach' }, 'u2')).toBe(false);
  });
  it('일반 사용자는 타인 번호 접근 불가', () => {
    expect(canAccessContact({ id: 'u1', role: 'user' }, 'u2')).toBe(false);
  });
});
