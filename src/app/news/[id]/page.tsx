// 소식 상세 — 공개(S-4). 초안은 RLS 가 가리므로 비운영자에게는 notFound 로 떨어진다.
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerContext } from '@/core/supabase/server';

export const dynamic = 'force-dynamic';

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await createServerContext();
  const post = await ctx.getNews(id).catch(() => null);
  if (!post) notFound();
  const muted = { color: 'var(--color-text-secondary)' } as const;

  return (
    <div className="pc-shell" style={{ maxWidth: 720 }}>
      <h1 className="t-h1" style={{ color: 'var(--color-primary)' }}>{post.title}</h1>
      <div className="t-caption" style={{ ...muted, marginTop: 'var(--space-2)' }}>
        {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('ko-KR') : '초안 — 아직 공개되지 않았습니다.'}
      </div>
      {/* 본문은 평문이다. 마크다운·HTML 을 넣지 않는다 — 운영자가 붙여 넣은 것이 그대로 렌더되면
          주입 표면이 열린다. 줄바꿈만 살린다. */}
      <div className="t-body" style={{ marginTop: 'var(--space-5)', whiteSpace: 'pre-wrap' }}>{post.body}</div>
      <p className="t-caption" style={{ ...muted, marginTop: 'var(--space-6)' }}>
        <Link href="/news" style={{ color: 'var(--color-text-secondary)' }}>소식 목록</Link>
      </p>
    </div>
  );
}
