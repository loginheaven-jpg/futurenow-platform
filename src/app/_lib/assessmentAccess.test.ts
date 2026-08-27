// 표시 매핑 ↔ 진실표 픽스처 대조 — **사본이 셋이 되는 자리를 여기서 잠근다**(단계 5 지시 1).
import { describe, it, expect } from 'vitest';
import { assessmentAccess } from './assessmentAccess';
import { ACCESS_KINDS, ACCESS_TABLE, expectedAccess } from '../../../tests/fixtures/membershipAccess';
import type { AssessmentKind, MemberState } from '@/contracts/domain';

describe('assessmentAccess — 진실표와 한 칸도 어긋나지 않는다', () => {
  it('5상태 × 2계열 전수가 픽스처와 같다', () => {
    for (const row of ACCESS_TABLE) {
      for (const kind of ACCESS_KINDS) {
        expect(
          assessmentAccess(row.state as MemberState, kind as AssessmentKind),
          `${row.state} × ${kind} — ${row.why}`,
        ).toBe(expectedAccess(row.state, kind));
      }
    }
  });

  it('픽스처가 다섯 상태를 다 덮으므로 이 대조에 빈틈이 없다', () => {
    expect(ACCESS_TABLE).toHaveLength(5);
    expect(ACCESS_KINDS).toHaveLength(2);
  });

  it('앱 모듈은 픽스처를 import 하지 않는다 — 픽스처는 재는 자다', async () => {
    // 주석이 픽스처를 **설명**하는 것은 옳고, **읽어 쓰는** 것만 막아야 한다.
    //   그래서 텍스트 포함이 아니라 import/require 문만 본다(첫 판은 주석까지 잡아 레드가 났다).
    const src = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('./assessmentAccess.ts', import.meta.url), 'utf-8'),
    );
    const imports = src
      .split(/\r?\n/)
      .filter((l) => /^\s*(import|export)\s|require\(/.test(l))
      .join(' | ');
    expect(imports).not.toMatch(/fixtures|ACCESS_TABLE|PRIORITY_CASES/);
    // 이 모듈이 기대는 것은 계약 타입 하나뿐이다.
    expect(imports).toContain("from '@/contracts/domain'");
  });
});

describe('assessmentAccess — 규칙의 모양', () => {
  it('여정을 여는 상태는 cohort 하나다', () => {
    const opens = (['pending', 'individual', 'cohort', 'expired', 'held'] as MemberState[])
      .filter((s) => assessmentAccess(s, 'journey'));
    expect(opens).toEqual(['cohort']);
  });

  it('상시를 여는 상태는 cohort·individual 둘이다', () => {
    const opens = (['pending', 'individual', 'cohort', 'expired', 'held'] as MemberState[])
      .filter((s) => assessmentAccess(s, 'standing'));
    expect(opens.sort()).toEqual(['cohort', 'individual']);
  });
});
