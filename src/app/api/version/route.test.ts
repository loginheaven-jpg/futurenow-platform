// `/api/version` — **무엇을 담고 무엇을 담지 않는가** (3차 T-3).
//
// 이 엔드포인트는 인증이 없다. 그래서 지키는 선이 하나뿐이다 —
//   **공개해도 무해한 값만 담는다.** 실수로 env 하나가 새면 그것이 그대로 공개된다.
//   그래서 "값이 맞는가"보다 **"담지 않기로 한 것이 안 담겼는가"** 를 더 강하게 단언한다.
import { describe, expect, it } from 'vitest';
import { GET } from './route';
import { isProtectedPath, proxyMatcherCovers } from '@/proxy.guard';

async function body(): Promise<Record<string, unknown>> {
  return (await GET().json()) as Record<string, unknown>;
}

describe('/api/version — 배포 신원', () => {
  it('신원 다섯 칸을 낸다', async () => {
    const b = await body();
    for (const k of ['commit', 'commitShort', 'ref', 'env', 'deploymentId', 'builtAt']) {
      expect(Object.keys(b), `${k} 칸이 있어야 한다`).toContain(k);
    }
  });

  it('로컬에서는 env 가 local 이고 커밋은 null 이다 — 없는 값을 지어내지 않는다', async () => {
    const b = await body();
    expect(b.env).toBe('local');
    expect(b.commit).toBeNull();
    expect(b.commitShort).toBeNull();
  });

  it('빌드 시각이 ISO 문자열이다', async () => {
    const b = await body();
    expect(typeof b.builtAt).toBe('string');
    expect(Number.isNaN(Date.parse(b.builtAt as string))).toBe(false);
  });

  it('**담지 않기로 한 것이 안 담겼다** — 키·비밀·내부 경로·의존성', async () => {
    const raw = JSON.stringify(await body()).toLowerCase();
    for (const forbidden of ['key', 'secret', 'token', 'password', 'supabase', 'postgres', 'node_modules', 'dependencies', '/src/', 'anon']) {
      expect(raw, `'${forbidden}' 가 응답에 있으면 안 된다`).not.toContain(forbidden);
    }
  });

  it('응답 칸이 여섯을 넘지 않는다 — 늘리려면 무해한지 먼저 판단한다', async () => {
    // 칸이 조용히 느는 것을 막는다. 늘릴 때 이 단언이 걸리고, 그때 §4 금지 목록을 다시 본다.
    expect(Object.keys(await body())).toHaveLength(6);
  });

  it('보호 접두사 밖이다 — 미인증에서 확인할 수 있어야 뜻이 있다', () => {
    expect(isProtectedPath('/api/version')).toBe(false);
    // matcher 는 그대로다(불변식 17) — proxy 는 돌되 차단하지 않는다.
    expect(proxyMatcherCovers('/api/version')).toBe(true);
  });
});
