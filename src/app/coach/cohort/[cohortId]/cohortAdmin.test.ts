import { describe, expect, it } from 'vitest';
import { cohortNameValid, refineActionError } from './cohortAdmin';

describe('cohortNameValid (이름 1~40자)', () => {
  it('정상(1~40자) 통과', () => {
    expect(cohortNameValid('봄 1기')).toBe(true);
    expect(cohortNameValid('가')).toBe(true);
    expect(cohortNameValid('가'.repeat(40))).toBe(true);
  });
  it('빈값·공백전용 거부', () => {
    expect(cohortNameValid('')).toBe(false);
    expect(cohortNameValid('   ')).toBe(false);
  });
  it('41자 초과 거부, trim 후 길이 기준', () => {
    expect(cohortNameValid('가'.repeat(41))).toBe(false);
    expect(cohortNameValid('  ' + '가'.repeat(40) + '  ')).toBe(true); // trim 후 40
  });
});

describe('refineActionError (실패 정제 — 원본 비노출)', () => {
  it('NotFound·권한·내부 CoreError → 통합 친화 메시지', () => {
    expect(refineActionError('차수를 찾을 수 없습니다: abc-123')).toBe('차수를 찾을 수 없거나 권한이 없어요.');
    expect(refineActionError('차수 수정은 코치 또는 운영자만 가능합니다')).toBe('차수를 찾을 수 없거나 권한이 없어요.');
    expect(refineActionError('updateCohort 실패: duplicate key value …')).toBe('차수를 찾을 수 없거나 권한이 없어요.');
  });
  it('친화 폴백 카피는 그대로 노출', () => {
    expect(refineActionError('이름은 1~40자로 입력해 주세요.')).toBe('이름은 1~40자로 입력해 주세요.');
    expect(refineActionError('정원 변경에 실패했습니다.')).toBe('정원 변경에 실패했습니다.');
  });
  it('빈 error → 일반 메시지', () => {
    expect(refineActionError(undefined)).toMatch(/문제가 생겼어요/);
  });
});
