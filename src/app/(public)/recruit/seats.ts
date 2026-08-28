// 남은 자리 집계 — 서버에서 DB 를 한 번 읽는다(ADR-110 개정 2026-08-24).
//
// 처음에는 `intake.ts` 에 숫자를 손으로 박았다. **틀린 설계였다** — 신청자가 들어올 때마다
//   코드를 고쳐 배포해야 하고, 그러면 숫자가 늘 뒤처진다. 자동이면 그 문제가 사라질 뿐 아니라
//   '숫자가 흔들린다'던 우려도 오히려 해소된다(중복·취소 정리가 다음 갱신에 스스로 반영된다).
//
// 남았던 진짜 제약은 **정적 페이지**였고, 그것은 ISR 로 지킨다 — page.tsx 의 revalidate 참조.
//   CDN 이 계속 캐시를 내주고 주기마다 다시 만든다. 남은 자리 표시에 몇 분의 지연은 문제가 아니다.
//
// 쿠키를 쓰지 않는 클라이언트를 따로 만드는 이유: `createServerSupabase()` 는 `cookies()` 를 읽는데
//   그 호출이 라우트를 **동적으로 만든다.** 이 페이지는 로그인이 필요 없으므로 anon 키만으로 충분하다.
import { createClient } from '@supabase/supabase-js';

/**
 * 그 차수의 신청 확정 인원. 실패하면 **null** 이고 화면은 그 줄을 그리지 않는다.
 *
 * 조용히 실패하는 것이 의도다 — 카운터가 안 되는 것과 모집 페이지가 안 열리는 것은
 * 심각도가 전혀 다르다. 숫자 하나 때문에 첫 접촉을 잃지 않는다.
 */
export async function seatsTaken(code: string): Promise<number | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    // cohort_seats_taken — DEFINER · anon 실행 가능 · 정수 하나만 돌려준다.
    //   집계 규칙(등록 + 사전 체크 완료 + role='user')은 마이그레이션 주석에 있다.
    const { data, error } = await sb.rpc('cohort_seats_taken', { p_code: code });
    if (error || typeof data !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}
