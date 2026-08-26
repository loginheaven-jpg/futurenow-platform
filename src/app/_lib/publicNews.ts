// 현관용 소식 미리보기 — **쿠키 없는 anon 읽기**(ADR-110 `seats.ts` 와 같은 계열).
//
// `createServerSupabase()` 는 `cookies()` 를 읽고 **그 호출이 라우트를 동적으로 만든다.**
//   현관은 로그인이 필요 없으므로 anon 키만으로 충분하고, 그래야 ISR 로 정적 캐시를 지킨다.
//   `/recruit` 의 ISR 구조를 깨지 않는다는 지시가 여기에도 그대로 걸린다.
//
// **조용히 실패한다** — 실패하면 빈 배열이고 화면은 그 구획을 그리지 않는다.
//   소식이 안 뜨는 것과 현관이 안 열리는 것은 심각도가 전혀 다르다(ADR-110 과 같은 판단).
import { createClient } from '@supabase/supabase-js';

export interface NewsPreview {
  id: string;
  title: string;
  publishedAt: string;
}

export async function recentNews(limit = 3): Promise<NewsPreview[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    // anon 이 읽을 수 있는 것은 **발행분뿐이다**(news_posts_select_published). 초안은 정책이 가린다.
    const { data, error } = await sb
      .from('news_posts')
      .select('id,title,published_at')
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data
      .filter((r) => typeof r.published_at === 'string')
      .map((r) => ({ id: r.id as string, title: r.title as string, publishedAt: r.published_at as string }));
  } catch {
    return [];
  }
}
