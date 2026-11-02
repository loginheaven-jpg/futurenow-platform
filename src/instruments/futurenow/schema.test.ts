import { describe, it, expect } from 'vitest';
import { futurenowAnswersSchema, futurenowProfileSchema } from './schema';

function validAnswers() {
  return {
    NAV1: 3, NAV2: 3, NAV3: 3, NAV4: 3,
    A1: 3, A2: 3, A3: 3, A4: 3, A5: 3,
    C1: 3, C2: 3, C3: 3, C4: 3, C5: 3, C6: 3, C7: 3, C8: 3, C9: 3,
    D1: 3, D2: 3, D3: 3,
    B1: 5, B2: 5, B3: 5, B4: 5, B5: 5,
    E1: '기대', E2: '정서',
  };
}

describe('futurenowAnswersSchema', () => {
  it('필수만 채운 응답 통과(F1·F2·E3·CARE 선택 생략 가능)', () => {
    expect(futurenowAnswersSchema.safeParse(validAnswers()).success).toBe(true);
  });

  it('likert 범위 밖(A1=6) 거부', () => {
    expect(futurenowAnswersSchema.safeParse({ ...validAnswers(), A1: 6 }).success).toBe(false);
  });

  it('likert 비정수(A1=2.5) 거부', () => {
    expect(futurenowAnswersSchema.safeParse({ ...validAnswers(), A1: 2.5 }).success).toBe(false);
  });

  it('numeric 범위 밖(B1=11) 거부, 경계 0·10 허용', () => {
    expect(futurenowAnswersSchema.safeParse({ ...validAnswers(), B1: 11 }).success).toBe(false);
    expect(futurenowAnswersSchema.safeParse({ ...validAnswers(), B1: 0, B2: 10 }).success).toBe(true);
  });

  it('bipolar 0 거부', () => {
    expect(futurenowAnswersSchema.safeParse({ ...validAnswers(), NAV1: 0 }).success).toBe(false);
  });

  it('필수 누락(E1 없음) 거부', () => {
    const a = validAnswers() as Record<string, unknown>;
    delete a.E1;
    expect(futurenowAnswersSchema.safeParse(a).success).toBe(false);
  });

  it('선택 항목(F1·CARE) 채워도 통과', () => {
    expect(futurenowAnswersSchema.safeParse({ ...validAnswers(), F1: 4, CARE: true }).success).toBe(true);
  });

  // 이행 약속(PLEDGE)은 뒤늦게 붙은 키다. 이미 제출된 사전 응답에는 없다 —
  //   optional 이 아니면 그 행들이 경계에서 전부 튕긴다(ADR-91 §2-4: 제출된 행을 소급 처리하지 않는다).
  it('PLEDGE — 없어도 통과하고(기존 응답) 있어도 통과한다', () => {
    expect(futurenowAnswersSchema.safeParse(validAnswers()).success).toBe(true);
    expect(futurenowAnswersSchema.safeParse({ ...validAnswers(), PLEDGE: true }).success).toBe(true);
    expect(futurenowAnswersSchema.safeParse({ ...validAnswers(), PLEDGE: false }).success).toBe(true);
  });

  it('PLEDGE 는 불리언이다 — 체크 값이 문자열로 들어오면 거부', () => {
    expect(futurenowAnswersSchema.safeParse({ ...validAnswers(), PLEDGE: 'true' }).success).toBe(false);
  });

  describe('REC·REC_OK — 기존 응답 호환과 앱 저장 경계(ADR-203)', () => {
    it('두 키가 없는 기존 응답을 그대로 허용하고 동의를 기본 생성하지 않는다', () => {
      const parsed = futurenowAnswersSchema.parse(validAnswers());
      expect(parsed).not.toHaveProperty('REC');
      expect(parsed).not.toHaveProperty('REC_OK');
    });

    it('REC 는 빈 문자열과 500자를 허용하고 원문을 보존한다', () => {
      expect(futurenowAnswersSchema.parse({ ...validAnswers(), REC: '' }).REC).toBe('');
      const text = '가'.repeat(500);
      expect(futurenowAnswersSchema.parse({ ...validAnswers(), REC: text }).REC).toBe(text);
    });

    it('REC 501자와 문자열이 아닌 값은 거부한다', () => {
      expect(futurenowAnswersSchema.safeParse({ ...validAnswers(), REC: '가'.repeat(501) }).success).toBe(false);
      expect(futurenowAnswersSchema.safeParse({ ...validAnswers(), REC: 123 }).success).toBe(false);
    });

    it.each([true, false])('REC_OK=%s 를 변환 없이 보존한다', (consent) => {
      const parsed = futurenowAnswersSchema.parse({ ...validAnswers(), REC: '다음 참여자에게 건네는 글', REC_OK: consent });
      expect(parsed.REC).toBe('다음 참여자에게 건네는 글');
      expect(parsed.REC_OK).toBe(consent);
    });

    it('REC_OK 문자열을 동의로 바꾸지 않고 거부한다', () => {
      expect(futurenowAnswersSchema.safeParse({ ...validAnswers(), REC_OK: 'true' }).success).toBe(false);
    });

    it('새 500자 제한은 기존 E1~E3 에 적용하지 않는다', () => {
      const text = '가'.repeat(501);
      expect(futurenowAnswersSchema.safeParse({ ...validAnswers(), E1: text, E2: text, E3: text }).success).toBe(true);
    });
  });
});

describe('futurenowProfileSchema (계정 복사 스냅샷 — birthYear·gender NULL 가능, 관찰 하나)', () => {
  it('전체(생년·성별·종교·신앙연수) 통과', () => {
    expect(
      futurenowProfileSchema.safeParse({ birthYear: 1990, gender: '남', religion: '기독교', faithYears: 10 }).success,
    ).toBe(true);
  });
  it('빈 스냅샷({}) 허용 — 계정값 NULL 가능(필수성은 폼/IdentityPolicy)', () => {
    expect(futurenowProfileSchema.safeParse({}).success).toBe(true);
  });
  it('birthYear·gender = null 허용(계정 복사 NULL)', () => {
    expect(futurenowProfileSchema.safeParse({ birthYear: null, gender: null }).success).toBe(true);
  });
  it('생년 있으면 범위·정수 검증(비정수·범위 밖 거부)', () => {
    expect(futurenowProfileSchema.safeParse({ birthYear: 1985.5, gender: '여' }).success).toBe(false);
    expect(futurenowProfileSchema.safeParse({ birthYear: 1800, gender: '여' }).success).toBe(false);
  });
  it('motivation(참여계기) 선택 필드 통과', () => {
    expect(futurenowProfileSchema.safeParse({ birthYear: 1990, gender: '남', motivation: '더 단단해지고 싶어서' }).success).toBe(true);
  });
});
