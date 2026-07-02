'use server';
// 차수 개설 서버 액션 — 코어 createCohort(코드 생성·재시도). instrumentId 는 현재 futurenow 단일.
import { createServerContext } from '@/core/supabase/server';

export async function createCohortAction(input: {
  name: string;
  maxMembers: number;
  description?: string;
}): Promise<{ code?: string; error?: string }> {
  try {
    const ctx = await createServerContext();
    const cohort = await ctx.createCohort({
      name: input.name,
      instrumentId: 'futurenow',
      maxMembers: input.maxMembers,
      description: input.description,
    });
    return { code: cohort.code };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '차수 생성에 실패했습니다.' };
  }
}
