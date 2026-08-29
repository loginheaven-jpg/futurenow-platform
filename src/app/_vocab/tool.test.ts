import { describe, expect, it } from 'vitest';
import { TOOL, reportName, toolName } from './tool';
import { PRIVACY_CONSENT, SENSITIVE_CONSENT, COACH_PLEDGE } from '@/app/_consent/consent';
import * as fnCopy from '@/instruments/futurenow/copy';

// 발주서 2026-08-18 §2.1 명칭 원장. 이 표가 흔들리면 카드뉴스·랜딩·화면이 서로 다른 말을 하게 된다.
//   카드뉴스가 이미 '사전 체크'로 배포되므로, 화면이 '진단'으로 돌아가는 순간 첫 접촉에서 어긋난다.
describe('명칭 원장 (발주서 §2.1)', () => {
  it('세 이름이 확정 문자열 그대로다', () => {
    expect(TOOL.pre).toBe('사전 체크');
    expect(TOOL.post).toBe('마무리 체크');
    expect(TOOL.preReport).toBe('사전 체크 리포트');
    expect(TOOL.postReport).toBe('마무리 체크 리포트');
  });

  it('wave 를 이름으로 옮기는 통로는 이 두 함수뿐이다', () => {
    expect(toolName('pre')).toBe(TOOL.pre);
    expect(toolName('post')).toBe(TOOL.post);
    expect(reportName('pre')).toBe(TOOL.preReport);
    expect(reportName('post')).toBe(TOOL.postReport);
  });

  it('원장 어디에도 옛 명칭이 없다', () => {
    const 전문 = JSON.stringify(TOOL);
    for (const w of ['진단', '자기진단', '점검', '설문', '평가', '점수']) {
      expect(전문, w).not.toContain(w);
    }
  });
});

// 동의 문안은 참여자가 계정을 만들며 읽는 첫 법적 문서다. 여기에 옛 명칭이 남으면
//   카드뉴스에서 '사전 체크'를 보고 온 사람이 가입 첫 화면에서 '진단'을 만난다.
describe('개인정보 동의 문안에 옛 명칭이 없다', () => {
  const 전문 = [PRIVACY_CONSENT, SENSITIVE_CONSENT, COACH_PLEDGE]
    .flatMap((c) => [c.title, c.agree, ...c.lines])
    .join('\n');

  it('진단·설문·평가·점수 0건', () => {
    for (const w of ['진단', '설문', '평가', '점수']) expect(전문, w).not.toContain(w);
  });

  it('수집 항목·목적은 그대로다 — 낱말만 바뀌었지 내용이 바뀐 것이 아니다', () => {
    expect(전문).toContain('이름, 전화번호, 이메일, 성별, 생년, 체크 응답');
    expect(전문).toContain('보유·이용 기간: 수집일로부터 1년 (이후 파기)');
    expect(전문).toContain('열람 주체: 본인, 소속 그룹 인도자, 운영자');
  });
});

// 사전·마무리 체크 문안(인스트루먼트 copydeck). 발주서 §2.2·§2.4 — '5주'는 명칭과 무관하지만
//   같은 표면에 있어 함께 처리했다. 프로그램은 6주다.
describe('체크 문안에 옛 명칭·옛 기간이 없다', () => {
  const 문안 = JSON.stringify([
    fnCopy.introBlock,
    fnCopy.blockIntros,
    fnCopy.askPrompts,
    fnCopy.commitLabel,
    fnCopy.careLabel,
    fnCopy.pledgeLabel,
    fnCopy.faithIntro,
    fnCopy.likertLabels,
  ]);

  it("'진단' 0건", () => {
    expect(문안).not.toContain('진단');
  });

  it("'5주' 0건 — 프로그램은 6주다", () => {
    expect(문안).not.toContain('5주');
  });

  it("'문항' 0건 — 참여자에게는 '질문'이다", () => {
    expect(문안).not.toContain('문항');
  });

  it('들어가며 첫 줄이 발주서 §2.2 교체안 그대로다', () => {
    expect(fnCopy.introBlock.pre.intro.startsWith('시작하기 전에, 잠시 미래의 한 장면을 떠올려 봅니다.')).toBe(true);
  });

  it('사후 문안의 되돌아보는 기간이 6주다', () => {
    expect(fnCopy.introBlock.post.intro).toContain('6주 전의 당신을 떠올려 봅니다');
    expect(fnCopy.introBlock.post.placeholder).toBe('[ 6주 전의 나에게 · 한마디 ]');
  });

  // 문항(Item.prompt)은 발주서 §1 불변식이라 손대지 않았다. C8 의 '점검'은 일상어이고
  //   측정 도구의 이름이 아니다 — 그 사실을 여기 못 박아, 다음 사람이 '잔존'으로 오해해 고치지 않게 한다.
  it('문항 원문은 손대지 않았다 — C8 의 점검은 도구 명칭이 아니라 일상어다', () => {
    expect(fnCopy.itemPrompts.C8).toBe('내 주변에는 내 목표를 알고 정기적으로 점검해 주는 사람이 있다.');
  });
});
