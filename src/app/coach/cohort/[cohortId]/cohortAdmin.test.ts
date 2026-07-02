import { describe, expect, it } from 'vitest';
import { applyOptimistic, cohortNameValid, refineActionError } from './cohortAdmin';

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

describe('applyOptimistic (낙관적 오케스트레이션 — C-4)', () => {
  function tracker() {
    const calls: string[] = [];
    let rolledBackWith: string | undefined | 'NOCALL' = 'NOCALL';
    return {
      calls,
      optimistic: () => calls.push('optimistic'),
      onCommit: () => calls.push('commit'),
      onRollback: (e?: string) => { calls.push('rollback'); rolledBackWith = e; },
      rolledBack: () => rolledBackWith,
    };
  }

  it('성공: optimistic→commit, 롤백 없음, true', async () => {
    const t = tracker();
    const ok = await applyOptimistic({ optimistic: t.optimistic, onCommit: t.onCommit, onRollback: t.onRollback, action: async () => ({ ok: true }) });
    expect(ok).toBe(true);
    expect(t.calls).toEqual(['optimistic', 'commit']);
    expect(t.rolledBack()).toBe('NOCALL');
  });

  it('반환 실패: optimistic→rollback(error 전달), commit 없음, false (조용한 삼킴 금지)', async () => {
    const t = tracker();
    const ok = await applyOptimistic({ optimistic: t.optimistic, onCommit: t.onCommit, onRollback: t.onRollback, action: async () => ({ ok: false, error: '이름은 1~40자로 입력해 주세요.' }) });
    expect(ok).toBe(false);
    expect(t.calls).toEqual(['optimistic', 'rollback']);
    expect(t.rolledBack()).toBe('이름은 1~40자로 입력해 주세요.'); // 에러가 롤백 경로로 전달(사용자 노출)
  });

  it('예외: optimistic→rollback(e.message), commit 없음, false (throw 도 삼키지 않음)', async () => {
    const t = tracker();
    const ok = await applyOptimistic({ optimistic: t.optimistic, onCommit: t.onCommit, onRollback: t.onRollback, action: async () => { throw new Error('네트워크 오류'); } });
    expect(ok).toBe(false);
    expect(t.calls).toEqual(['optimistic', 'rollback']);
    expect(t.rolledBack()).toBe('네트워크 오류');
  });
});
