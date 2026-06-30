// 코어 AI 게이트웨이 클라이언트 — 범용 호출 통로(진단 무관·서버 전용). ai-gateway `POST /api/ai/chat`.
// API Key 불필요(게이트웨이가 키 관리·provider fallback 자동). 프롬프트·진단 어휘는 인스트루먼트 소유(ADR-21 논리·ADR-35).
// 계약(camelCase) → 게이트웨이 wire(snake)는 여기서 매핑한다. 미지정 옵션은 보내지 않음(게이트웨이 기본 사용).
import type { ChatRequest, ChatResponse } from '@/contracts';

// 공개 URL·키 불필요. 환경변수 AI_GATEWAY_URL 로 override(미설정 시 기본값으로도 동작).
const DEFAULT_GATEWAY_URL = 'https://ai-gateway20251125.up.railway.app';
const DEFAULT_TIMEOUT_MS = 30_000;

export class AiGatewayError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AiGatewayError';
    this.status = status;
  }
}

export async function gatewayChat(req: ChatRequest, opts?: { timeoutMs?: number }): Promise<ChatResponse> {
  const base = (process.env.AI_GATEWAY_URL || DEFAULT_GATEWAY_URL).replace(/\/+$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  // camel → snake 매핑. undefined 는 키 자체를 생략(게이트웨이 기본값 적용).
  const body: Record<string, unknown> = { messages: req.messages };
  if (req.provider !== undefined) body.provider = req.provider;
  if (req.systemPrompt !== undefined) body.system_prompt = req.systemPrompt;
  if (req.maxTokens !== undefined) body.max_tokens = req.maxTokens;
  if (req.temperature !== undefined) body.temperature = req.temperature;
  if (req.useFallback !== undefined) body.use_fallback = req.useFallback;
  if (req.useCache !== undefined) body.use_cache = req.useCache;
  if (req.caller !== undefined) body.caller = req.caller;

  try {
    const res = await fetch(`${base}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new AiGatewayError(`AI 게이트웨이 오류(HTTP ${res.status})${text ? `: ${text.slice(0, 200)}` : ''}`, res.status);
    }
    const data = (await res.json()) as {
      content?: unknown;
      model?: string;
      provider?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
      citations?: string[] | null;
    };
    if (typeof data.content !== 'string') throw new AiGatewayError('AI 게이트웨이 응답 형식 오류(content 없음)');
    return {
      content: data.content,
      model: data.model ?? 'unknown',
      provider: data.provider ?? 'unknown',
      usage: { inputTokens: data.usage?.input_tokens ?? 0, outputTokens: data.usage?.output_tokens ?? 0 },
      citations: data.citations ?? null,
    };
  } catch (e) {
    if (e instanceof AiGatewayError) throw e;
    if ((e as Error)?.name === 'AbortError') throw new AiGatewayError('AI 게이트웨이 시간 초과');
    throw new AiGatewayError(`AI 게이트웨이 호출 실패: ${(e as Error)?.message ?? 'unknown'}`);
  } finally {
    clearTimeout(timer);
  }
}
