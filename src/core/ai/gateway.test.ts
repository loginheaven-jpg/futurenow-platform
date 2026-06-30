import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiGatewayError, gatewayChat } from './gateway';

const ok = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body), text: () => Promise.resolve('') } as Response);

afterEach(() => vi.unstubAllGlobals());

describe('gatewayChat — 코어 AI 게이트웨이 클라이언트', () => {
  it('성공 — snake 응답을 camel(usage)로 매핑', async () => {
    vi.stubGlobal('fetch', vi.fn(() => ok({ content: '해석문', model: 'claude-sonnet-4-6', provider: 'claude-sonnet', usage: { input_tokens: 10, output_tokens: 20 } })));
    const r = await gatewayChat({ messages: [{ role: 'user', content: 'hi' }] });
    expect(r.content).toBe('해석문');
    expect(r.model).toBe('claude-sonnet-4-6');
    expect(r.usage).toEqual({ inputTokens: 10, outputTokens: 20 });
  });

  it('camel 요청 → snake 본문 매핑 + 미지정 옵션 생략', async () => {
    const spy = vi.fn(() => ok({ content: 'x', model: 'm', provider: 'p', usage: { input_tokens: 1, output_tokens: 1 } }));
    vi.stubGlobal('fetch', spy);
    await gatewayChat({ messages: [{ role: 'user', content: 'hi' }], systemPrompt: 'S', maxTokens: 100, caller: 'futurenow:test' });
    const call = spy.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(call[1].body as string);
    expect(body.system_prompt).toBe('S');
    expect(body.max_tokens).toBe(100);
    expect(body.caller).toBe('futurenow:test');
    expect('temperature' in body).toBe(false); // 미지정 → 키 생략(게이트웨이 기본)
    expect('provider' in body).toBe(false);
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
  });

  it('HTTP 오류 → AiGatewayError(status 보존)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 502, text: () => Promise.resolve('bad gateway'), json: () => Promise.resolve({}) } as Response)));
    await expect(gatewayChat({ messages: [] })).rejects.toMatchObject({ name: 'AiGatewayError', status: 502 });
  });

  it('content 없는 응답 → AiGatewayError(형식 오류)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => ok({ model: 'm', provider: 'p', usage: {} })));
    await expect(gatewayChat({ messages: [] })).rejects.toBeInstanceOf(AiGatewayError);
  });

  it('네트워크 예외 → AiGatewayError 로 포장', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))));
    await expect(gatewayChat({ messages: [] })).rejects.toBeInstanceOf(AiGatewayError);
  });
});
