import { describe, it, expect } from 'vitest';
import { maskPhone } from './maskPhone';

describe('maskPhone — 앞 3 · 뒤 4만 남긴다', () => {
  it('국내 휴대전화', () => {
    expect(maskPhone('01012341234')).toBe('010-****-1234');
    expect(maskPhone('010-1234-1234')).toBe('010-****-1234');
    expect(maskPhone(' 010 1234 1234 ')).toBe('010-****-1234');
  });

  it('국제번호는 + 를 지킨다', () => {
    expect(maskPhone('+821012341234')).toBe('+821-****-1234');
  });

  it('빈 값·null 은 null', () => {
    expect(maskPhone(null)).toBeNull();
    expect(maskPhone(undefined)).toBeNull();
    expect(maskPhone('')).toBeNull();
    expect(maskPhone('   ')).toBeNull();
  });

  it('너무 짧으면 통째로 가린다 — 부분 노출이 곧 전체 노출이다', () => {
    expect(maskPhone('1234567')).toBe('*******');
    expect(maskPhone('12')).toBe('***');
  });

  it('가운데 숫자가 결과에 남지 않는다', () => {
    const out = maskPhone('01098765432')!;
    expect(out).not.toContain('9876');
    expect(out).toBe('010-****-5432');
  });

  it('8자리 경계에서 마스킹된다', () => {
    expect(maskPhone('12345678')).toBe('123-****-5678');
  });
});
