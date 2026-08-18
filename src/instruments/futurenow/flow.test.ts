import { describe, it, expect } from 'vitest';
import type { Item, StandardBlock } from '@/contracts';
import { futurenowFlow } from './flow';

const SPEC_CODES = [
  'NAV1', 'NAV2', 'NAV3', 'NAV4',
  'A1', 'A2', 'A3', 'A4', 'A5',
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9',
  'D1', 'D2', 'D3',
  'F1', 'F2',
  'B1', 'B2', 'B3', 'B4', 'B5',
  'E1', 'E2', 'E3',
];

function allItems(wave: 'pre' | 'post'): Item[] {
  return futurenowFlow
    .getSchema(wave)
    .blocks.flatMap((b) => (b.kind === 'standard' ? (b as StandardBlock).items : []));
}
const itemByCode = (wave: 'pre' | 'post', code: string): Item | undefined =>
  allItems(wave).find((i) => i.code === code);

describe('B① flow 구조', () => {
  it('7블록, instrumentId·wave 정확', () => {
    const schema = futurenowFlow.getSchema('pre');
    expect(schema.instrumentId).toBe('futurenow');
    expect(schema.wave).toBe('pre');
    expect(schema.blocks).toHaveLength(7);
  });

  it('§9.1 의 31개 코드가 모두 선언돼 있다', () => {
    const codes = allItems('pre').map((i) => i.code);
    for (const c of SPEC_CODES) expect(codes).toContain(c);
  });

  it("'지금의 나' 블록은 constrained-shuffle(첫 positive, 부정 2연속 금지)", () => {
    const now = futurenowFlow.getSchema('pre').blocks.find((b) => b.id === 'now') as StandardBlock;
    expect(now.ordering).toEqual({
      mode: 'constrained-shuffle',
      firstPolarity: 'positive',
      maxConsecutiveSameNegative: 1,
    });
    // 역채점 4문항은 negative polarity 로 표시
    const neg = now.items.filter((i) => i.polarity === 'negative').map((i) => i.code).sort();
    expect(neg).toEqual(['A2', 'A4', 'A5', 'C5', 'D1', 'D2', 'D3'].sort());
  });

  it("'믿음의 자리' 는 optional", () => {
    const faith = futurenowFlow.getSchema('pre').blocks.find((b) => b.id === 'faith') as StandardBlock;
    expect(faith.optional).toBe(true);
    expect(faith.items.every((i) => i.required === false)).toBe(true);
  });

  it('어휘 분리(§9.4): prompt 에 강의 명명(시들음·원씽·STEP 등)이 없다', () => {
    // 구인 NAMING·강의 어휘 금지. ('활력' 등 일상어가 원문에 쓰인 경우는 별개 — copydeck verbatim 유지)
    const prompts = allItems('pre').map((i) => i.prompt).join(' ');
    expect(prompts).not.toMatch(/시들음|원씽|languish|STEP/i);
  });

  // 이 단언이 지키던 것은 '사전·사후가 같은 자를 써야 변화를 잰다'이고, 그것은 **채점 코드**에 대한 말이다.
  //   PLEDGE 가 사전에만 서면서 전체 코드 목록은 갈렸지만, 채점 코드는 한 자도 안 갈렸다.
  //   그래서 단언을 지우지 않고 지키려던 것으로 좁힌다 — 넓은 단언을 통째로 버리면
  //   내일 누가 A1 을 사후에서 빼도 아무도 못 잡는다. 대신 갈라진 자리를 **이름으로** 못 박아
  //   여기가 늘어나는 순간 테스트가 먼저 말하게 한다.
  it('wave 분기: 채점 코드는 완전히 같고, 갈리는 것은 다짐 하나뿐이다', () => {
    const codes = (w: 'pre' | 'post') => allItems(w).map((i) => i.code);
    const measured = (w: 'pre' | 'post') => codes(w).filter((c) => SPEC_CODES.includes(c));
    expect(measured('post')).toEqual(measured('pre'));

    const extras = (w: 'pre' | 'post') => codes(w).filter((c) => !SPEC_CODES.includes(c));
    expect(extras('pre').filter((c) => !extras('post').includes(c))).toEqual(['PLEDGE']);
    expect(extras('post').filter((c) => !extras('pre').includes(c))).toEqual([]);
    const preNow = futurenowFlow.getSchema('pre').blocks.find((b) => b.id === 'now') as StandardBlock;
    const postNow = futurenowFlow.getSchema('post').blocks.find((b) => b.id === 'now') as StandardBlock;
    expect(preNow.intro).not.toEqual(postNow.intro);
  });

  it('31문항 prompt 가 모두 비어있지 않다(원문 반영)', () => {
    const map = new Map(allItems('pre').map((i) => [i.code, i.prompt] as const));
    for (const c of SPEC_CODES) expect((map.get(c) ?? '').length).toBeGreaterThan(0);
  });

  it('copydeck 원문 verbatim 반영(샘플)', () => {
    expect(itemByCode('pre', 'A1')?.prompt).toBe('아침에 눈을 뜰 때, 오늘 하루가 기대된다.');
    expect(itemByCode('pre', 'NAV1')?.scale).toMatchObject({
      kind: 'bipolar',
      leftLabel: '잘못될 경우와 그에 대한 대비책',
      rightLabel: '잘되었을 때의 장면',
    });
    expect(itemByCode('pre', 'B5')?.prompt).toContain('기여 (Contribution)');
  });

  it('likert 척도에 중앙 레이블 보통(copydeck)', () => {
    expect(itemByCode('pre', 'A1')?.scale).toMatchObject({
      kind: 'likert',
      minLabel: '전혀 아니다',
      maxLabel: '매우 그렇다',
      centerLabel: '보통',
    });
    // 믿음의 자리(F1)도 동일 척도
    expect(itemByCode('pre', 'F1')?.scale).toMatchObject({ kind: 'likert', centerLabel: '보통' });
  });

  it('E1 prompt 는 wave별로 다르다', () => {
    expect(itemByCode('pre', 'E1')?.prompt).not.toEqual(itemByCode('post', 'E1')?.prompt);
    expect(itemByCode('pre', 'E1')?.prompt).toContain('이 세미나가 끝났을 때');
  });

  // 이행 약속 — 다짐 체크가 둘로 늘었다. 늘어난 쪽이 사전에만 서는 것을 못 박는다.
  //   사후에 새면 참여자가 이미 끝난 5주를 두고 '참석하겠습니다'를 읽게 된다.
  describe('PLEDGE — 이행 약속은 사전 전용이다', () => {
    const labelOf = (w: 'pre' | 'post', code: string) => {
      const i = itemByCode(w, code);
      return i?.scale.kind === 'check' ? i.scale.label : null;
    };

    it('사전 마지막 한 걸음에 다짐이 둘, 사후에는 하나다', () => {
      const commitOf = (w: 'pre' | 'post') =>
        (futurenowFlow.getSchema(w).blocks.find((b) => b.id === 'commit') as StandardBlock).items;
      expect(commitOf('pre').map((i) => i.code)).toEqual(['COMMIT', 'PLEDGE']);
      expect(commitOf('post').map((i) => i.code)).toEqual(['COMMIT']);
    });

    it('진술 원문이 그대로 선다', () => {
      expect(labelOf('pre', 'PLEDGE')).toBe(
        '매주 모임시간을 잘 지켜 참석하고, 사전 과제와 사후 갈무리를 충실히 하겠습니다.',
      );
    });

    it('CheckScale 이고 prompt 는 비어 있다 — 진술 자체가 라벨이다', () => {
      const i = itemByCode('pre', 'PLEDGE');
      expect(i?.scale.kind).toBe('check');
      expect(i?.prompt).toBe('');
    });

    it('선택이다 — 체크를 강제하면 다짐이 아니고 제출이 막힌다', () => {
      expect(itemByCode('pre', 'PLEDGE')?.required).toBe(false);
      expect(itemByCode('pre', 'COMMIT')?.required).toBe(false);
    });

    it('채점 코드가 아니다 — polarity 중립, §9.1 스펙 코드 밖', () => {
      expect(itemByCode('pre', 'PLEDGE')?.polarity).toBe('neutral');
      expect(SPEC_CODES).not.toContain('PLEDGE');
    });
  });

  it('CARE 진술은 CheckScale.label, wave별로 다르다', () => {
    const pre = itemByCode('pre', 'CARE');
    const post = itemByCode('post', 'CARE');
    const preLabel = pre?.scale.kind === 'check' ? pre.scale.label : '';
    const postLabel = post?.scale.kind === 'check' ? post.scale.label : '';
    expect(preLabel).toContain('받고 싶습니다');
    expect(postLabel).toContain('이어 가고 싶습니다');
  });
});
