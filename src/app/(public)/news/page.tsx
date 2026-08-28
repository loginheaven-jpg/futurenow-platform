// 소식 목록 — 공개(S-4 최소 구현). 발행분만 보인다(RLS). 운영자는 초안도 함께 본다.
import type { Metadata } from 'next';
import Link from 'next/link';
import { createServerContext } from '@/core/supabase/server';

export const metadata: Metadata = { title: '소식' };
export const dynamic = 'force-dynamic';

function fmt(iso: string | null): string {
  if (!iso) return '초안';
  const d = new Date(iso);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

export default async function NewsListPage() {
  const ctx = await createServerContext();
  const posts = await ctx.listNews(30).catch(() => []);
  const muted = { color: 'var(--color-text-secondary)' } as const;

  return (
    <div className="pc-shell">
      <h1 className="t-h1" style={{ color: 'var(--color-primary)' }}>소식</h1>
      {posts.length === 0 ? (
        <p className="t-body" style={{ ...muted, marginTop: 'var(--space-5)' }}>아직 올라온 소식이 없습니다.</p>
      ) : (
        <div className="pc-cards" style={{ marginTop: 'var(--space-5)' }}>
          {posts.map((p) => (
            <Link key={p.id} href={`/news/${p.id}`} className="ui-card ui-tappable" style={{ textDecoration: 'none', padding: 'var(--space-4)' }}>
              <div className="t-body" style={{ fontWeight: 600 }}>{p.title}</div>
              <div className="t-caption" style={{ ...muted, marginTop: 'var(--space-1)' }}>{fmt(p.publishedAt)}</div>
            </Link>
          ))}
        </div>
      )}
      {/* **「처음으로」를 걷었다**(U-4 §5) — 껍데기 로고가 같은 자리를 대신한다.
          목적지가 같고(`/`) **4폭 전부에서 로고가 실제로 보인다**는 실브라우저 실측을 받고 걷었다. */}
    </div>
  );
}
