import { describe, expect, it } from 'vitest';
import { resolveCheckinMode } from './mode';

const row = (submitted: boolean, hasContent: boolean) => ({
  submittedAt: submitted ? '2026-08-01T12:00:00Z' : null,
  hasContent,
});

describe('resolveCheckinMode — 초기 모드 판정(ADR-86)', () => {
  it('?edit=1 이면 무조건 작성(제출·마감과 무관)', () => {
    expect(resolveCheckinMode({ wantsEdit: true, closed: true, existing: row(true, true) })).toBe('edit');
    expect(resolveCheckinMode({ wantsEdit: true, closed: false, existing: null })).toBe('edit');
  });

  it('행이 없으면 작성 — 현장 QR 첫 진입(ADR-81 주력 경로)', () => {
    expect(resolveCheckinMode({ wantsEdit: false, closed: false, existing: null })).toBe('edit');
    expect(resolveCheckinMode({ wantsEdit: false, closed: true, existing: null })).toBe('edit');
  });

  it('열린 회차를 쓰다 만 사람은 이어 쓰기(작성) — QR·목록 버튼 회귀 방지', () => {
    expect(resolveCheckinMode({ wantsEdit: false, closed: false, existing: row(false, true) })).toBe('edit');
  });

  it('열린 회차라도 제출했으면 열람 — 자기가 쓴 것을 먼저 읽는다', () => {
    expect(resolveCheckinMode({ wantsEdit: false, closed: false, existing: row(true, true) })).toBe('read');
  });

  it('마감된 지난 회차는 제출 여부와 무관하게 열람', () => {
    expect(resolveCheckinMode({ wantsEdit: false, closed: true, existing: row(true, true) })).toBe('read');
    // '썼지만 제출 안 한' 지난 회차가 편집 폼으로 열리던 구멍 — hasContent 기준으로 닫힌다.
    expect(resolveCheckinMode({ wantsEdit: false, closed: true, existing: row(false, true) })).toBe('read');
  });

  it('마감됐고 빈 행만 있으면 작성 — 뒤늦게라도 쓰러 갈 길을 막지 않는다', () => {
    // 카드 진입 표식(checkin_mark)만으로 행이 생길 수 있다. 그건 '썼다'가 아니다(ADR-80 빈 행 오염 방지).
    expect(resolveCheckinMode({ wantsEdit: false, closed: true, existing: row(false, false) })).toBe('edit');
  });
});
