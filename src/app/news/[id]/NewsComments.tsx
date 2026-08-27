'use client';
// 소식 댓글(2차 · ADR-124 · 발주 §5.2).
//
// **비로그인도 읽는다. 쓰기만 로그인이다.** 그래서 입력창 자리에 로그인 안내를 두고
//   목록은 누구에게나 그대로 보인다 — 막다른 골목을 만들지 않는다(IA §5.6 과 같은 결).
//
// 소식은 공지라 대화가 깊어질 자리가 아니다. 피드와 같은 이유로 **1단**이다(발주 §3.4).
import { useState, useTransition, type CSSProperties } from 'react';
import Link from 'next/link';
import { Button } from '@/core/ui';
import type { NewsComment } from '@/contracts/domain';
import { createNewsCommentAction, deleteNewsCommentAction } from './actions';

const muted: CSSProperties = { color: 'var(--color-text-secondary)' };
const boxStyle: CSSProperties = {
  border: 'var(--border-hair) solid var(--color-border)',
  borderRadius: 'var(--radius)',
  background: 'var(--color-surface-2)',
  color: 'var(--color-text)',
  font: 'inherit',
  fontSize: 15,
  width: '100%',
  padding: 'var(--space-2) var(--space-3)',
};

export function NewsComments({
  postId,
  initial,
  meId,
  canModerate,
}: {
  postId: string;
  initial: NewsComment[];
  meId: string | null;
  canModerate: boolean; // 운영자이거나 그 소식의 작성자(발주 §9-4)
}) {
  const [comments, setComments] = useState<NewsComment[]>(initial);
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTx] = useTransition();

  return (
    <section style={{ marginTop: 'var(--space-6)', display: 'grid', gap: 'var(--space-3)' }}>
      <h2 className="t-caption" style={muted}>댓글 {comments.length > 0 ? comments.length : ''}</h2>

      {comments.length === 0 ? (
        <p className="t-caption" style={muted}>아직 댓글이 없어요.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--space-3)' }}>
          {comments.map((c) => (
            <li key={c.id} className="t-body" style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'baseline' }}>
              <strong className="t-caption" style={{ fontWeight: 600 }}>{c.authorName ?? '이름 없음'}</strong>
              <span style={{ whiteSpace: 'pre-wrap' }}>{c.body}</span>
              {c.authorId === meId || canModerate ? (
                <button
                  type="button"
                  className="t-caption"
                  style={{ ...muted, marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}
                  disabled={pending}
                  onClick={() =>
                    startTx(async () => {
                      const res = await deleteNewsCommentAction(c.id, postId);
                      if (res.ok) setComments(res.value);
                      else setErr(res.error);
                    })
                  }
                >
                  지우기
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {meId ? (
        <form
          style={{ display: 'flex', gap: 'var(--space-2)' }}
          onSubmit={(e) => {
            e.preventDefault();
            if (pending || draft.trim().length === 0) return;
            setErr(null);
            startTx(async () => {
              const res = await createNewsCommentAction(postId, draft);
              if (res.ok) { setComments(res.value); setDraft(''); }
              else setErr(res.error);
            });
          }}
        >
          <input style={boxStyle} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000} placeholder="한마디 남기기" />
          <Button type="submit" variant="ghost" disabled={pending || draft.trim().length === 0}>남기기</Button>
        </form>
      ) : (
        <p className="t-caption" style={muted}>
          <Link href={`/login?returnTo=/news`}>로그인</Link>하면 댓글을 남길 수 있어요.
        </p>
      )}
      {err ? <p className="t-caption" style={muted}>{err}</p> : null}
    </section>
  );
}
