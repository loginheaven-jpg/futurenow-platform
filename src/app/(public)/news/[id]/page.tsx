// 소식 상세 — 공개(S-4). 초안은 RLS 가 가리므로 비운영자에게는 notFound 로 떨어진다.
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerContext } from '@/core/supabase/server';
import { NewsComments } from './NewsComments';

export const dynamic = 'force-dynamic';

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await createServerContext();
  const post = await ctx.getNews(id).catch(() => null);
  if (!post) notFound();
  const muted = { color: 'var(--color-text-secondary)' } as const;

  // 댓글은 **비로그인도 읽는다**(발주 §5.2) — 로그인 여부는 쓰기와 삭제 버튼만 가른다.
  //   조회 실패는 조용히 빈 목록이다: 댓글이 안 뜨는 것과 소식이 안 열리는 것은 심각도가 다르다.
  const [me, comments] = await Promise.all([
    ctx.currentUser().catch(() => null),
    ctx.listNewsComments(id).catch(() => []),
  ]);
  // 삭제 권한이 미치는 범위는 RPC 가 정한다(본인 · 운영자 · 그 소식 작성자). 화면은 그 셋을 그대로 비춘다.
  const canModerate = !!me && (me.role === 'admin' || (post.authorId !== null && post.authorId === me.id));

  return (
    <div className="pc-shell" style={{ maxWidth: 720 }}>
      <h1 className="t-h1" style={{ color: 'var(--color-primary)' }}>{post.title}</h1>
      <div className="t-caption" style={{ ...muted, marginTop: 'var(--space-2)' }}>
        {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('ko-KR') : '초안 · 아직 공개되지 않았습니다.'}
      </div>
      {/* 본문은 평문이다. 마크다운·HTML 을 넣지 않는다 — 운영자가 붙여 넣은 것이 그대로 렌더되면
          주입 표면이 열린다. 줄바꿈만 살린다. */}
      <div className="t-body" style={{ marginTop: 'var(--space-5)', whiteSpace: 'pre-wrap' }}>{post.body}</div>
      {/* **key 는 피드와 같은 이유다**(실기기 검증 2026-08-27 FAIL 의 부류).
          `/news/1` → `/news/2` 는 같은 자리에 같은 컴포넌트를 다시 그리므로 재마운트되지 않는다.
          `useState(initial)` 은 첫 값만 쓰니 댓글이 옛 글 것을 붙들고, postId prop 은 갱신돼
          **보는 글과 쓰는 글이 어긋난다.** 피드에서 실제로 그렇게 났다 — 같은 부류를 함께 막는다. */}
      <NewsComments key={post.id} postId={post.id} initial={comments} meId={me?.id ?? null} canModerate={canModerate} />
      <p className="t-caption" style={{ ...muted, marginTop: 'var(--space-6)' }}>
        <Link href="/news" style={{ color: 'var(--color-text-secondary)' }}>소식 목록</Link>
      </p>
    </div>
  );
}
