'use client';
// 자료 화면의 반응 · 댓글 · 신고 (서가 B · 최박사 결재 아홉).
//
// **design_system 부품 부재**(불변식 20) — 이모지 바·댓글 줄·신고 칸은 확정 부품이 없다.
//   피드(`FeedClient`)가 같은 자리에서 쓰는 **기존 관용구를 그대로 차용**했다. 새로 디자인하지 않았다.
//
// ★ **순위를 만들지 않는다**(불변식 11 · 발주 §0-2). 반응 수는 **보이되**
//   정렬키·막대·색·백분위 어디에도 쓰지 않는다. 서가는 피드보다 이 위험이 크다 —
//   **피드 글은 흘러가지만 서가 자료는 목록에 남고**, 참여자도 올린다.
//
// ★ **이름을 여기서 가리지 않는다.** 서버가 이미 가려서 보낸다(결재 ⑶⑷) —
//   가리는 자리는 DB 함수 하나뿐이고, 그래야 한쪽만 고쳐지지 않는다.
//
// **문안은 전부 결재분이다**(`copy.ts` `B_COPY`). 여기에 문장을 적지 않는다.
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { LibraryComment } from '@/contracts/domain';
import { FEED_EMOJI } from '@/contracts/domain';
import { B_COPY } from '../copy';
import {
  toggleLibraryReactionAction,
  createLibraryCommentAction,
  deleteLibraryCommentAction,
  reportLibraryItemAction,
} from '../actions';

const muted = { color: 'var(--color-text-secondary)' } as const;

export function ItemSocial({
  itemId, signedIn, initialComments, initialReactions, initialMine, alreadyReported,
}: {
  itemId: string;
  signedIn: boolean;
  initialComments: LibraryComment[];
  initialReactions: Record<string, number>;
  initialMine: string[];
  alreadyReported: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [counts, setCounts] = useState(initialReactions);
  const [mine, setMine] = useState<string[]>(initialMine);
  const [comments, setComments] = useState(initialComments);
  const [draft, setDraft] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportBody, setReportBody] = useState('');
  const [reported, setReported] = useState(alreadyReported);

  function onReact(emoji: string) {
    if (!signedIn || pending) return;
    start(async () => {
      const r = await toggleLibraryReactionAction(itemId, emoji);
      if (!r.ok) return;
      setMine(r.mine);
      // 집계는 화면에서 셈한다 — 서버 왕복을 한 번 더 하지 않는다.
      setCounts((c) => {
        const had = mine.includes(emoji);
        const n = (c[emoji] ?? 0) + (had ? -1 : 1);
        const next = { ...c };
        if (n <= 0) delete next[emoji]; else next[emoji] = n;
        return next;
      });
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || pending) return;
    start(async () => {
      const r = await createLibraryCommentAction(itemId, body);
      if (!r.ok) return;
      setDraft('');
      router.refresh(); // **「보냈다」가 아니라 「화면에 나타났다」가 성공이다**(ADR-164 교훈)
    });
  }

  function onDelete(id: string) {
    if (pending) return;
    if (!window.confirm(B_COPY.commentDeleteConfirm)) return;
    start(async () => {
      const r = await deleteLibraryCommentAction(id);
      if (!r.ok) return;
      setComments((cs) => cs.filter((c) => c.id !== id));
    });
  }

  function onReport(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    start(async () => {
      const r = await reportLibraryItemAction(itemId, reportBody.trim() || null);
      if (!r.ok) return;
      setReported(true);
      setReportOpen(false);
      setReportBody('');
    });
  }

  return (
    <section style={{ display: 'grid', gap: 'var(--space-5)', marginTop: 'var(--space-5)' }}>
      {/* ── 반응. 수는 보이되 **정렬에 쓰지 않는다**(불변식 11). */}
      <div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {FEED_EMOJI.map((e) => {
            const n = counts[e] ?? 0;
            const on = mine.includes(e);
            return (
              <button
                key={e} type="button" onClick={() => onReact(e)}
                disabled={!signedIn || pending}
                aria-pressed={on}
                className="ui-tappable"
                style={{
                  border: 'var(--border-hair) solid var(--color-border)',
                  borderRadius: 'var(--radius)', padding: 'var(--space-1) var(--space-3)',
                  background: on ? 'var(--color-surface-2)' : 'transparent',
                  fontWeight: on ? 600 : 400,
                  cursor: signedIn ? 'pointer' : 'default',
                }}
              >
                {e}{n > 0 ? ` ${n}` : ''}
              </button>
            );
          })}
        </div>
        {signedIn ? null : (
          <p className="t-caption" style={{ ...muted, marginTop: 'var(--space-2)' }}>{B_COPY.reactLocked}</p>
        )}
      </div>

      {/* ── 댓글 */}
      <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
        {/* 밖에서 볼 때만 왜 별표인지 말한다 — 말하지 않으면 깨진 화면으로 읽힌다. */}
        {!signedIn && comments.length > 0 ? (
          <p className="t-caption" style={muted}>{B_COPY.maskedNote}</p>
        ) : null}

        {comments.length === 0 ? (
          <p className="t-caption" style={muted}>{B_COPY.commentEmpty}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--space-3)' }}>
            {comments.map((c) => (
              <li key={c.id}>
                <div className="t-caption" style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'baseline' }}>
                  {/* **이미 가려진 이름을 그대로 그린다.** 화면이 가리지 않는다. */}
                  <strong style={{ fontWeight: 600 }}>{c.authorName ?? '이름 없음'}</strong>
                  {c.mine ? (
                    <button type="button" onClick={() => onDelete(c.id)} disabled={pending}
                      style={{ ...muted, background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>
                      지우기
                    </button>
                  ) : null}
                </div>
                <p className="t-body" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{c.body}</p>
              </li>
            ))}
          </ul>
        )}

        {signedIn ? (
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 'var(--space-2)' }}>
            <textarea
              className="ui-input" rows={2} value={draft} onChange={(ev) => setDraft(ev.target.value)}
              placeholder={B_COPY.commentPlaceholder} disabled={pending}
            />
            <button type="submit" className="ui-btn" disabled={pending || draft.trim() === ''}>남기기</button>
          </form>
        ) : null}
      </div>

      {/* ── 신고. **운영자에게만 간다**(결재 ⑺) — 문장이 그것을 말한다. */}
      {signedIn ? (
        <div>
          {reported ? (
            <p className="t-caption" style={muted}>{B_COPY.reportAlready}</p>
          ) : reportOpen ? (
            <form onSubmit={onReport} style={{ display: 'grid', gap: 'var(--space-2)' }}>
              <p className="t-caption" style={muted}>{B_COPY.reportPrompt}</p>
              <textarea className="ui-input" rows={2} value={reportBody}
                onChange={(ev) => setReportBody(ev.target.value)} disabled={pending} />
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button type="submit" className="ui-btn" disabled={pending}>보내기</button>
                <button type="button" className="ui-btn" onClick={() => setReportOpen(false)} disabled={pending}>
                  그만두기
                </button>
              </div>
            </form>
          ) : (
            <button type="button" className="ui-btn" onClick={() => setReportOpen(true)} disabled={pending}
              style={muted}>
              {B_COPY.reportButton}
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
