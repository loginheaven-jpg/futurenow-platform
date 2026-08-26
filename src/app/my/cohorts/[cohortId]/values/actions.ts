'use server';
// 가치 카드 서버 액션(ADR-121). **코어 경유** — 쓰기는 전량 DEFINER RPC(value_*). 권한·전이·개수는 RPC 내부.
//   갈무리 `checkin/[session]/actions.ts` 와 같은 형태다. 직접 테이블 접근 0.
import { createServerContext } from '@/core/supabase/server';

type Ok = { ok: boolean; error?: string };

function fail(e: unknown, what: string): Ok {
  return { ok: false, error: e instanceof Error ? e.message : `${what}에 실패했습니다.` };
}

/** 탐색·정리 진행 저장(증분). 화면 이동마다 부른다 — 1차 전체가 통째로 날아가지 않게. */
export async function saveValueProgressAction(
  cohortId: string,
  stage: 'exploring' | 'candidates' | 'finalists',
  progress?: Record<string, unknown>,
  candidates?: number[],
): Promise<Ok> {
  try {
    const ctx = await createServerContext();
    await ctx.saveMyValueProgress({ cohortId, stage, progress, candidates });
    return { ok: true };
  } catch (e) {
    return fail(e, '저장');
  }
}

/** 최종 3개 확정 — 선저장 지점. 이 뒤로 라벨·대조는 증분이다. */
export async function finalizeValueAction(cohortId: string, ids: [number, number, number]): Promise<Ok> {
  try {
    const ctx = await createServerContext();
    await ctx.finalizeMyValue(cohortId, ids);
    return { ok: true };
  } catch (e) {
    return fail(e, '확정');
  }
}

/** 라벨·대조·정합 판정 증분 갱신. 넘기지 않은 값은 서버가 보존한다. */
export async function patchValueAction(
  cohortId: string,
  input: {
    labels?: Partial<{ v1: string; v2: string; v3: string }>;
    workbook?: Partial<{ peak: string; strength: string; longing: string }>;
    alignment?: 'aligned' | 'different' | 'unsure' | 'skipped';
  },
): Promise<Ok> {
  try {
    const ctx = await createServerContext();
    await ctx.patchMyValue({ cohortId, ...input });
    return { ok: true };
  } catch (e) {
    return fail(e, '저장');
  }
}
