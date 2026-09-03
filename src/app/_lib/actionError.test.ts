import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { safeActionError } from './actionError';
import { CoreError, CoreForbiddenError, CoreNotFoundError, CoreValidationError } from '@/core/errors';

// 액션 실패 문안 잠금 (U-6) — **내부 메시지가 화면으로 새지 않는다.**
const FALLBACK = '처리하지 못했습니다.';

describe('safeActionError', () => {
  it('**사람이 지어 쓴 문장은 통과한다** — 운영자가 왜 막혔는지 읽어야 한다', () => {
    expect(safeActionError(new CoreForbiddenError('자기 자신은 처리할 수 없습니다'), FALLBACK)).toBe('자기 자신은 처리할 수 없습니다');
    expect(safeActionError(new CoreNotFoundError('회기를 찾을 수 없습니다'), FALLBACK)).toBe('회기를 찾을 수 없습니다');
    expect(safeActionError(new CoreValidationError('이름은 1~40자입니다'), FALLBACK)).toBe('이름은 1~40자입니다');
  });

  // ⑪ **막아야 할 것을 일부러 먹인다.**
  it('★★ **내부 메시지는 덮는다** — 스키마·제약 이름이 새지 않는다', () => {
    const pg = new Error('duplicate key value violates unique constraint "memberships_pkey"');
    expect(safeActionError(pg, FALLBACK), 'Postgres 오류가 화면으로 샜다').toBe(FALLBACK);
    expect(safeActionError(new TypeError('fetch failed'), FALLBACK)).toBe(FALLBACK);
    expect(safeActionError('문자열도 던져질 수 있다', FALLBACK)).toBe(FALLBACK);
    expect(safeActionError(undefined, FALLBACK)).toBe(FALLBACK);
    // 미분류 `CoreError` 도 덮는다 — 코어 내부 사정(`updateCohort 실패: …`)은 사람 말이 아니다.
    expect(safeActionError(new CoreError('updateCohort 실패: 42501'), FALLBACK)).toBe(FALLBACK);
  });

  it('★ **본부 액션 전부가 이 문을 지난다** — 한 곳이 빠지면 그 액션만 샌다', () => {
    for (const f of ['src/app/admin/actions.ts', 'src/app/admin/approvals/actions.ts']) {
      const src = readFileSync(f, 'utf8');
      expect(src, `${f} 가 이 문을 안 지난다`).toContain('safeActionError(');
      // ⑬ 「있는가」로 묻지 않는다 — **날것이 남아 있지 않은가**를 함께 잰다.
      const body = src.replace(/\/\*[\s\S]*?\*\//g, '').split(String.fromCharCode(10))
        .filter((l) => !l.trim().startsWith('//')).join(String.fromCharCode(10));
      expect(body, `${f} 에 날 메시지 통과가 남았다`).not.toContain('e.message');
    }
  });
});
