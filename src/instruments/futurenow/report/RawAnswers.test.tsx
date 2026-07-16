import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RawAnswers } from './RawAnswers';

// 코드가 아니라 copy.ts 문항 원문 + 응답을 렌더함을 단언(ADR-77 §5.2·5.3·5.6).
const answers: Record<string, unknown> = {
  NAV1: 4, NAV2: 2, NAV3: 3, NAV4: 5,
  A1: 5, A2: 5, A3: 3, A4: 2, A5: 4,
  C1: 3, C2: 4, C3: 5, C4: 2, C5: 3, C6: 5, C7: 1, C8: 4, C9: 3,
  D1: 2, D2: 4, D3: 1,
  F1: 4, // F2 생략 → 무응답
  B1: 7, B2: 0, B3: 10, B4: 5, B5: 3,
  E1: '더 단단해지고 싶어요', E2: '', // E3 생략 → 빈칸
  INTRO: '5년 뒤 나는 선한 영향력을 주는 사람',
};

describe('RawAnswers (참여자 원응답 — 문항 원문 렌더)', () => {
  const html = renderToStaticMarkup(<RawAnswers answers={answers} wave="pre" />);

  it('§5.2 코드가 아니라 문항 원문 + 응답', () => {
    expect(html).toContain('제자리걸음'); // A2 itemPrompt 원문
    expect(html).toContain('매우 그렇다'); // A2=5 리커트 문구
    expect(html).toContain('잘되었을 때의 장면'); // NAV1 bipolar 우측 레이블
    expect(html).toContain('이 세미나가 끝났을 때'); // E1 askPrompt(pre) 원문
    expect(html).toContain('7 / 10'); // B1 간격
    expect(html).toContain('선한 영향력'); // INTRO 원응답
  });

  it('§5.6 null·빈칸 — F2 무응답·E 빈칸, 런타임 에러 없음', () => {
    expect(html).toContain('무응답'); // F2 생략
    expect(html).toContain('(빈칸)'); // E2/E3 빈칸
  });

  it('§5.3 섹션 순서 — 나침반 → 지금의 나 → 믿음 → 간격 → 주관식', () => {
    expect(html.indexOf('나침반')).toBeLessThan(html.indexOf('지금의 나'));
    expect(html.indexOf('지금의 나')).toBeLessThan(html.indexOf('믿음의 자리'));
    expect(html.indexOf('믿음의 자리')).toBeLessThan(html.indexOf('다섯 영역의 간격'));
    expect(html.indexOf('다섯 영역의 간격')).toBeLessThan(html.indexOf('나에게 묻는 시간'));
  });

  it('파생 점수 패널 비혼합 — 원문+응답만(§2-5)', () => {
    // '활력'은 B4 문항 원문에 들어가므로 단어가 아니라 파생-점수 패널 표지를 검사.
    expect(html).not.toContain('활력의 이동'); // ReportScreen 활력 패널
    expect(html).not.toContain('준비도'); // GROW 패널
    expect(html).not.toContain('GROW');
  });
});
