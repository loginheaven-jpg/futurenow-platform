'use client';
// 동행 피드 본체(2차 · ADR-124).
//
// **마찰이 카톡 수준이어야 한다**(발주 §3.1) — 열자마자 입력창, 사진 한 번, 게시 한 번.
//   제목·분류·태그가 없고(DB 에 컬럼조차 없다), 게시 후 화면이 이동하지 않는다.
//
// **판정하지 않는다**(발주 §3.2 · 불변식 9·11) — 연속 기록 배지 · 참여율 · 순위 ·
//   미게시 표시 · 좋아요 수 정렬 · "오늘 아직 안 올리셨어요" 알림이 여기 하나도 없다.
//   반응 수는 보이되 그것으로 줄을 세우지 않는다.
//
// **design_system 부품 부재**(불변식 20) — 피드 입력창·아이템·이모지 바·댓글·날짜 구분선이
//   모두 v4 미도착이다. 기능 골격만 세우고 스타일은 기존 토큰으로만 최소 적용한다.
import { applyReaction } from './reactionState';
import { useMemo, useState, useTransition, type CSSProperties } from 'react';
import Link from 'next/link';
import { Button } from '@/core/ui';
import { createBrowserSupabase } from '@/core/supabase/client';
import { FEED_EMOJI, type FeedComment, type FeedCohortRef, type FeedEmoji, type FeedPost } from '@/contracts/domain';
import { resizeToJpeg } from '@/app/_lib/resizeImage';
import {
  createFeedCommentAction,
  createFeedPostAction,
  deleteFeedCommentAction,
  deleteFeedPostAction,
  listFeedCommentsAction,
  loadFeedAction,
  reactFeedAction,
  signFeedPhotosAction,
} from './actions';

const BUCKET = 'feed-photos';

const boxStyle: CSSProperties = {
  border: 'var(--border-hair) solid var(--color-border)',
  borderRadius: 'var(--radius)',
  background: 'var(--color-surface-2)',
  color: 'var(--color-text)',
  font: 'inherit',
  fontSize: 15,
  width: '100%',
  padding: 'var(--space-3)',
};
const muted: CSSProperties = { color: 'var(--color-text-secondary)' };

// 날짜·시각은 **KST 로 고정한다** — DB 의 feed_flow 도 같은 시간대를 쓴다(membership_today 관용구).
const dayFmt = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short' });
const timeFmt = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false });
const dayKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });

export function FeedClient({
  meId,
  isCoach,
  cohorts,
  selectedCohortId,
  initialPosts,
  initialPhotoUrls,
}: {
  meId: string;
  isCoach: boolean;
  cohorts: FeedCohortRef[];
  selectedCohortId: string;
  initialPosts: FeedPost[];
  initialPhotoUrls: Record<string, string>;
}) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>(initialPhotoUrls);
  const [body, setBody] = useState('');
  const [photo, setPhoto] = useState<{ path: string; preview: string } | null>(null);
  const [mine, setMine] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false); // 더 보기가 바닥에 닿았는가
  const [pending, startTx] = useTransition();

  const canPost = !busy && !pending && (body.trim().length > 0 || photo !== null);
  const selectedName = cohorts.find((c) => c.cohortId === selectedCohortId)?.name ?? null;

  /** 목록을 갈아끼울 때 사진 URL 도 함께 받는다(목록에 미리 싣지 않으므로). */
  async function adoptPhotoUrls(next: FeedPost[]): Promise<void> {
    const missing = next
      .map((p) => p.photoPath)
      .filter((p): p is string => !!p && !photoUrls[p]);
    if (missing.length === 0) return;
    const got = await signFeedPhotosAction(missing);
    setPhotoUrls((prev) => ({ ...prev, ...got }));
  }

  async function onPickPhoto(file: File): Promise<void> {
    setErr(null);
    setBusy(true);
    try {
      // **클라이언트 리사이즈는 타협 대상이 아니다** — 폰 원본 5~12MB 는 3 MiB 상한에 그대로 걸린다.
      const blob = await resizeToJpeg(file);
      const path = `${selectedCohortId}/${meId}/${crypto.randomUUID()}.jpg`;
      const sb = createBrowserSupabase();
      const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
      if (error) {
        setErr('사진을 올리지 못했어요. 다시 시도해 주세요.');
        return;
      }
      setPhoto({ path, preview: URL.createObjectURL(blob) });
    } catch {
      setErr('jpg·png 사진으로 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  function submit(): void {
    if (!canPost) return;
    setErr(null);
    startTx(async () => {
      const res = await createFeedPostAction({
        cohortId: selectedCohortId,
        body,
        photoPath: photo?.path ?? null,
      });
      if (!res.ok) {
        // 보류 계정도 여기서 **사실 문장**을 받는다 — 입력창을 감추지 않는다(발주 §9.1).
        setErr(res.error);
        return;
      }
      setBody('');
      setPhoto(null);
      setDone(false);
      setPosts(res.value);
      await adoptPhotoUrls(res.value);
    });
  }

  function reload(nextMine: boolean): void {
    startTx(async () => {
      const res = await loadFeedAction({ cohortId: selectedCohortId, mine: nextMine });
      if (!res.ok) { setErr(res.error); return; }
      setMine(nextMine);
      setDone(false);
      setPosts(res.value);
      await adoptPhotoUrls(res.value);
    });
  }

  function loadMore(): void {
    const last = posts[posts.length - 1];
    if (!last) return;
    startTx(async () => {
      const res = await loadFeedAction({
        cohortId: selectedCohortId,
        before: { createdAt: last.createdAt, id: last.id },
        mine,
      });
      if (!res.ok) { setErr(res.error); return; }
      if (res.value.length === 0) { setDone(true); return; }
      setPosts((prev) => [...prev, ...res.value]);
      await adoptPhotoUrls(res.value);
    });
  }

  function removePost(p: FeedPost): void {
    startTx(async () => {
      const res = await deleteFeedPostAction({ postId: p.id, photoPath: p.photoPath, cohortId: selectedCohortId });
      if (!res.ok) { setErr(res.error); return; }
      setPosts(res.value);
    });
  }

  // 5차 소건 2 — **토글**이다. 서버가 돌려준 "남은 내 반응 전부"를 진실로 삼고,
  //   집계 이동은 순수 함수(`applyReaction`)가 한다.
  function react(p: FeedPost, emoji: FeedEmoji): void {
    startTx(async () => {
      const res = await reactFeedAction(p.id, emoji);
      if (!res.ok) { setErr(res.error); return; }
      setPosts((prev) =>
        prev.map((x) =>
          x.id === p.id
            ? { ...x, myReactions: res.value, reactions: applyReaction(x.reactions, x.myReactions, res.value) }
            : x,
        ),
      );
    });
  }

  // 날짜 구분선 — 오늘이 위. 그룹은 렌더 시 계산한다(파생 상태를 저장하지 않는다).
  const groups = useMemo(() => {
    const out: { key: string; label: string; items: FeedPost[] }[] = [];
    for (const p of posts) {
      const d = new Date(p.createdAt);
      const key = dayKeyFmt.format(d);
      const tail = out[out.length - 1];
      if (tail && tail.key === key) tail.items.push(p);
      else out.push({ key, label: dayFmt.format(d), items: [p] });
    }
    return out;
  }, [posts]);

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)', marginTop: 'var(--space-4)' }}>
      {/* 기수 전환 — **여럿일 때만 노출한다**(발주 §6.1). 하나뿐이면 고를 것이 없다.
          **실기기 2차 지적(2026-08-27): "클릭 자체가 안 된다."** 마크업은 정상 `<a href>` 였고
          덮개도 pointer-events 도 없었다. 원인은 **화면이 아무 답도 하지 않은 것**이다 —
          내가 선택 배경으로 쓴 `--color-surface-2` 가 `--gray-0`, 즉 **페이지 배경과 같은 색**이라
          선택 표시가 보이지 않았고, 양쪽 기수 모두 글이 0건이라 목록도 똑같았다.
          전환이 실제로 일어나도 화면은 한 픽셀도 바뀌지 않는다 — 죽은 클릭과 구분할 방법이 없다.

          그래서 인라인 칩을 버리고 **design_system 의 기존 부품**(`ui-btn`)을 쓴다.
          `cursor: pointer`·탭 최소 높이·focus 링이 이미 들어 있고, primary(네이비 면)와
          ghost(테두리)가 선택 상태를 색이 아니라 **면과 테두리의 차이**로 가른다.
          부품을 새로 만들지 않는 편이 불변식 20 에도 맞다 — 내가 만든 칩이 애초에 임의 디자인이었다. */}
      {cohorts.length > 1 ? (
        <nav aria-label="기수 선택" style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {cohorts.map((c) => {
            const on = c.cohortId === selectedCohortId;
            return (
              <Link
                key={c.cohortId}
                href={`/feed?cohort=${c.cohortId}`}
                aria-current={on ? 'page' : undefined}
                className={`ui-btn ${on ? 'ui-btn--primary' : 'ui-btn--ghost'}`}
                style={{ textDecoration: 'none' }}
              >
                {c.name}
              </Link>
            );
          })}
        </nav>
      ) : null}

      {/* 입력창은 맨 위에 상시 노출. 접혀 있지 않다(발주 §6.1). */}
      <section style={{ display: 'grid', gap: 'var(--space-3)' }}>
        <textarea
          className="ui-textarea"
          style={{ ...boxStyle, minHeight: 84 }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          placeholder="오늘의 걸음을 한 줄로 남겨 주세요"
        />
        {photo ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.preview} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 'var(--radius)' }} />
            <button type="button" className="t-caption" style={{ ...muted, background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => setPhoto(null)}>
              사진 빼기
            </button>
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <label className="t-caption" style={{ ...muted, cursor: 'pointer' }}>
            사진 한 장
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void onPickPhoto(f);
              }}
            />
          </label>
          <div style={{ marginLeft: 'auto' }}>
            <Button type="button" onClick={submit} disabled={!canPost}>
              {pending || busy ? '올리는 중…' : '올리기'}
            </Button>
          </div>
        </div>
        {err ? <p className="t-caption" style={muted}>{err} {err.includes('계정 확인') ? <Link href="/contact">문의하기</Link> : null}</p> : null}
      </section>

      {/* "내 걸음만" — 6주 뒤 자기 궤적을 보는 자리다(발주 §6.1). */}
      <div className="t-caption" style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <button type="button" onClick={() => reload(false)} disabled={pending} aria-pressed={!mine}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: mine ? 'var(--color-text-secondary)' : 'var(--color-text)', padding: 0 }}>
          모두
        </button>
        <button type="button" onClick={() => reload(true)} disabled={pending} aria-pressed={mine}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: mine ? 'var(--color-text)' : 'var(--color-text-secondary)', padding: 0 }}>
          내 걸음만
        </button>
      </div>

      {posts.length === 0 ? (
        // 빈 상태는 **문안으로** 답한다. 시스템이 안내 글을 대신 써 넣지 않는다(발주 §9-3) —
        //   첫 글은 사람이 쓴다.
        //
        // **기수 이름을 문장에 넣는다**(실기기 2차 지적). 글이 0건이면 어느 기수를 보든 목록이
        //   똑같아서, 전환이 됐는지 화면이 말해 주지 않았다. 이름이 있으면 빈 화면조차 답을 한다.
        //   기수가 하나뿐이면 고를 것이 없으므로 이름을 붙이지 않는다(없는 선택을 암시하지 않는다).
        <p className="t-caption" style={muted}>
          {cohorts.length > 1 && selectedName ? `${selectedName}에는 ` : ''}아직 아무도 남기지 않았어요. 오늘의 첫 걸음을 남겨 보세요.
        </p>
      ) : null}

      {groups.map((g) => (
        <section key={g.key} style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <div className="t-caption" style={{ ...muted, borderTop: 'var(--border-hair) solid var(--color-border)', paddingTop: 'var(--space-2)' }}>
            {g.label}
          </div>
          {g.items.map((p) => (
            <FeedItem
              key={p.id}
              post={p}
              meId={meId}
              isCoach={isCoach}
              photoUrl={p.photoPath ? photoUrls[p.photoPath] : undefined}
              onDelete={() => removePost(p)}
              onReact={(e) => react(p, e)}
              disabled={pending}
            />
          ))}
        </section>
      ))}

      {/* 페이지네이션은 더 보기 버튼. **무한 스크롤 금지**(발주 §7-7) —
          자기 기록을 찾아 올라가기 어려워진다. */}
      {posts.length > 0 && !done ? (
        <Button type="button" variant="ghost" onClick={loadMore} disabled={pending}>
          {pending ? '불러오는 중…' : '더 보기'}
        </Button>
      ) : null}
      {done ? <p className="t-caption" style={muted}>여기까지예요.</p> : null}
    </div>
  );
}

function FeedItem({
  post,
  meId,
  isCoach,
  photoUrl,
  onDelete,
  onReact,
  disabled,
}: {
  post: FeedPost;
  meId: string;
  isCoach: boolean;
  photoUrl?: string;
  onDelete: () => void;
  onReact: (e: FeedEmoji) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<FeedComment[] | null>(null);
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTx] = useTransition();

  // 묘비 — 본문·작성자가 비어 있다. 댓글 맥락만 남기고 지워진 것은 지워진 것이다(발주 §5.3).
  if (post.deleted) {
    return (
      <article className="ui-card" style={{ padding: 'var(--space-4)' }}>
        <p className="t-caption" style={muted}>지워진 글이에요.</p>
        <CommentToggle
          open={open}
          setOpen={setOpen}
          count={post.commentCount}
          comments={comments}
          setComments={setComments}
          postId={post.id}
          meId={meId}
          isCoach={isCoach}
          draft={draft}
          setDraft={setDraft}
          err={err}
          setErr={setErr}
          pending={pending}
          startTx={startTx}
          canWrite={false}
        />
      </article>
    );
  }

  return (
    <article className="ui-card" style={{ padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-3)' }}>
      <header className="t-caption" style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'baseline' }}>
        <strong style={{ fontWeight: 600 }}>{post.authorName ?? '이름 없음'}</strong>
        <span style={muted}>{timeFmt.format(new Date(post.createdAt))}</span>
        {post.authorId === meId || isCoach ? (
          <button type="button" onClick={onDelete} disabled={disabled}
            style={{ ...muted, marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>
            지우기
          </button>
        ) : null}
      </header>

      {post.body ? <p className="t-body" style={{ whiteSpace: 'pre-wrap' }}>{post.body}</p> : null}

      {post.photoPath ? (
        photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" style={{ width: '100%', borderRadius: 'var(--radius)' }} />
        ) : (
          <p className="t-caption" style={muted}>사진을 불러오는 중…</p>
        )
      ) : null}

      {/* 이모지 넷. 수는 보이되 **정렬에 쓰지 않는다**(발주 §3.2 · 불변식 11).
          **5차 소건 2 — 복수 선택이다**(박수와 기도를 함께). 여럿을 켤 수 있게 되면서
          합계가 커지지만 **순위는 여전히 만들지 않는다** — 막대·게이지·백분위·정렬키가 없고
          이 줄의 순서는 언제나 `FEED_EMOJI` 선언 순서다(수가 아니라 선언이 순서를 정한다). */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        {FEED_EMOJI.map((e) => {
          const n = post.reactions[e] ?? 0;
          const isMine = post.myReactions.includes(e);
          return (
            <button key={e} type="button" onClick={() => onReact(e)} disabled={disabled} className="t-caption"
              // 여럿을 켜고 끄는 버튼이므로 **눌린 상태를 색만으로 말하지 않는다**(§9.7 칩과 같은 규율).
              aria-pressed={isMine}
              style={{
                padding: 'var(--space-1) var(--space-2)', borderRadius: 'var(--radius)', cursor: 'pointer',
                border: `var(--border-hair) solid ${isMine ? 'var(--color-text-secondary)' : 'var(--color-border)'}`,
                background: isMine ? 'var(--color-surface-2)' : 'transparent',
              }}>
              {e}{n > 0 ? ` ${n}` : ''}
            </button>
          );
        })}
      </div>

      <CommentToggle
        open={open} setOpen={setOpen} count={post.commentCount}
        comments={comments} setComments={setComments} postId={post.id}
        meId={meId} isCoach={isCoach} draft={draft} setDraft={setDraft}
        err={err} setErr={setErr} pending={pending} startTx={startTx} canWrite
      />
    </article>
  );
}

/** 댓글은 **1단**이다(발주 §3.4) — 대댓글 입력이 없고 DB 에 부모 컬럼도 없다. */
function CommentToggle(props: {
  open: boolean; setOpen: (v: boolean) => void; count: number;
  comments: FeedComment[] | null; setComments: (v: FeedComment[]) => void;
  postId: string; meId: string; isCoach: boolean;
  draft: string; setDraft: (v: string) => void;
  err: string | null; setErr: (v: string | null) => void;
  pending: boolean; startTx: (fn: () => void) => void; canWrite: boolean;
}) {
  const { open, setOpen, count, comments, setComments, postId, meId, isCoach, draft, setDraft, err, setErr, pending, startTx, canWrite } = props;

  function toggle(): void {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (comments) return;
    startTx(async () => {
      const res = await listFeedCommentsAction(postId);
      if (res.ok) setComments(res.value);
      else setErr(res.error);
    });
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
      <button type="button" onClick={toggle} className="t-caption"
        style={{ ...muted, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
        댓글 {count > 0 ? count : ''}
      </button>
      {open ? (
        <div style={{ display: 'grid', gap: 'var(--space-2)', paddingLeft: 'var(--space-3)' }}>
          {(comments ?? []).map((c) => (
            <div key={c.id} className="t-caption" style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <strong style={{ fontWeight: 600 }}>{c.authorName ?? '이름 없음'}</strong>
              <span style={{ whiteSpace: 'pre-wrap' }}>{c.body}</span>
              {c.authorId === meId || isCoach ? (
                <button type="button" style={{ ...muted, marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}
                  disabled={pending}
                  onClick={() => startTx(async () => {
                    const res = await deleteFeedCommentAction(c.id, postId);
                    if (res.ok) setComments(res.value); else setErr(res.error);
                  })}>
                  지우기
                </button>
              ) : null}
            </div>
          ))}
          {canWrite ? (
            <form style={{ display: 'flex', gap: 'var(--space-2)' }}
              onSubmit={(e) => {
                e.preventDefault();
                if (pending || draft.trim().length === 0) return;
                setErr(null);
                startTx(async () => {
                  const res = await createFeedCommentAction(postId, draft);
                  if (res.ok) { setComments(res.value); setDraft(''); } else setErr(res.error);
                });
              }}>
              <input style={{ ...boxStyle, padding: 'var(--space-2) var(--space-3)' }} value={draft}
                onChange={(e) => setDraft(e.target.value)} maxLength={1000} placeholder="한마디" />
              <Button type="submit" variant="ghost" disabled={pending || draft.trim().length === 0}>남기기</Button>
            </form>
          ) : null}
          {err ? <p className="t-caption" style={muted}>{err}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
