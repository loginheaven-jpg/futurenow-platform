import { describe, expect, it } from 'vitest';
import { isProtectedPath } from './proxy.guard';

describe('isProtectedPath (middleware 보호 경로 판정)', () => {
  it('보호: /home·/my·/coach·/admin 및 하위', () => {
    for (const p of [
      '/home',
      '/home/x',
      '/my',
      '/my/cohorts',
      '/my/cohorts/abc/report',
      '/coach',
      '/coach/cohort/x',
      '/coach/new',
      '/admin',
      '/admin/x',
    ]) {
      expect(isProtectedPath(p)).toBe(true);
    }
  });

  it('공개(통과): /·/login·/signup·/join', () => {
    for (const p of ['/', '/login', '/signup', '/join']) {
      expect(isProtectedPath(p)).toBe(false);
    }
  });

  it('접두 오매칭 방지(/homex·/coaching·/joinx 비보호)', () => {
    expect(isProtectedPath('/homex')).toBe(false);
    expect(isProtectedPath('/coaching')).toBe(false);
    expect(isProtectedPath('/joinx')).toBe(false);
  });
});
