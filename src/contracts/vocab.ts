// /src/contracts/vocab.ts
//
// 전 서비스 공통 규약 **값**(런타임 상수). domain.ts 는 타입 전용(배럴이 `export type *`)이라
// 런타임 값은 여기 별도 파일에 두고, 사용처는 '@/contracts/vocab' 로 **직접** import 한다(배럴의 타입-전용 성격 보존).
//
// 성별: 성별 표기는 전 서비스에서 **일관**된다(지휘부 확정). 형제 인스트루먼트(SAIL 등)도 추상 이관 시
//   이 원천을 공유한다. 종교 목록은 진단 고유 도메인이라 여기 두지 않는다(인스트루먼트 소유 — futurenow/profileVocab).
//
// ⚠ user_profiles.gender 의 **SQL CHECK 와 값이 일치해야 한다**. TS 상수와 SQL CHECK 는 원천이 둘로 나뉘므로
//   (SQL 은 이 상수를 못 읽음), 값을 바꿀 때는 반드시 마이그레이션(CHECK + handle_new_user sanitize)을 함께 바꾼다.
export const GENDERS = ['남', '여'];
