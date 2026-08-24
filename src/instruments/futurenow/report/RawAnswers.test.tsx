import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RawAnswers } from './RawAnswers';

// 코드가 아니라 copy.ts 문항 원문 + 응답을 렌더함을 단언(ADR-77 §5.2·5.3·5.6).
// 배열·코드 라벨은 ADR-111(ORDER rawanswers_reorder_v1) — 가이드 지표 순서 + 매칭용 코드.
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

  // 그룹 제목은 <h4> 로 나온다. 본문 문장에 같은 낱말이 섞여 있어(예: B4 원문의 '활력')
  // 낱말이 아니라 **제목 마크업**을 앵커로 쓴다.
  const head = (t: string) => html.indexOf(`>${t}</h4>`);
  // 코드 라벨은 <span>A2</span> 형태로 나온다.
  const tag = (c: string) => html.indexOf(`>${c}</span>`);

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

  // ── ORDER rawanswers_reorder_v1 §4 인수 기준 ────────────────────────────
  it('§4-1 그룹 순서 = 가이드 지표 순서', () => {
    // 들어가며 → 활력 → 나침반 → 준비도 → 간격 → 언어 → 숨은 층
    const order = ['들어가며 · 인생 조감도', '활력', '나침반', '준비도 (GROW+F)', '다섯 영역의 간격', '참여자의 언어', '숨은 층 · 인도자 참고'];
    expect(order.every((t) => head(t) >= 0)).toBe(true);
    const positions = order.map(head);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('§4-1 준비도 내부는 GROW 축 짝 순서(코드 번호순이 아니다)', () => {
    // scoring.ts ③ 과 1:1 — G=C2·C1 · R=C3·C4 · O=C6·C5 · W=C8·C7 · F=C9
    const pairOrder = ['C2', 'C1', 'C3', 'C4', 'C6', 'C5', 'C8', 'C7', 'C9'];
    const positions = pairOrder.map(tag);
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    // 번호순이었다면 C1 이 C2 보다 앞이다 — 짝 순서임을 못박는다.
    expect(tag('C2')).toBeLessThan(tag('C1'));
    // 축 소제목(§3.3)도 함께 뜬다.
    for (const label of ['조감도', '현실인식', '원씽', '피드백', '정체성']) expect(html).toContain(label);
  });

  it('§4-2 전 문항에 코드 라벨(INTRO 자유서술만 예외)', () => {
    const all = [
      'A1', 'A2', 'A3', 'A4', 'A5',
      'NAV1', 'NAV2', 'NAV3', 'NAV4',
      'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9',
      'B1', 'B2', 'B3', 'B4', 'B5',
      'E1', 'E2', 'E3',
      'D1', 'D2', 'D3', 'F1', 'F2',
    ];
    for (const c of all) expect(tag(c), `${c} 코드 라벨 누락`).toBeGreaterThanOrEqual(0);
    expect(tag('INTRO')).toBe(-1); // 자유서술은 코드 없음
  });

  it("§4-3 '지금의 나' 해체 — A는 활력·C는 준비도·D는 숨은 층", () => {
    expect(head('지금의 나')).toBe(-1);
    // 활력 그룹 = A1·A3·A2·A5·A4 (생기 뒤 마모), 나침반 앞에서 끝난다.
    const vit = html.slice(head('활력'), head('나침반'));
    for (const c of ['A1', 'A3', 'A2', 'A5', 'A4']) expect(vit).toContain(`>${c}</span>`);
    expect(vit.indexOf('>A1</span>')).toBeLessThan(vit.indexOf('>A3</span>'));
    expect(vit.indexOf('>A3</span>')).toBeLessThan(vit.indexOf('>A2</span>'));
    // C 는 전부 준비도 안, D 는 하나도 없다.
    const ready = html.slice(head('준비도 (GROW+F)'), head('다섯 영역의 간격'));
    for (let i = 1; i <= 9; i++) expect(ready).toContain(`>C${i}</span>`);
    for (const c of ['D1', 'D2', 'D3']) expect(ready).not.toContain(`>${c}</span>`);
  });

  it('§4-4 믿음(F1·F2)이 함정(D)과 함께 숨은 층 — 맨 끝', () => {
    expect(head('믿음의 자리')).toBe(-1); // 중간에 있던 독립 그룹은 사라졌다
    const hidden = html.slice(head('숨은 층 · 인도자 참고'));
    for (const c of ['D1', 'D2', 'D3', 'F1', 'F2']) expect(hidden).toContain(`>${c}</span>`);
    // 숨은 층이 마지막 그룹이다 — 자기 제목 말고 뒤따르는 그룹 제목이 없다.
    expect(hidden.match(/<\/h4>/g)).toHaveLength(1);
    expect(tag('F1')).toBeGreaterThan(tag('E3'));
  });

  // §4-5 참여자 미노출 회귀가드는 participantMirror.test.ts 가 지킨다(미러에 코드·원응답 없음).
  //   RawAnswers 는 코치/운영자 경로 전용이라 여기서 코드 표시는 정상이다(ORDER §2.2).

  it('§4-6 코드가 문항 원문을 대체하지 않는다(코드 덤프 아님)', () => {
    // 코드 라벨이 닫히고 바로 뒤에 문항 원문이 그대로 온다(코드가 원문을 밀어내지 않는다).
    expect(html).toMatch(/>A2<\/span>[^<]*제자리걸음/);
    expect(html).toMatch(/>NAV1<\/span>[^<]+</);
  });

  // 기존 '파생 점수 비혼합' 가드의 **범위를 좁힌다**(삭제가 아니다).
  //   '준비도 (GROW+F)'·'GROW'·축 이름은 이제 그룹 제목으로 정상 등장한다(ORDER §3.1·3.3).
  //   지켜야 할 진짜 불변은 "**값**을 계산해 보이지 않는다" 쪽이므로 거기에 못을 다시 박는다.
  it('파생 점수 비혼합 — 제목은 되고 값·판정은 안 된다(ORDER §2.4)', () => {
    expect(html).not.toContain('활력의 이동'); // ReportScreen 활력 패널
    expect(html).not.toContain('시들음'); // 활력 구간 판정
    expect(html).not.toContain('번성');
    expect(html).not.toContain('역채점'); // C5·마모 셋의 역채점 표기 금지
    expect(html).not.toContain('주 함정'); // 함정 판정은 인도자 패널(2면) 몫
  });
});
