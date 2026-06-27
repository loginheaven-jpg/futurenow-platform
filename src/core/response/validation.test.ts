import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validateWith } from './validation';
import { CoreValidationError } from '../errors';

describe('validateWith (경계 zod 검증 자리)', () => {
  it('스키마가 없으면 원값을 그대로 통과시킨다', () => {
    const value = { anything: 1 };
    expect(validateWith(undefined, value, 'answers')).toBe(value);
  });

  it('스키마 통과 시 파싱된 값을 반환', () => {
    const schema = z.object({ A1: z.number() });
    expect(validateWith(schema, { A1: 4 }, 'answers')).toEqual({ A1: 4 });
  });

  it('스키마 위반 시 CoreValidationError + issues', () => {
    const schema = z.object({ A1: z.number() });
    try {
      validateWith(schema, { A1: 'not-a-number' }, 'answers');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(CoreValidationError);
      expect((e as CoreValidationError).message).toContain('answers');
      expect((e as CoreValidationError).issues).toBeTruthy();
    }
  });
});
