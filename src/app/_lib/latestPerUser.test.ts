import { describe, expect, it } from 'vitest';
import type { ResponseEnvelope } from '@/contracts';
import { latestPerUser } from './latestPerUser';

function env(id: string, userId: string | null, createdAt: string): ResponseEnvelope {
  return {
    id,
    instrumentId: 'futurenow',
    cohortId: 'co1',
    userId,
    wave: 'pre',
    answers: {},
    subjectProfile: {},
    createdAt,
  };
}

describe('latestPerUser — 재진단 dedup(user별 최신 1건)', () => {
  it('같은 user 3건 → created_at 최신 1건만', () => {
    const out = latestPerUser([
      env('a', 'u1', '2026-06-01T00:00:00Z'),
      env('b', 'u1', '2026-06-03T00:00:00Z'), // 최신
      env('c', 'u1', '2026-06-02T00:00:00Z'),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('b');
  });

  it('서로 다른 user는 각각 1건씩 전원 보존', () => {
    const out = latestPerUser([
      env('a', 'u1', '2026-06-01T00:00:00Z'),
      env('b', 'u2', '2026-06-01T00:00:00Z'),
      env('c', 'u3', '2026-06-01T00:00:00Z'),
    ]);
    expect(out).toHaveLength(3);
    expect(new Set(out.map((e) => e.userId))).toEqual(new Set(['u1', 'u2', 'u3']));
  });

  it('입력 순서 무관 — 최신이 앞·뒤 어디 있어도 최신 선택', () => {
    const newest = env('new', 'u1', '2026-06-10T00:00:00Z');
    const older = env('old', 'u1', '2026-06-01T00:00:00Z');
    expect(latestPerUser([newest, older])[0].id).toBe('new');
    expect(latestPerUser([older, newest])[0].id).toBe('new');
  });

  it('같은 작성 시각은 id 큰 쪽 — 입력 순서를 뒤집어도 같다(ADR-204)', () => {
    const smaller = env('a', 'u1', '2026-06-10T00:00:00Z');
    const larger = env('z', 'u1', '2026-06-10T00:00:00Z');
    expect(latestPerUser([smaller, larger])[0]).toBe(larger);
    expect(latestPerUser([larger, smaller])[0]).toBe(larger);
  });

  it('id 보다 작성 시각이 우선이고 밀리초 아래 시각도 구분한다', () => {
    const earlier = env('z', 'u1', '2026-06-10T00:00:00.000001+00:00');
    const later = env('a', 'u1', '2026-06-10T00:00:00.000002+00:00');
    expect(latestPerUser([later, earlier])[0]).toBe(later);
  });

  it('userId=null은 접지 않고 각각 보존(서로 다른 사람 가능)', () => {
    const out = latestPerUser([
      env('a', null, '2026-06-01T00:00:00Z'),
      env('b', null, '2026-06-02T00:00:00Z'),
    ]);
    expect(out).toHaveLength(2);
  });

  it('빈 입력 → 빈 배열', () => {
    expect(latestPerUser([])).toEqual([]);
  });
});
