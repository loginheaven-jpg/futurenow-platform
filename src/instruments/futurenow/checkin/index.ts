// 회차 갈무리 세션 레지스트리(ADR-85). 회차 추가 = sessionN.ts 파일 하나 + 아래 getCheckinSession 한 줄.
//   코어는 이 모듈을 모른다(인스트루먼트 소유). 참여자 카드·인도자 현황이 회차번호로 이 레지스트리만 조회한다.
//   카드는 회차번호로 분기하지 않고 '블록의 존재'로 분기한다(예: copy.step.lastStep 있으면 지난 걸음 블록).
import { CHECKIN_SESSION_1 } from './session1';
import { CHECKIN_SESSION_2 } from './session2';

// 단일행/여러행 공통 필드. help·placeholder 는 회차·필드마다 선택.
export type CheckinField = { key: string; label: string; help?: string; placeholder?: string };

// 인도자 '문장 모아 보기' 열 정의 — 단일 키 또는 한 쌍(1회차 갈망 A→B). 회차별로 열이 바뀐다(§5-6).
export type SummaryField = { label: string; key: string } | { label: string; from: string; to: string };

// 한 회차 카드의 전체 문안·판정. as const 대신 satisfies 로 형태를 강제하되 리터럴은 보존한다.
export type CheckinSession = {
  sessionNo: number;
  cover: {
    brand: string;
    title: string;
    subtitle: string;
    counter: (n: number) => string;
    band: string;
    firstVisitOnce?: string; // 1회차만(2회차부터는 안내 반복 안 함)
  };
  today: {
    // ① 첫 블록 — 회차마다 형태가 다르다(둘 중 하나만 존재). 카드가 존재로 분기.
    desire?: { label: string; help: string; from: CheckinField; to: CheckinField };
    futureArea?: { key: string; label: string; help: string; options: readonly string[]; line: CheckinField };
    // ② 정체성 문장 — key·문안은 회차마다 다르나 형태 동일. mirror=지난 회차 문장을 위에 되비춘다.
    identity: CheckinField & { mirror?: boolean };
    // ③ 마음
    mood: { key: string; label: string; help: string; options: readonly string[]; exclusive: string; max: number };
    moodCustom: { key: string; placeholder: string };
  };
  deepen: { title: string; fields: { key: string; label: string; help: string }[] };
  step: {
    // ⑤ 지난 한 걸음 결산 — 2회차부터. 이 블록 위에 지난 회차 한 걸음을 되비춘다(§6).
    lastStep?: { key: string; label: string; options: readonly string[]; note: CheckinField; mirrorEmpty: string };
    // ⑥ 다음 한 걸음 — 전 회차 공통.
    title: string;
    help: string;
    what: CheckinField;
    when: CheckinField;
    blocker: CheckinField;
    // 공개 토글(step_private 컬럼) — 2회차부터. 없으면 비공개(1회차).
    share?: { notice: string; toggleLabel: string };
  };
  wrap: {
    confidence: { key: string; label: string; help: string; min: number; max: number; leftLabel: string; rightLabel: string };
    facilitatorBox: {
      title: string;
      need: CheckinField;
      suggestion: CheckinField;
      suggestionAnon: { key: string; label: string };
      contactRequest: { key: string; label: string; help: string };
    };
    selfNote: CheckinField;
  };
  save: { button: string; notice1: string; notice2: string };
  done: { title: string; stepHeading: string; toHome: string; edit: string };
  // 필수 칸 판정(회차별). confidence·선택 항목은 세지 않는다.
  filledCount: (answers: Record<string, unknown>) => number;
  requiredTotal: number;
  summaryFields: SummaryField[];
};

// 회차 조회 — 미등록 회차는 null(→ page 가드가 '준비 중' 처리). 회차 추가 시 여기 한 줄.
export function getCheckinSession(n: number): CheckinSession | null {
  if (n === 1) return CHECKIN_SESSION_1;
  if (n === 2) return CHECKIN_SESSION_2;
  return null;
}
