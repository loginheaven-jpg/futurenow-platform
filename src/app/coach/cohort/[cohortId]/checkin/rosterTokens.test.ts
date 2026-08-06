import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// ADR-94 §4-2 잠금 — 명단 행에 의미색을 되돌리지 않는다.
//   지각과 연락 요청이 같은 앰버(돌봄 토큰)로 뭉개져 인도자가 두 신호를 구별하지 못했다.
//   연락 요청은 돌봄 채널이고 지각은 단순 사실이다. 같은 색으로 칠할 이유가 없다.
//
//   정규식 주의: 기존 관례인 /--care|--danger/ 로는 부족하다. 저장소에 돌봄 계열이 **두 갈래**로 있다 —
//   `--color-care`(앰버)와 `--care-fill/line/text`(코랄). 둘 다 걸리게 쓴다.
//   판정 범위는 **이 파일 하나**로 한정한다 — 같은 화면의 CoachPhotos·ScheduleSeedClient 는
//   삭제 확인·일정 미등록 경고에 위험색을 정당하게 쓰므로 페이지 전체 기준이면 오탐이 난다.
const SRC = readFileSync(new URL('./RosterDetail.tsx', import.meta.url), 'utf8');

describe('명단 행 색 토큰 규율 (ADR-94 §4-2)', () => {
  it('RosterDetail 에 돌봄·위험 계열 토큰 참조가 0건', () => {
    const hits = [...SRC.matchAll(/--(?:color-)?(?:care|danger|warning)[\w-]*/g)].map((m) => m[0]);
    expect(hits, `되돌아온 의미색: ${JSON.stringify(hits)}`).toEqual([]);
  });

  it('지각과 연락 요청이 서로 다른 색이다', () => {
    const late = /지각<\/span>/.test(SRC) && SRC.match(/color: '([^']+)' \}\}>지각/)?.[1];
    const contact = SRC.match(/color: '([^']+)' \}\}>연락 요청/)?.[1];
    expect(late).toBeTruthy();
    expect(contact).toBeTruthy();
    expect(late).not.toBe(contact);
    expect(late).toBe('var(--color-text-muted)'); // 단순 사실 — 눈에 덜 띈다
    expect(contact).toBe('var(--color-primary)'); // 돌봄 채널 — 네이비로 눈에 든다
  });
});
