// answers·subjectProfile 경계(zod) 스키마. DB 는 느슨(JSONB), 코드 경계는 엄격(CLAUDE §9).
// 코드별 응답형 검증. 진단 소유 — 코어는 이 스키마를 validators 로 주입받아 saveResponse 경계에서 강제.
import { z } from 'zod';

const likert = z.number().int().min(1).max(5); // likert 1~5
const bipolar = z.number().int().min(1).max(5); // bipolar 좌1~우5
const numeric = z.number().min(0).max(10); // 간격 0~10

export const futurenowAnswersSchema = z.object({
  // 나침반 (bipolar)
  NAV1: bipolar,
  NAV2: bipolar,
  NAV3: bipolar,
  NAV4: bipolar,
  // 지금의 나 (likert)
  A1: likert,
  A2: likert,
  A3: likert,
  A4: likert,
  A5: likert,
  C1: likert,
  C2: likert,
  C3: likert,
  C4: likert,
  C5: likert,
  C6: likert,
  C7: likert,
  C8: likert,
  C9: likert,
  D1: likert,
  D2: likert,
  D3: likert,
  // 믿음의 자리 (likert · 선택)
  F1: likert.optional(),
  F2: likert.optional(),
  // 간격 (numeric)
  B1: numeric,
  B2: numeric,
  B3: numeric,
  B4: numeric,
  B5: numeric,
  // 나에게 묻는 시간 (text). E3 선택
  E1: z.string(),
  E2: z.string(),
  E3: z.string().optional(),
  // 부가
  INTRO: z.string().optional(), // 들어가며 조감도 한 문장
  CARE: z.boolean().optional(), // 돌봄 체크
  COMMIT: z.boolean().optional(), // 마지막 다짐
});
export type FuturenowAnswers = z.infer<typeof futurenowAnswersSchema>;

// subjectProfile: 응답 시점 스냅샷(불변). 성별·생년·종교·신앙연수는 계정(user_profiles)에서 복사·박제(UX통합가입 S2).
//   실명은 코어 users.name, 전화는 user_contacts → 여기 두지 않는다(ADR-02·04).
// 관찰 하나(2026-07-01): 계정값이 NULL 일 수 있으므로(트리거 sanitize·폼 우회) 스냅샷 zod 는 birthYear·gender 를 nullable·optional 로 완화.
//   "성별·생년 필수" 는 DB 불변식이 아니라 S3 폼/IdentityPolicy 가 강제 → 코치 화면은 NULL 폴백 준비(관찰 하나).
// motivation(참여계기): 사전 wave 전용·선택 — 응답 스냅샷 소유(시점 종속), S3 ProfileForm 수집.
export const futurenowProfileSchema = z.object({
  birthYear: z.number().int().min(1900).max(2100).nullable().optional(), // 생년 (계정 복사 — NULL 가능; 있으면 범위 검증)
  gender: z.string().min(1).nullable().optional(), // 성별 (계정 복사 — NULL 가능)
  religion: z.string().min(1).optional(), // 종교 (선택)
  faithYears: z.union([z.number().nonnegative(), z.string()]).optional(), // 신앙 연수 (선택, 수치 또는 구간)
  motivation: z.string().optional(), // 참여계기 (사전 wave·선택)
});
export type FuturenowProfile = z.infer<typeof futurenowProfileSchema>;
