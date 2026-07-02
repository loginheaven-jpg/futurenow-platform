'use server';
// 코치 리포트 해석 — 비차단 생성 트리거(B③-A). 서버 렌더 경로에서 aiChat 동기 await 를 제거(§1 비차단 원칙)하고,
// 클라이언트가 마운트 후 이 액션을 호출해 해석을 생성·표시한다(첫 열람 26s 블랭크 회피).
// 권한: getResponse RLS(차수 코치·운영자·본인)가 강제 — 비소유 접근은 예외 → 실패 반환(누출 0).
// 멱등: generateInterpretation 이 existing 먼저 확인, saveInterpretation 은 '없을 때만'. 동시 열람(드묾)의 중복 aiChat 은
//   낭비이나 정합 안전 — aiChat useCache:true(동일 입력 캐시)로 완화. 락(DB 커넥션 26s 점유)은 기각.
import type { Answers } from '@/contracts';
import { createCoreContext } from '@/core/context';
import { createServerSupabase } from '@/core/supabase/server';
import { futurenowScoring } from '@/instruments/futurenow/scoring';
import { generateInterpretation, type InterpretationContent } from '@/instruments/futurenow/report/interpretation';

export async function ensureInterpretationAction(
  responseId: string,
): Promise<{ ok: true; content: InterpretationContent } | { ok: false; error: string }> {
  try {
    const ctx = createCoreContext(await createServerSupabase());
    const me = await ctx.currentUser();
    if (!me || me.role === 'user') return { ok: false, error: 'forbidden' }; // 코치/운영자 전용
    const resp = await ctx.getResponse<Answers, unknown>(responseId); // RLS 미달 → throw → catch
    const scores = futurenowScoring.score(resp.answers, { wave: resp.wave });
    const view = await generateInterpretation(ctx, responseId, scores, resp.cohortId ?? null);
    const content = (view.effective ?? null) as InterpretationContent | null;
    if (!content) return { ok: false, error: 'generation_failed' };
    return { ok: true, content };
  } catch {
    return { ok: false, error: 'generation_failed' }; // 게이트웨이/파싱/타임아웃 실패 — 조용한 실패 아님(패널이 재시도 안내)
  }
}
