// /src/contracts/instrument.ts
//
// 작업 B — 플러그인 계약 4종. 방향: **진단 → 코어**.
// 진단은 아래 `InstrumentModule` 을 코어에 등록한다.
// 출처: architecture.md §8(§8.1 확정 / §8.2~8.4 사양 확정·구현 대기).
// 형상은 사양 그대로(모듈 공유 위해 import/export 만 부가). **변경은 지휘부 승인 후에만**.

import type { AlertInput, IdentityPolicy, InstrumentId, Wave } from './domain';
import type { CoreContext } from './core-context';

export type AnswerValue = number | string | boolean | null;
export type Answers = Record<string /* item.code */, AnswerValue>;

export interface InstrumentModule<A = Answers, P = unknown, S = unknown> {
  id: InstrumentId;
  identityPolicy: IdentityPolicy; // §5.2
  flow: ResponseFlowPlugin; // B①
  scoring: ScoringPlugin<A, S>; // B②
  report: ReportPlugin<S>; // B③
  alerts: AlertPlugin<S>; // B④
  answersSchema: unknown; // zod — A 경계 검증
  profileSchema: unknown; // zod — P 경계 검증
}

// ─────────────────────────────────────────────────────────────────────────────
// 8.1 B① 응답 흐름 계약 (확정)
// ─────────────────────────────────────────────────────────────────────────────

export type ScaleKind = 'bipolar' | 'likert' | 'numeric' | 'text' | 'check';
export interface BipolarScale {
  kind: 'bipolar';
  points: number;
  leftLabel: string;
  rightLabel: string;
}
export interface LikertScale {
  kind: 'likert';
  points: number;
  minLabel: string;
  maxLabel: string;
  centerLabel?: string; // 있으면 중앙 표기, 없으면 생략(척도 레이블 데이터 소유 — ADR-20)
}
export interface NumericScale {
  kind: 'numeric';
  min: number;
  max: number;
  input: 'slider' | 'number';
  suffix?: string;
}
export interface TextScale {
  kind: 'text';
  multiline: boolean;
  placeholder?: string;
  maxLen?: number;
}
export interface CheckScale {
  kind: 'check';
  label: string;
}
export type ScaleDef = BipolarScale | LikertScale | NumericScale | TextScale | CheckScale;

export type Polarity = 'positive' | 'negative' | 'neutral';
export interface Item {
  code: string; // 저장 키 (영구·불변) — 예 'A2','C5','B1'
  prompt: string; // 참여자에게 보이는 유일한 문자열
  scale: ScaleDef;
  required: boolean;
  polarity: Polarity; // 내부 전용 — 배열 제약·역채점 근거. 화면 비노출
}

export interface StandardBlock {
  id: string;
  kind: 'standard';
  title: string;
  intro?: string; // intro·title은 참여자 노출(존대체)
  optional?: boolean; // F섹션 '선택' 표시
  items: Item[];
  ordering: OrderingPolicy;
}
export interface CustomBlock {
  id: string;
  kind: 'custom';
  title: string;
  optional?: boolean;
  component: string; // customComponents 등록 키
  emits: string[]; // 채우는 answers 코드 목록 — 검증용
}
export type Block = StandardBlock | CustomBlock;

export type OrderingPolicy =
  | { mode: 'fixed' }
  | { mode: 'constrained-shuffle'; firstPolarity?: Polarity; maxConsecutiveSameNegative?: number };

export interface ResponseSchema {
  instrumentId: InstrumentId;
  wave: Wave;
  blocks: Block[];
}

export interface CustomFlowComponentProps {
  value: Record<string, AnswerValue>;
  onChange: (code: string, v: AnswerValue) => void;
  context: CoreContext;
}
export type CustomFlowComponent = (props: CustomFlowComponentProps) => unknown;

export interface ResponseFlowPlugin {
  getSchema(wave: Wave): ResponseSchema;
  customComponents?: Record<string, CustomFlowComponent>;
}

// 코어 러너 (코어가 제공, 진단은 호출만)
// 코어 책임: 위젯 렌더 · 제약무작위 배열 · 진행 저장/재개 · 필수 검증 ·
//           모바일 7블록 흐름 · 접근성 · 완료 시 context.saveResponse() 호출
export interface ResponseRunnerProps {
  schema: ResponseSchema;
  context: CoreContext;
  cohortId: string | null;
  wave: Wave;
  onComplete: (responseId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8.2 B② 채점 계약 (사양 확정·구현 대기)
//   퓨처나우 TScores 형상은 §9.3 의 7규칙 산출물. 상세 입출력 규격은 다음 설계 세션에서 확정.
// ─────────────────────────────────────────────────────────────────────────────

export interface ScoringPlugin<A = Answers, S = unknown> {
  score(answers: A, ctx: { wave: Wave }): S;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8.3 B③ 리포트 계약 (사양 확정·구현 대기)
// ─────────────────────────────────────────────────────────────────────────────

export interface ReportPlugin<S = unknown> {
  renderScreen(scores: S, prev?: S): unknown; // 화면 결과(나침반 게이지·레이더·막대)
  renderPdf(scores: S, profile: unknown, prev?: S): unknown; // react-pdf 개인 분석보고서
  renderGroup(all: S[]): unknown; // 그룹 평균 레이더(1주차 오프닝)
}

// ─────────────────────────────────────────────────────────────────────────────
// 8.4 B④ 알림 트리거 계약 (사양 확정·구현 대기)
//   퓨처나우 트리거는 §9.3 규칙 2(Red Flag)·돌봄 체크.
// ─────────────────────────────────────────────────────────────────────────────

// 진단은 severity·reason 만 안다. responseId·cohortId 는 코어가 saveResponse 후 주입한다(책임 경계 정직화).
export type AlertSignal = Pick<AlertInput, 'severity' | 'reason'>;

export interface AlertPlugin<S = unknown> {
  evaluate(scores: S, answers: Answers): AlertSignal[];
}
