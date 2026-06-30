// AI 게이트웨이 호출 계약 (범용 — 진단 무관). 코어가 통로를 구현(`src/core/ai/gateway.ts`),
// 인스트루먼트는 `context.aiChat` 로 호출만 한다 — 프롬프트·진단 어휘는 인스트루먼트 소유(ADR-21 논리·ADR-35).
// 게이트웨이: ai-gateway `POST /api/ai/chat`, API Key 불필요(게이트웨이가 키 관리·provider fallback 자동).
// 계약은 camelCase, 게이트웨이 wire(snake)는 코어 클라이언트가 매핑한다(DB row↔domain 매퍼와 동형).

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  provider?: string; // 미지정 → 게이트웨이 기본(claude-sonnet). 해석 문구는 기본 고정 권고
  systemPrompt?: string; // 게이트웨이 system_prompt
  maxTokens?: number; // 기본 4096
  temperature?: number; // 기본 0.7
  useFallback?: boolean; // 기본 true (claude-sonnet→haiku→chatgpt→gemini)
  useCache?: boolean; // 기본 true (동일 입력 캐시)
  caller?: string; // 사용량 추적(예: 'futurenow:report-interpretation')
}

export interface ChatUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ChatResponse {
  content: string;
  model: string;
  provider: string;
  usage: ChatUsage;
  citations?: string[] | null;
}
