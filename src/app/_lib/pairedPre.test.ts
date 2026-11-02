import { describe, expect, it, vi } from 'vitest';
import type { CoreContext, ResponseEnvelope } from '@/contracts';
import { findPairedPre, selectPairedPre } from './pairedPre';

type TestEnvelope = ResponseEnvelope<{ marker: string }, { birthYear: number }>;
function env(id: string, createdAt: string, overrides: Partial<TestEnvelope> = {}): TestEnvelope {
  return {
    id, createdAt, instrumentId: 'futurenow', cohortId: 'co1', userId: 'u1', wave: 'pre',
    answers: { marker: id }, subjectProfile: { birthYear: 1990 }, ...overrides,
  };
}
const post = env('post', '2026-08-10T00:00:00Z', { wave: 'post' });
const invalidPosts = [
  { label: '사전', value: { ...post, wave: 'pre' as const } },
  { label: '단발', value: { ...post, wave: null } },
  { label: '회기 없음', value: { ...post, cohortId: null } },
  { label: '사람 없음', value: { ...post, userId: null } },
  { label: '진단 없음', value: { ...post, instrumentId: '' } },
];

describe('selectPairedPre — 대상 사후 시점의 사전 짝(ADR-204)', () => {
  it('사후 뒤 재제출이 있어도 그 앞의 유효한 사전 기록을 고른다', () => {
    const early = env('early', '2026-08-01T00:00:00Z');
    const paired = env('paired', '2026-08-08T00:00:00Z');
    const after = env('after', '2026-08-11T00:00:00Z');
    const input = Object.freeze([after, early, paired]);
    expect(selectPairedPre(input, post)).toBe(paired);
    expect(selectPairedPre([...input].reverse(), post)).toBe(paired);
    expect(input).toEqual([after, early, paired]);
  });

  it('진단·회기·사람·wave 를 모두 확인하며 다른 대상의 최신 기록을 섞지 않는다', () => {
    const valid = env('valid', '2026-08-01T00:00:00Z');
    const at = '2026-08-09T00:00:00Z';
    const otherRows = [
      env('other-instrument', at, { instrumentId: 'other' }),
      env('other-cohort', at, { cohortId: 'co2' }),
      env('other-user', at, { userId: 'u2' }),
      env('other-wave', at, { wave: 'post' }),
      env('single-wave', at, { wave: null }),
      env('anonymous', at, { userId: null }),
    ];
    expect(selectPairedPre([valid, ...otherRows], post)).toBe(valid);
  });

  it('사후와 같은 작성 시각도 포함하며 사전끼리 동률이면 id 큰 쪽을 고른다', () => {
    const a = env('a', post.createdAt);
    const z = env('z', post.createdAt);
    expect(selectPairedPre([a, z], post)).toBe(z);
    expect(selectPairedPre([z, a], post)).toBe(z);
  });

  it('밀리초 아래에서 사후보다 늦은 사전도 배제한다', () => {
    const precisePost = { ...post, createdAt: '2026-08-10T00:00:00.000002+00:00' };
    const earlier = env('earlier', '2026-08-10T00:00:00.000001+00:00');
    const later = env('later', '2026-08-10T00:00:00.000003+00:00');
    expect(selectPairedPre([later, earlier], precisePost)).toBe(earlier);
  });

  it('봉투와 응답·프로필의 구체 타입을 보존한다', () => {
    const original = env('typed', '2026-08-01T00:00:00Z');
    const selected = selectPairedPre([original], post);
    expect(selected?.answers.marker).toBe('typed');
    expect(selected?.subjectProfile.birthYear).toBe(1990);
    expect(selected).toBe(original);
  });

  it('빈 후보나 사후 뒤의 사전만 있으면 null 이다', () => {
    expect(selectPairedPre([], post)).toBeNull();
    expect(selectPairedPre([env('after', '2026-08-11T00:00:00Z')], post)).toBeNull();
  });

  it.each(invalidPosts)('대상이 $label 이면 짝을 만들지 않는다', ({ value }) => {
    expect(selectPairedPre([env('pre', '2026-08-01T00:00:00Z')], value)).toBeNull();
  });
});

describe('findPairedPre — 조회와 부재를 구분한다', () => {
  it('같은 범위를 pre 로 조회하고 전체 이력에서 공용 선택 규칙을 적용한다', async () => {
    const paired = env('before', '2026-08-01T00:00:00Z');
    const listResponses = vi.fn().mockResolvedValue([paired, env('after', '2026-08-11T00:00:00Z')]);
    const ctx = { listResponses } as Pick<CoreContext, 'listResponses'>;
    expect(await findPairedPre(ctx, post)).toBe(paired);
    expect(listResponses).toHaveBeenCalledExactlyOnceWith({
      instrumentId: 'futurenow', cohortId: 'co1', userId: 'u1', wave: 'pre',
    });
  });

  it('정상 조회에서 짝이 없으면 null 이다', async () => {
    const ctx = { listResponses: vi.fn().mockResolvedValue([]) } as Pick<CoreContext, 'listResponses'>;
    expect(await findPairedPre(ctx, post)).toBeNull();
  });

  it('조회 오류를 null 로 삼키지 않고 동일한 오류를 던진다', async () => {
    const failure = new Error('lookup failed');
    const ctx = { listResponses: vi.fn().mockRejectedValue(failure) } as Pick<CoreContext, 'listResponses'>;
    await expect(findPairedPre(ctx, post)).rejects.toBe(failure);
  });

  it.each(invalidPosts)('대상이 $label 이면 조회하지 않는다', async ({ value }) => {
    const listResponses = vi.fn();
    expect(await findPairedPre({ listResponses } as Pick<CoreContext, 'listResponses'>, value)).toBeNull();
    expect(listResponses).not.toHaveBeenCalled();
  });
});
