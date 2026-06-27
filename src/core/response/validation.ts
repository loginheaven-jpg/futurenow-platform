// 경계(zod) 검증 자리. DB 는 느슨(JSONB), 코드 경계는 엄격(CLAUDE §9).
// 스키마는 진단 소유(InstrumentModule.answersSchema/profileSchema). 코어는 검증 "자리"만 제공하고
// 등록된 스키마가 있으면 saveResponse 경계에서 강제한다(계약 CoreContext 형상은 불변).
import type { z } from 'zod';
import { CoreValidationError } from '../errors';

export interface InstrumentValidators {
  answersSchema?: z.ZodTypeAny;
  profileSchema?: z.ZodTypeAny;
}

/** 스키마가 주어지면 검증하고 파싱된 값을 반환한다. 없으면 원값 통과(검증 자리만 비워 둠). */
export function validateWith(
  schema: z.ZodTypeAny | undefined,
  value: unknown,
  label: string,
): unknown {
  if (!schema) return value;
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new CoreValidationError(`${label} 경계 검증 실패`, parsed.error.issues);
  }
  return parsed.data;
}
