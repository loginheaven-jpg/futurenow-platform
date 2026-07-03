// B③-2 · 코치 리포트 해석 문구 생성 (인스트루먼트 소유 — 프롬프트·진단 어휘). ADR-35: 코어는 통로(context.aiChat)만.
// 안전이 곧 제품 안전성: 단정 회피·데이터 범위 고정·병리 금지·구조화 JSON·환각 차단(labels 어휘 + scores 안에서만).
// 측정/강의 어휘 분리(§9.4): scores 숫자를 labels 어휘로 변환해 입력 — labels 명명 없는 함정(D코드)·믿음(faith)은 제외(지어내기 방지).
import { z } from 'zod';
import type { CoreContext, InterpretationView } from '@/contracts';
import type { FuturenowScores } from '../scoring';
import { COMPASS_AXES, GAP_AXES, GROW_AXES, SUBJECTIVE_LABELS, VITALITY_RANGE, careBanner, vitalityZone } from './labels';

// 구조화 형상(인스트루먼트 소유). 코어는 unknown 으로 저장(B③-1), 경계 검증은 여기(zod).
export interface InterpretationContent {
  headline: string; // 전체 인상(활력 구간 중심)
  axes: { name: string; reading: string }[]; // 두드러진 축 읽기
  caution?: string; // 돌봄 신호 있을 때만
  growth: string; // 성장 여지(약점도 가능성으로)
}

// ── system_prompt (★ 최박사 검토·고정 지점) ──────────────────────────────
export const INTERPRETATION_SYSTEM_PROMPT = `당신은 자기발견 세미나의 진단 결과를 코치에게 설명하는 조력자입니다.
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
- 각 항목은 간결하게. 코치가 읽고 다듬을 분량입니다.

이 해석은 코치를 위한 참고 초안이며, 코치가 수정해 확정할 수 있습니다.`;

// 숫자 표기: 정수면 그대로, 소수면 1자리(GROW 평균이 x.5 가능).
const fmt = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const clip = (s: string, n = 200): string => (s.length > n ? `${s.slice(0, n)}…` : s);

// scores → 코치용 구조화 입력(labels 어휘 + 원점수). 순수·테스트 가능. AI 는 이 범위 안에서만 말한다.
export function buildInterpretationInput(scores: FuturenowScores): string {
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

  lines.push(`[삶의 간격] ${GAP_AXES.map((a) => `${a.label} ${scores.gap[a.code as 'B1' | 'B2' | 'B3' | 'B4' | 'B5']}/10`).join(' · ')} (0~10)`);

  const banner = careBanner(scores);
  lines.push(`[돌봄 신호] ${banner ? `있음 — ${banner.title}` : '없음'}`);

  const subj = [
    scores.subjective.E1 && `${SUBJECTIVE_LABELS.E1}: ${clip(scores.subjective.E1)}`,
    scores.subjective.E2 && `${SUBJECTIVE_LABELS.E2}: ${clip(scores.subjective.E2)}`,
    scores.subjective.E3 && `${SUBJECTIVE_LABELS.E3}: ${clip(scores.subjective.E3)}`,
  ].filter(Boolean);
  if (subj.length) lines.push(`[참여자가 쓴 말]\n${subj.join('\n')}`);

  return [
    '다음은 한 참여자의 자기발견 진단 결과입니다. 위 규칙에 따라 코치용 해석 초안을 JSON 으로 작성해 주세요.',
    '',
    ...lines,
    '',
    banner
      ? 'caution 키를 포함해, 점수·문항을 드러내지 말고 따뜻한 안부를 권하는 한 문장을 적어 주세요.'
      : 'caution 키는 넣지 마세요(돌봄 신호 없음).',
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
): Promise<InterpretationView> {
  const existing = await context.getInterpretation(responseId);
  if (existing) return existing;

  const res = await context.aiChat({
    systemPrompt: INTERPRETATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildInterpretationInput(scores) }],
    temperature: 0.4, // 낮게 — 일관·절제(단정·과장 억제)
    caller: 'futurenow:report-interpretation',
    useCache: true,
  });
  const content = parseInterpretation(res.content);
  return context.saveInterpretation({ responseId, cohortId, aiContent: content, aiModel: res.model });
}
