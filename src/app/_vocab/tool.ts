// 측정 도구 명칭 — **단일 출처**(발주서 2026-08-18 §2.3: "도구 명칭 문자열을 상수 한 곳에 모아
//   콘솔·참여자 화면이 함께 참조하게 한다. 명칭 재변경 요청이 오면 그 한 곳만 고치면 되도록 한다").
//
// 왜 한 곳인가: 이 이름이 화면마다 리터럴로 흩어져 있어서 '진단 → 체크' 한 번을 바꾸는 데
//   서른 자리를 뒤져야 했다. 다음 개명 때 같은 일을 되풀이하지 않으려고 여기로 모은다.
//
// 왜 앱 레이어인가: 참여자 화면(_screens·my)과 인도자 콘솔(coach·admin)이 **함께** 쓰는 표시 어휘다.
//   /contracts 에 두면 계약 변경이 되고(지휘부 승인 사안), /core 에 두면 코어가 인스트루먼트 어휘를
//   갖게 된다(CLAUDE §2). 앱 프레젠테이션 계층이 맞는 자리이고, `_screens/types.ts` 의
//   instrumentDisplay() 가 이미 같은 성격의 일을 하고 있어 그것도 여기를 바라보게 했다.
//
// **코드 식별자는 바꾸지 않는다**(발주서 §1): 라우트(/join)·컬럼(responses.wave)·타입(Wave)·
//   API 필드는 그대로다. 참여자는 식별자를 보지 않는다. 여기 있는 것은 눈에 보이는 문자열뿐이다.
//
// 분석 용어는 여기 없다 — 활력지수·위기신호·함정유형·준비도 프로필·간격 레이더는 인도자 전용 개념이고
//   정확한 이름이 필요해 그대로 둔다(발주서 §2.1).
import type { Wave } from '@/contracts';

export const TOOL = {
  /** 시작 시점 측정 도구 */
  pre: '사전 체크',
  /** 종료 시점 측정 도구 */
  post: '마무리 체크',
  /** wave 를 가리지 않는 자리('진행 중인 체크'처럼 문장 안에 낄 때) */
  short: '체크',
  /** 코드 없이 누구나 해보는 공개 차수 */
  trial: '체험 체크',
  /** 인도자용 해석 산출물 */
  preReport: '사전 체크 리포트',
  postReport: '마무리 체크 리포트',
  /** 인스트루먼트 표시명(참여자 홈·차수 목록) */
  productLabel: '퓨처나우 체크',
} as const;

/** wave → 도구 이름. 화면에서 'pre/post' 를 눈에 보이는 말로 옮기는 유일한 통로다. */
export function toolName(wave: Wave): string {
  return wave === 'post' ? TOOL.post : TOOL.pre;
}

/** wave → 인도자용 리포트 이름. */
export function reportName(wave: Wave): string {
  return wave === 'post' ? TOOL.postReport : TOOL.preReport;
}
