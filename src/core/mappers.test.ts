import { describe, it, expect } from 'vitest';
import { rowToUser, rowToCohort, rowToEnrollment, rowToEnvelope } from './mappers';

describe('rowToUser', () => {
  it('snake→domain, null email 은 빈 문자열로', () => {
    expect(rowToUser({ id: 'u1', email: null, name: '홍길동', nickname: '길동', role: 'coach' })).toEqual({
      id: 'u1',
      email: '',
      name: '홍길동',
      nickname: '길동',
      role: 'coach',
    });
  });
});

describe('rowToCohort', () => {
  it('snake_case → camelCase 매핑(description 포함)', () => {
    expect(
      rowToCohort({
        id: 'co1',
        coach_id: 'c1',
        instrument_id: 'futurenow',
        name: '1기',
        description: '소개글',
        code: 'ABC23',
        status: 'active',
        max_members: 10,
        expires_at: null,
        post_opened_at: '2026-07-02T05:12:00Z',
      }),
    ).toEqual({
      id: 'co1',
      coachId: 'c1',
      instrumentId: 'futurenow',
      name: '1기',
      description: '소개글',
      code: 'ABC23',
      status: 'active',
      maxMembers: 10,
      expiresAt: null,
      postOpenedAt: '2026-07-02T05:12:00Z',
    });
  });

  it('description 미포함 select → null', () => {
    expect(
      rowToCohort({ id: 'x', coach_id: 'c', instrument_id: 'futurenow', name: 'n', code: 'C', status: 'active', max_members: 1, expires_at: null }).description,
    ).toBe(null);
  });
});

describe('rowToEnrollment', () => {
  it('매핑', () => {
    expect(rowToEnrollment({ cohort_id: 'co1', user_id: 'u1', joined_at: 't0' })).toEqual({
      cohortId: 'co1',
      userId: 'u1',
      joinedAt: 't0',
    });
  });
});

describe('rowToEnvelope', () => {
  it('wave null 유지, answers·subject_profile 통과', () => {
    const env = rowToEnvelope<{ A1: number }, { age: string }>({
      id: 'r1',
      instrument_id: 'futurenow',
      cohort_id: 'co1',
      user_id: 'u1',
      wave: null,
      answers: { A1: 4 },
      subject_profile: { age: '30s' },
      created_at: 't0',
    });
    expect(env).toEqual({
      id: 'r1',
      instrumentId: 'futurenow',
      cohortId: 'co1',
      userId: 'u1',
      wave: null,
      answers: { A1: 4 },
      subjectProfile: { age: '30s' },
      createdAt: 't0',
    });
  });
  it('wave pre/post 보존', () => {
    const env = rowToEnvelope({
      id: 'r2',
      instrument_id: 'futurenow',
      cohort_id: null,
      user_id: null,
      wave: 'post',
      answers: {},
      subject_profile: {},
      created_at: 't0',
    });
    expect(env.wave).toBe('post');
    expect(env.cohortId).toBeNull();
  });
});
