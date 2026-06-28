import { describe, expect, it } from 'vitest';
import { buildCohortRoster } from './rosterModel';

describe('buildCohortRoster (§8.3 3숫자·3묶음·이름 매핑)', () => {
  const members = [
    { userId: 'u1', name: '이참여' },
    { userId: 'u2', name: '박응답' },
    { userId: 'u3', name: null }, // 이름 null → 폴백
    // u4 는 멤버명부에 없음(이름 조회 불가) → 폴백
  ];
  const enrollments = [{ userId: 'u1' }, { userId: 'u2' }, { userId: 'u3' }, { userId: 'u4' }, { userId: 'u5' }];
  const responses = [
    { id: 'r1', userId: 'u1', createdAt: '2026-06-01' }, // care
    { id: 'r2', userId: 'u2', createdAt: '2026-06-02' }, // done
    { id: 'r3', userId: 'u3', createdAt: '2026-06-03' }, // done
    // u4·u5 미응답
  ];
  const alerts = [
    { responseId: 'r1', severity: 'red_flag', reason: '활력 위기신호' },
    { responseId: 'r1', severity: 'care', reason: '돌봄 체크' },
    { responseId: 'r2', severity: 'info', reason: '참고' }, // info 는 돌봄 아님
  ];

  const model = buildCohortRoster({ enrollments, responses, alerts, members });

  it('3숫자: 응답=3, 대기=2, 돌봄=1', () => {
    expect(model.responded).toBe(3);
    expect(model.waiting).toBe(2);
    expect(model.careCount).toBe(1);
  });

  it('3묶음 분류 + care 사유 결합', () => {
    const care = model.roster.filter((m) => m.status === 'care');
    const done = model.roster.filter((m) => m.status === 'done');
    const pending = model.roster.filter((m) => m.status === 'pending');
    expect(care.map((m) => m.id)).toEqual(['r1']);
    expect(care[0].note).toBe('활력 위기신호 · 돌봄 체크');
    expect(done.map((m) => m.id).sort()).toEqual(['r2', 'r3']);
    expect(pending).toHaveLength(2); // u4·u5
  });

  it('이름 매핑 + null/미등재 폴백 = 참여자', () => {
    const byId = new Map(model.roster.map((m) => [m.id, m.name]));
    expect(byId.get('r1')).toBe('이참여');
    expect(byId.get('r3')).toBe('참여자'); // u3 name null
    expect(model.roster.find((m) => m.id === 'u4')?.name).toBe('참여자'); // 미등재
  });

  it('care 행의 id 는 신호 달린 responseId(리포트가 신호를 보이도록)', () => {
    expect(model.roster.find((m) => m.status === 'care')?.id).toBe('r1');
  });
});
