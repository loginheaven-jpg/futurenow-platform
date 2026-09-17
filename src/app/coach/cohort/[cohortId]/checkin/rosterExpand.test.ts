import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { rosterExpandable } from './rosterExpand';

const EMPTY = { hasContent: false, submittedAt: null };

describe('명단 행 펼침 — 사진도 내용이다 (ADR-197)', () => {
  it('글 없이 사진만 올린 사람도 펼친다 — 세미나 중 촬영의 중심 사례', () => {
    expect(rosterExpandable(EMPTY, 2)).toBe(true);
  });

  it('행만 있고 글도 사진도 없으면 펼치지 않는다(ADR-91 B4 그대로)', () => {
    expect(rosterExpandable(EMPTY, 0)).toBe(false);
  });

  it('글이 있거나 제출했으면 펼친다(전과 같다)', () => {
    expect(rosterExpandable({ hasContent: true, submittedAt: null }, 0)).toBe(true);
    expect(rosterExpandable({ hasContent: false, submittedAt: '2026-09-20T00:00:00Z' }, 0)).toBe(true);
  });

  it('갈무리 행이 없으면 펼치지 않는다', () => {
    expect(rosterExpandable(null, 3)).toBe(false);
  });

  it('페이지가 이 함수로 판정한다 — 사본 조건을 두지 않는다', () => {
    const page = readFileSync('src/app/coach/cohort/[cohortId]/checkin/page.tsx', 'utf8');
    expect(page).toMatch(/hasRow: rosterExpandable\(ck, \(photosByUser\.get\(m\.userId\) \?\? \[\]\)\.length\)/);
    expect(page).not.toContain('ck.hasContent || ck.submittedAt != null');
  });
});
