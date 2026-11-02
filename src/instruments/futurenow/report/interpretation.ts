// B③-2 · 코치 리포트 해석 문구 생성 (인스트루먼트 소유 — 프롬프트·진단 어휘). ADR-35: 코어는 통로(context.aiChat)만.
// 안전이 곧 제품 안전성: 단정 회피·데이터 범위 고정·병리 금지·구조화 JSON·환각 차단(labels 어휘 + scores 안에서만).
// 측정/강의 어휘 분리(§9.4): scores 숫자를 labels 어휘로 변환해 입력 — labels 명명 없는 함정(D코드)·믿음(faith)은 제외(지어내기 방지).
import { z } from 'zod';
import type { CoreContext, InterpretationView, Wave } from '@/contracts';
import type { FuturenowScores } from '../scoring';
import { COMPASS_AXES, GAP_AXES, GROW_AXES, subjectiveLabels, VITALITY_RANGE, careBanner, vitalityZone } from './labels';

// 구조화 형상(인스트루먼트 소유). 코어는 unknown 으로 저장(B③-1), 경계 검증은 여기(zod).
export interface InterpretationContent {
  headline: string; // 단독은 전체 인상(활력 구간 중심), 사전·마무리 비교는 두 시점의 이동 중심
  axes: { name: string; reading: string }[]; // 두드러진 축 읽기
  caution?: string; // 돌봄 신호 있을 때만
  growth: string; // 성장 여지(약점도 가능성으로)
}

// ── system_prompt (★ 최박사 검토·고정 지점) ──────────────────────────────
export const INTERPRETATION_SYSTEM_PROMPT = `당신은 자기발견 세미나의 체크 결과를 인도자에게 설명하는 조력자입니다.
아래 규칙을 반드시 지킵니다.

[데이터 범위]
- 제공된 점수와 구간명, 축 이름만 사용합니다. 주어지지 않은 사실·수치를 지어내지 않습니다.
- 의학적·심리병리적 진단(우울·불안·장애 등)을 내리지 않습니다. 이 점수는 자기보고 스냅샷이지 진단이 아닙니다.

[어조]
- 단정하지 않습니다. "~입니다"로 사람을 규정하지 말고, "~경향이 보입니다 / ~로 읽힙니다"처럼 관찰·가능성으로 적습니다.
- 따뜻하고 차분하게, 낙인 없이 적습니다. 약한 점수도 성장 여지로 풀어냅니다.
- 부드러운 평어체로 적되, 과장·확신은 피합니다.

[구조]
- 아래 JSON 형식으로만 답합니다. 백틱·서두·설명 없이 JSON 객체 하나만 출력합니다.
{ "headline": "...", "axes": [{"name":"...","reading":"..."}], "caution": "...(선택)", "growth": "..." }
- caution은 돌봄 신호가 있을 때만 포함하고, 없으면 키를 넣지 않습니다.
- 각 항목은 간결하게. 인도자가 읽고 다듬을 분량입니다.

이 해석은 인도자를 위한 참고 초안이며, 인도자가 수정해 확정할 수 있습니다.`;

export type InterpretationOptions = { wave?: Wave; prev?: FuturenowScores };

// A17 — 기본 프롬프트는 그대로 두고 유효한 사후 비교에만 이 단락을 삽입한다(ADR-206).
const COMPARISON_RULES = `[사전·마무리 비교가 주어졌을 때]
- 사전 대비 줄이 있으면, 지금의 상태보다 무엇이 움직였는지를 먼저 읽습니다. headline은 이동을 중심으로 적습니다.
- 척도의 방향 표기(어느 쪽이 바람직한지, 점수가 낮을수록 간격이 큰지)는 읽기를 돕는 정보입니다. 사람의 우열이나 세미나의 성공·실패를 판정하는 근거로 쓰지 않습니다.
- 내려간 점수와 커진 간격을 후퇴로 단정하지 않습니다. 그 이유는 참여자가 쓴 말에 근거가 있을 때만 적고, 근거가 없으면 인도자가 대화로 확인할 변화로 남깁니다.
- 거의 움직이지 않은 지표도 실패로 읽지 않습니다.
- 한 사람의 두 시점 차이를 세미나의 효과나 다른 참여자의 변화로 넓히지 않습니다.
- 돌봄 신호는 지금 점수의 신호만 따릅니다. 사전에만 있던 신호로 caution을 쓰지 않습니다.`;

// 실제 비교 생성에서 근거 없는 원인을 가능성으로 붙인 사례에 대한 재강조. 기본·무짝 입력은 유지한다.
const COMPARISON_EVIDENCE_REMINDER = '비교 해석에서 점수 변화의 이유는 참여자가 쓴 말에 직접 근거가 있을 때만 적어 주세요. 근거가 없으면 “~일 수 있습니다” 같은 가능성 표현으로도 이유를 추정하지 말고, 관찰된 변화와 인도자가 대화로 확인할 점만 적어 주세요. 이 원칙은 headline·axes·growth 모두에 적용합니다.';

/** 시스템 입력과 수치 입력이 같은 비교 조건을 쓴다. 사전 또는 무짝 사후에는 기본 지침만 쓴다. */
export function interpretationSystemPrompt(opts: InterpretationOptions = {}): string {
  return opts.wave === 'post' && opts.prev
    ? INTERPRETATION_SYSTEM_PROMPT.replace('[구조]', `${COMPARISON_RULES}\n\n[구조]`)
    : INTERPRETATION_SYSTEM_PROMPT;
}

// 숫자 표기: 정수면 그대로, 소수면 1자리(GROW 평균이 x.5 가능).
const fmt = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const clip = (s: string, n = 200): string => (s.length > n ? `${s.slice(0, n)}…` : s);

// scores → 코치용 구조화 입력(labels 어휘 + 원점수). 순수·테스트 가능. AI 는 이 범위 안에서만 말한다.
export function buildInterpretationInput(scores: FuturenowScores, opts: InterpretationOptions = {}): string {
  const zone = vitalityZone(scores.vitality.score);
  const lines: string[] = [];
  lines.push(`[활력] ${scores.vitality.score}점 (구간: ${zone.name}; 범위 ${VITALITY_RANGE.min}~${VITALITY_RANGE.max})`);

  lines.push(
    `[나침반 4축] ${COMPASS_AXES.map((a) => `${a.label} ${scores.compass[a.code as 'NAV1' | 'NAV2' | 'NAV3' | 'NAV4']}/5`).join(' · ')} (1~5, 우측이 바람직 방향)`,
  );

  const grow = scores.grow;
  lines.push(
    `[준비도] ${GROW_AXES.map((a) => `${a.label} ${fmt(grow[a.key as 'G' | 'R' | 'O' | 'W' | 'F'])}/5`).join(' · ')}`,
  );

  lines.push(`[삶의 간격 · 현재 위치] ${GAP_AXES.map((a) => `${a.label} ${scores.gap[a.code as 'B1' | 'B2' | 'B3' | 'B4' | 'B5']}/10`).join(' · ')} (0~10, 10 = 5년 후 완성된 모습. 점수가 낮을수록 남은 간격이 큽니다)`);

  const banner = careBanner(scores);
  lines.push(`[돌봄 신호] ${banner ? `있음 — ${banner.title}` : '없음'}`);

  const prev = opts.wave === 'post' ? opts.prev : undefined;
  if (prev) {
    lines.push('[사전대비]');
    lines.push(`활력: ${prev.vitality.score} → ${scores.vitality.score}점`);
    lines.push(
      `나침반 4축: ${COMPASS_AXES.map((a) => `${a.label} ${prev.compass[a.code]} → ${scores.compass[a.code]}`).join(' · ')} (1~5)`,
    );
    lines.push(
      `준비도: ${GROW_AXES.map((a) => `${a.label} ${fmt(prev.grow[a.key])} → ${fmt(grow[a.key])}`).join(' · ')} (1~5)`,
    );
    lines.push(
      `삶의 간격: ${GAP_AXES.map((a) => `${a.label} 사전 ${prev.gap[a.code]} → 지금 ${scores.gap[a.code]} (남은 간격 ${fmt(10 - prev.gap[a.code])} → ${fmt(10 - scores.gap[a.code])})`).join(' · ')} (현재 위치 0~10)`,
    );
    lines.push(`돌봄 신호: 사전 ${careBanner(prev) ? '있음' : '없음'} · 지금 ${banner ? '있음' : '없음'}`);
  }

  const labels = subjectiveLabels(opts.wave ?? 'pre');
  const subj = [
    scores.subjective.E1 && `${labels.E1}: ${clip(scores.subjective.E1)}`,
    scores.subjective.E2 && `${labels.E2}: ${clip(scores.subjective.E2)}`,
    scores.subjective.E3 && `${labels.E3}: ${clip(scores.subjective.E3)}`,
  ].filter(Boolean);
  if (subj.length) lines.push(`[참여자가 쓴 말]\n${subj.join('\n')}`);

  return [
    '다음은 한 참여자의 자기발견 체크 결과입니다. 위 규칙에 따라 인도자용 해석 초안을 JSON 으로 작성해 주세요.',
    '',
    ...lines,
    '',
    banner
      ? 'caution 키를 포함해, 점수·질문을 드러내지 말고 따뜻한 안부를 권하는 한 문장을 적어 주세요.'
      : 'caution 키는 넣지 마세요(돌봄 신호 없음).',
    ...(prev ? ['', COMPARISON_EVIDENCE_REMINDER] : []),
  ].join('\n');
}

const contentSchema = z.object({
  headline: z.string().min(1),
  axes: z.array(z.object({ name: z.string(), reading: z.string() })),
  caution: z.string().min(1).optional(),
  growth: z.string().min(1),
});

// 게이트웨이 content(JSON 문자열) → InterpretationContent. 방어적: 코드펜스 strip + 첫{~끝} 추출 + zod 검증.
// 형식 위반은 throw(호출부가 우아한 저하). 환각·깨진 출력이 화면을 깨지 않게.
export function parseInterpretation(raw: string): InterpretationContent {
  let s = raw.trim();
  // ```json … ``` 또는 ``` … ``` 감싸짐 제거
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) s = fence[1].trim();
  // 서두 텍스트 대비 첫 { ~ 마지막 } 만 취함
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first === -1 || last === -1 || last < first) throw new Error('해석 응답 파싱 실패: JSON 객체 없음');
  const obj: unknown = JSON.parse(s.slice(first, last + 1));
  return contentSchema.parse(obj); // 누락·형식 위반 시 ZodError throw
}

// 지연 생성: 있으면 캐시 반환(재생성 0), 없으면 게이트웨이 생성→파싱→저장. 인스트루먼트 함수(코어 어휘 0).
export async function generateInterpretation(
  context: CoreContext,
  responseId: string,
  scores: FuturenowScores,
  cohortId: string | null,
  opts: InterpretationOptions = {},
): Promise<InterpretationView> {
  const existing = await context.getInterpretation(responseId);
  if (existing) return existing;

  const res = await context.aiChat({
    systemPrompt: interpretationSystemPrompt(opts),
    messages: [{ role: 'user', content: buildInterpretationInput(scores, opts) }],
    temperature: 0.4, // 낮게 — 일관·절제(단정·과장 억제)
    caller: 'futurenow:report-interpretation',
    useCache: true,
  });
  const content = parseInterpretation(res.content);
  return context.saveInterpretation({ responseId, cohortId, aiContent: content, aiModel: res.model });
}
