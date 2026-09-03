// 참여자 리포트 — **가면 안 되는 것이 안 간다** (ADR-188).
//
// ADR-27 의 「참여자엔 측정·severity·돌봄 0건」이 지휘부 결재로 열렸다(2026-09-03).
//   **열린 것은 나침반·간격 둘뿐**이고, 금지의 표적이던 셋은 그대로 막혀야 한다.
//   그 셋이 조용히 들어오면 아무도 모른다 — 화면은 더 풍성해 보이기만 한다.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('src/app/(member)/my/cohorts/[cohortId]/report/page.tsx', 'utf8');
/** 주석이 그 이름을 말한다(왜 뺐는지 적어 두었다) — **코드만** 본다. */
const CODE = SRC.split(String.fromCharCode(10))
  .filter((l) => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*'); })
  .join(' ');

describe('★★ 참여자에게 판정을 보내지 않는다', () => {
  it('★ 막힌 다섯이 코드에 없다 — 금지의 표적은 그대로다', () => {
    for (const banned of ['CareSignal', 'VitalityBand', 'GrowBars', 'FacilitatorPanel', 'RawAnswers']) {
      expect(CODE, `참여자 리포트에 들어왔다: ${banned}`).not.toContain(banned);
    }
  });

  it('★ 열린 둘은 있다 — 물 것이 실재한다(계열 ⑦)', () => {
    expect(CODE).toContain('CompassDumbbell');
    expect(CODE).toContain('GapRadar');
  });

  it('★★ 인도자 도구가 안 온다 — 표제부는 문서 머리만이다', () => {
    for (const tool of ['MemberProfileButton', 'InterpretationPanel', 'ReportPrintButton', 'getCohortMemberDetail']) {
      expect(CODE, `인도자 도구가 들어왔다: ${tool}`).not.toContain(tool);
    }
    expect(CODE, '표제부가 없다').toContain('ReportPrintHeader');
  });

  it('★ 표제부는 **사본이 아니다** — 인도자와 같은 부품을 쓴다', () => {
    const header = readFileSync('src/app/coach/cohort/[cohortId]/report/[responseId]/ReportPrintHeader.tsx', 'utf8');
    // 화면에도 설 수 있게 넓혔을 뿐, 인도자 쪽 기본값은 인쇄 전용 그대로다.
    expect(header).toContain('screen = false');
    expect(header).toContain("screen ? undefined : 'print-only'");
  });

  it('★★ 한 번만 채점한다 — 차트와 거울이 갈라지지 않는다', () => {
    // 두 번 채점하면 언젠가 둘이 다른 것을 말하고, 그때 어느 쪽이 맞는지 알 수 없다.
    expect(CODE.split('futurenowScoring.score(').length - 1, '채점이 두 곳이다').toBe(1);
    expect(CODE, '거울이 같은 산출을 안 쓴다').toContain('participantMirror(pre.scores)');
  });

  it('★ 옛 화면의 문안을 버리지 않았다 — 「그 아래 현재 내용」', () => {
    for (const keep of ['세미나 전과 후, 당신의 마음이 어떻게 움직였는지 나란히 놓아봤어요.',
                        '지난 ', '받은 코드로 참여']) {
      expect(SRC, `옛 문안이 사라졌다: ${keep}`).toContain(keep);
    }
    expect(CODE, '거울을 걷었다').toContain('MirrorView');
  });
});
