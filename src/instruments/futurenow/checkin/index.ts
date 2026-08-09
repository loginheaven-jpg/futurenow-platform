// 회차 갈무리 세션 레지스트리(ADR-85). 회차 추가 = sessionN.ts 파일 하나 + 아래 getCheckinSession 한 줄.
//   코어는 이 모듈을 모른다(인스트루먼트 소유). 참여자 카드·인도자 현황이 회차번호로 이 레지스트리만 조회한다.
//   카드는 회차번호로 분기하지 않고 '블록의 존재'로 분기한다(예: copy.step.lastStep 있으면 지난 걸음 블록).
import { CHECKIN_SESSION_1 } from './session1';
import { CHECKIN_SESSION_2 } from './session2';
import { CHECKIN_SESSION_3 } from './session3';

// 단일행/여러행 공통 필드. help·placeholder 는 회차·필드마다 선택.
export type CheckinField = { key: string; label: string; help?: string; placeholder?: string };

// 인도자 '문장 모아 보기' 열 정의 — 단일 키 또는 한 쌍(1회차 갈망 A→B). 회차별로 열이 바뀐다(§5-6).
//   쌍(from→to)은 **교체·변화**를 뜻한다. 나란한 두 값(영역+바람)에는 쓰지 않는다 — 화살표가 거짓말을 한다.
export type SummaryField = { label: string; key: string } | { label: string; from: string; to: string };

// 되비추기(ADR-90) — 지난 회차 answers 에서 읽어 블록 위에 회색으로 보여 준다.
//   ADR-85 는 자리를 고정했으나(identity.mirror·lastStep.mirrorEmpty) 3회차는 세 곳에 되비춘다.
//   자리가 아니라 **블록 속성**이어야 회차마다 다른 곳에 붙일 수 있다.
export type Mirror = {
  label: string;    // 회색 캡션
  keys: string[];   // 지난 회차 answers 에서 읽을 키. 값이 있는 것만 ' · ' 로 잇는다
  empty?: string;   // 값이 하나도 없을 때 문구. 없으면 블록 자체를 그리지 않는다
};

// 블록 공통 속성(ADR-90).
//   group = 이 블록이 **속한** 묶음(이중 STEP 회차의 이정표). '이 블록부터'가 아니라 '이 블록이 속한'이다.
//   렌더 규칙: 현재 블록의 group 이 직전 블록과 다르면 경계를 그린다 —
//     값이 있으면 hairline + 캡션, 없으면 hairline 만. 면의 첫 블록이면 hairline 을 생략하고 캡션만.
//   이 한 규칙이 네 전이(없음→A · A→A · A→B · A→없음)를 모두 덮는다. 단일 STEP 회차는 값이 없어 경계가 없다.
export type BlockBase = { group?: string; mirror?: Mirror };

// 1면 슬롯 이름 — **회차가 아니라 모양**이다(ADR-90). 이래야 4~7회차가 문안 파일만으로 조립된다.
export type SlotName = 'pairText' | 'areaPick' | 'purpose' | 'question' | 'identity' | 'mood';

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
    // 렌더 순서 — 선언 순서가 아니라 **데이터**가 정한다(ADR-90). 회차마다 순서가 다르기 때문이다.
    //   2회차 areaPick→purpose→identity→mood · 3회차 areaPick→question→pairText→mood.
    //   카드·readModel 이 이 배열을 훑어 존재하는 슬롯만 그린다. 회차 번호로 분기하지 않는다.
    order: readonly SlotName[];
    // 라벨 + 두 칸(from → to). 1회차 갈망 한 쌍 · 3회차 ERRC 짝.
    //   connector = 두 칸 사이 문구(3회차 '↓ 그 자리에'). 없으면 그리지 않는다.
    pairText?: BlockBase & { label: string; help: string; from: CheckinField; to: CheckinField; connector?: string };
    // 칩 단일선택(문자열 저장) + 한 줄. 2회차 가슴 뛴 영역 · 3회차 간절한 영역.
    // lines 는 칩 아래 붙는 줄들이다. 단수 `line` 이었으나 3회차가 둘을 요구해 배열로 승격했다(ADR-98).
    //   `line2` 같은 임시 필드를 더하지 않는 이유는 ADR-90 과 같다 — 슬롯을 회차마다 늘리면 7회차에 무너진다.
    //   1·2회차는 한 줄짜리 배열이 될 뿐 문안이 바뀌지 않는다(리터럴 잠금 무영향).
    areaPick?: BlockBase & { key: string; label: string; help: string; options: readonly string[]; lines: readonly CheckinField[] };
    // 목적을 찾는 세 질문(2회차~) — ② '인생을 이끌어갈 하나의 문장'의 재료.
    //   기본 펼침이다: 수업 중 시간이 부족해 숙제로 나갈 가능성이 커, 접어 두면 존재를 모른 채 넘어간다.
    //   대신 badge('선택')로 필수가 아님을 알린다 — 빈 입력칸 셋이 펼쳐져 있으면 필수로 읽히기 때문이다.
    purpose?: BlockBase & { title: string; badge: string; help: string; fields: CheckinField[] };
    // 한 칸 서술 + badge. 3회차 '오늘의 질문' — 접힘으로 감싸지 않는다(그 회차의 핵심 경험을 받는 자리).
    question?: BlockBase & CheckinField & { badge?: string };
    // 정체성 문장 — 3회차에는 없다(ADR-90 에서 선택 슬롯으로).
    identity?: BlockBase & CheckinField;
    // 마음 — order 에 넣는다. '언제나 마지막'을 특례로 두면 묶음의 끝을 데이터로 말할 수 없다.
    mood: BlockBase & { key: string; label: string; help: string; options: readonly string[]; exclusive: string; max: number };
    // promptPlaceholder — mood 의 exclusive(목록 한계) 낱말을 고르면 이 문구로 바뀐다(ADR-91 C).
    moodCustom: { key: string; placeholder: string; promptPlaceholder?: string };
  };
  // summary = 접힌 상태에서 안에 무엇이 있는지 보여 주는 한 줄. 문안이므로 레지스트리가 소유한다(컴포넌트에 박지 않는다).
  deepen: { title: string; summary: string; fields: (CheckinField & { help: string; mirror?: Mirror })[] };
  step: {
    // ⑤ 지난 한 걸음 결산 — 2회차부터. 이 블록 위에 지난 회차 한 걸음을 되비춘다(§6).
    lastStep?: { key: string; label: string; options: readonly string[]; note: CheckinField; mirror: Mirror };
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
      summary: string;
      // 대부분 건너뛰는 칸이라 기본은 접힘. 다만 마지막 회차의 세미나 제안은 다음 기수 설계의 최대 수확처라
      // 7회차만 true 로 연다 — 회차별 설정으로 두지 않으면 그때 하드코딩하게 된다.
      defaultOpen?: boolean;
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
  //   ADR-91: 셋 다 하나의 `required` 선언에서 파생된다 — 손으로 따로 쓰면 서로 어긋날 수 있고,
  //   어긋나면 '제출을 막았는데 무엇이 비었는지 못 알려 주는' 상태가 된다.
  filledCount: (answers: Record<string, unknown>) => number;
  requiredTotal: number;
  /** 빈 필수 칸의 라벨(화면 문구 그대로). 쌍 문항은 비어 있는 쪽만. */
  missingLabels: (answers: Record<string, unknown>) => string[];
  /** 빈 필수 칸의 응답 키. missingLabels 와 순서가 같다('채우러 가기'가 첫 칸으로 옮겨 간다). */
  missingKeys: (answers: Record<string, unknown>) => string[];
  summaryFields: SummaryField[];
};

// 회차 조회 — 미등록 회차는 null(→ page 가드가 '준비 중' 처리). 회차 추가 시 여기 한 줄.
export function getCheckinSession(n: number): CheckinSession | null {
  if (n === 1) return CHECKIN_SESSION_1;
  if (n === 2) return CHECKIN_SESSION_2;
  if (n === 3) return CHECKIN_SESSION_3;
  return null;
}
