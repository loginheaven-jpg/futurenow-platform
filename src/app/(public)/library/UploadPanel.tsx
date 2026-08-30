'use client';
// 자료 올리기 — **확정 문안 셋이 사는 자리**(§1). 문안은 `copy.ts` 에서만 온다.
//
// **꺼진 구획을 감추지 않는다.** 자격이 없으면 **왜 없는지**를 확정 문안으로 적고 폼을 잠근다 —
//   감추면 «올릴 수 있는 자리가 있는지» 조차 모른다(5-3 의 «막혀도 감추지 않고 비활성 + 사유» 와 같은 규율).
//
// **자격 판정을 화면이 하지 않는다**(§3 하지 말 것 3). 서버가 낸 `canUpload` 를 그대로 쓴다 —
//   등급 이름을 화면이 비교하기 시작하면 판정이 두 곳이 된다.
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LIBRARY_NAME, LIBRARY_TIER_LABEL, LIBRARY_MAX_MB } from '@/app/_vocab/library';
import { UPLOAD_CONSENT, UPLOAD_CLOSED, LINK_NOTE, UPLOAD_TOO_LARGE, TIER_NOTE } from './copy';
import { createBrowserSupabase } from '@/core/supabase/client';
import { addLibraryItemAction, fetchLinkTitleAction } from './actions';

const muted = { color: 'var(--color-text-secondary)' } as const;
const box = {
  border: 'var(--border-hair) solid var(--color-border)',
  borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)',
  background: 'var(--color-surface-1)',
} as const;

export function UploadPanel({
  canUpload, cohorts,
}: { canUpload: boolean; cohorts: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<'file' | 'link'>('file');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tier, setTier] = useState<'public' | 'forum' | 'coach'>('forum');
  const [cohortId, setCohortId] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);

  /**
   * 제목 자동 입력 — **입력 중이 아니라 blur 에서 한 번**(설계서에 없는 새 기능 · ② 요청).
   *
   * ★ **U-4 를 되풀이하지 않는다.** 그때 `/join` 이 **초당 37회** 재호출됐고 정적 잠금은
   *   전부 초록이었다 — 재호출은 **런타임 행동**이라 아무도 재지 않았기 때문이다(⑨-c).
   *   그래서 여기서는 셋을 건다: ⑴ `onChange` 가 아니라 **`onBlur`** ⑵ **같은 주소는 다시 묻지 않는다**
   *   ⑶ 이미 친 제목은 **덮어쓰지 않는다.**
   *
   * ★ **막지 않는다.** 실패·시간초과여도 제목 칸은 손으로 칠 수 있는 채로 남고
   *   올리기 단추도 잠기지 않는다. 자동 입력은 **거드는 것이지 전제가 아니다.**
   */
  const askedFor = useRef<string | null>(null);
  async function fillTitle(raw: string) {
    const v = raw.trim();
    if (!v) return;
    if (askedFor.current === v) return;   // ⑵ 같은 주소를 다시 묻지 않는다
    askedFor.current = v;
    if (title.trim()) return;             // ⑶ 사람이 쓴 것을 덮지 않는다
    const r = await fetchLinkTitleAction(v);
    // 기다리는 동안 사람이 쳤을 수 있다 — 그 사이에 생긴 값도 덮지 않는다.
    if (r.ok) setTitle((cur) => (cur.trim() ? cur : r.title));
  }
  const [pending, startTx] = useTransition();
  const router = useRouter();

  if (!canUpload) {
    return (
      <section style={{ ...box, marginTop: 'var(--space-4)' }}>
        {/* **확정 문안이다. 고치지 않는다.** */}
        <p className="t-caption" style={muted}>{UPLOAD_CLOSED}</p>
      </section>
    );
  }

  const ready = title.trim().length > 0 && (kind === 'link' ? url.trim().length > 0 : file !== null);

  function submit() {
    if (pending || !ready) return;
    setErr(null);
    startTx(async () => {
      let storagePath: string | null = null;
      if (kind === 'file' && file) {
        // ★★ **파일은 브라우저에서 저장소로 곧장 간다** — 서버 액션을 지나지 않는다(실측 2026-08-29).
        //   지나게 했더니 **`Body exceeded 1 MB limit`** 로 터졌다(서버 액션 기본 본문 상한 1MB).
        //   1MB 짜리도 실패했고 화면에는 우리 문안이 아니라 **「잠시 문제가 생겼어요」** 크래시 화면이 떴다.
        //   **이것은 새 방식이 아니라 이 저장소의 관용구다** — 피드 사진(`FeedClient`)과
        //   갈무리 사진(`LetterPhotos`)이 이미 같은 길로 올린다. 부품을 두 벌 만들지 않는다.
        //   **관문은 그대로다** — 저장소 정책 `library_objects_insert_v2` 가
        //   «자기 폴더인가 + 올릴 자격이 있는가» 를 여기서도 똑같이 본다(판정은 한 곳이다).
        const sb = createBrowserSupabase();
        const { data: u } = await sb.auth.getUser();
        if (!u.user) { setErr('로그인이 필요합니다.'); return; }
        const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')).slice(0, 10) : '';
        const path = `${u.user.id}/${crypto.randomUUID()}${ext}`;
        const { error } = await sb.storage.from('library').upload(path, file, { upsert: false });
        // **「잠시 뒤 다시 시도해 주세요」를 걷었다**(최박사 지시) — 기다려도 안 되는 것을
        //   기다리라고 하는 말이었다. 크기는 위에서 이미 걸러지므로 여기 남는 것은 자격·연결이고,
        //   그 자리에는 **등록 실패와 같은 말**을 쓴다(새 문장을 짓지 않는다).
        if (error) { setErr('지금은 올릴 수 없습니다. 자격을 확인해 주세요.'); return; }
        storagePath = path;
      }
      const res = await addLibraryItemAction({
        title: title.trim(),
        description: description.trim() || null,
        tier, cohortId: cohortId || null, kind,
        storagePath, url: kind === 'link' ? url.trim() : null,
      });
      if (!res.ok) { setErr(res.error); return; }
      setTitle(''); setDescription(''); setUrl(''); setFile(null); setOpen(false);
      // ★ **올린 것이 화면에 나타나야 올린 것이다**(실측 2026-08-29 · 탐침이 잡았다).
      //   목록은 서버 컴포넌트가 그리므로 이 한 줄이 없으면 **올라갔는데 안 보인다** —
      //   올린 사람은 실패했다고 읽고 또 올린다. 자료 6개가 실제로 그렇게 쌓였다(검증 중).
      router.refresh();
    });
  }

  return (
    <section style={{ ...box, marginTop: 'var(--space-4)' }}>
      {!open ? (
        <button type="button" className="ui-btn ui-btn--ghost" onClick={() => setOpen(true)}>
          {LIBRARY_NAME}에 자료 올리기
        </button>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {/* **확정 문안 — 줄바꿈까지 그대로 싣는다.** 화면이 문장을 쪼개지 않는다. */}
          <p className="t-caption" style={{ ...muted, whiteSpace: 'pre-wrap', margin: 0 }}>{UPLOAD_CONSENT}</p>

          <label className="t-caption" style={muted}>
            제목
            <input className="ui-input" value={title} maxLength={120}
              onChange={(e) => setTitle(e.target.value)} style={{ display: 'block', width: '100%' }} />
          </label>

          <label className="t-caption" style={muted}>
            설명 (선택)
            <input className="ui-input" value={description} maxLength={500}
              onChange={(e) => setDescription(e.target.value)} style={{ display: 'block', width: '100%' }} />
          </label>

          <div className="t-caption" style={{ display: 'flex', gap: 'var(--space-3)' }}>
            {(['file', 'link'] as const).map((k) => (
              <label key={k} style={muted}>
                <input type="radio" name="library-kind" checked={kind === k} onChange={() => setKind(k)} />
                {' '}{k === 'file' ? '파일' : '주소'}
              </label>
            ))}
          </div>

          {/* ★ **고르는 즉시 잰다**(최박사 결재 2026-08-29) — 올리기 전에 말한다.
              숫자는 `_vocab/library` 하나에서 온다. 여기에 다시 적지 않는다. */}
          {kind === 'link' ? (
            <>
              {/* **확정 문안이다.** */}
              <p className="t-caption" style={{ ...muted, margin: 0 }}>{LINK_NOTE}</p>
              <input className="ui-input" value={url} onChange={(e) => setUrl(e.target.value)}
                onBlur={(e) => void fillTitle(e.target.value)}
                placeholder="https://" style={{ width: '100%' }} />
            </>
          ) : (
            <input
              type="file"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && f.size > LIBRARY_MAX_MB * 1024 * 1024) {
                  setErr(UPLOAD_TOO_LARGE);
                  setFile(null);
                  e.target.value = '';
                  return;
                }
                setErr(null);
                setFile(f);
              }}
            />
          )}

          <label className="t-caption" style={muted}>
            누가 보나요
            <select className="ui-input" value={tier} onChange={(e) => setTier(e.target.value as typeof tier)}
              style={{ display: 'block', width: '100%' }}>
              <option value="public">{LIBRARY_TIER_LABEL.public}</option>
              <option value="forum">{LIBRARY_TIER_LABEL.forum}</option>
              <option value="coach">{LIBRARY_TIER_LABEL.coach}</option>
            </select>
            {/* 고른 등급이 **무슨 뜻인지** 한 줄. 「전체 공개」가 로그인 밖까지라는 것을 미리 알린다. */}
            <span className="t-caption" style={{ color: 'var(--color-text-secondary)', display: 'block', marginTop: 'var(--space-1)' }}>
              {TIER_NOTE[tier]}
            </span>
          </label>

          {cohorts.length > 0 ? (
            <label className="t-caption" style={muted}>
              어느 기수의 자료인가요 (선택)
              <select className="ui-input" value={cohortId} onChange={(e) => setCohortId(e.target.value)}
                style={{ display: 'block', width: '100%' }}>
                <option value="">기수 무관</option>
                {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          ) : null}

          {err ? <p className="t-caption" style={muted}>{err}</p> : null}

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button type="button" className="ui-btn ui-btn--primary" onClick={submit} disabled={!ready || pending}>
              {pending ? '올리는 중…' : '올리기'}
            </button>
            <button type="button" className="ui-btn ui-btn--ghost" onClick={() => setOpen(false)} disabled={pending}>
              그만두기
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
