'use client';
// 자료 목록 — 클릭 시 **그때** 서명 URL 을 받는다.
//
// 목록에 URL 을 미리 실지 않는 이유: 서명 URL 은 발급 즉시 만료 시계가 돌고, 페이지에 박아 두면
//   화면을 열어 둔 채 시간이 지났을 때 죽은 링크가 된다. 그리고 **받지도 않을 파일의 URL 이
//   HTML 에 남는다** — 만료형으로 좁혀 둔 뜻이 옅어진다.
import { useState, useTransition } from 'react';
import { signLibraryFileAction } from './actions';

export function LibraryList({
  items,
}: {
  items: { id: string; title: string; description: string | null; path: string }[];
}) {
  const [pending, startTx] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const muted = { color: 'var(--color-text-secondary)' } as const;

  function open(item: { id: string; path: string }) {
    if (pending) return;
    setBusyId(item.id);
    setMsg(null);
    startTx(async () => {
      const res = await signLibraryFileAction(item.path);
      setBusyId(null);
      if (!res.url) {
        setMsg('지금은 받을 수 없습니다. 잠시 뒤 다시 시도해 주세요.');
        return;
      }
      window.open(res.url, '_blank', 'noopener,noreferrer');
    });
  }

  return (
    <div className="pc-cards" style={{ marginTop: 'var(--space-3)' }}>
      {items.map((i) => (
        <button
          key={i.id}
          type="button"
          className="ui-card ui-tappable"
          onClick={() => open(i)}
          disabled={pending}
          style={{ textAlign: 'left', padding: 'var(--space-4)', border: 'var(--border-hair) solid var(--color-border)', background: 'var(--color-surface-1)', cursor: 'pointer' }}
        >
          <span className="t-body" style={{ fontWeight: 600 }}>{i.title}</span>
          {i.description ? (
            <span className="t-caption" style={{ ...muted, display: 'block', marginTop: 'var(--space-1)' }}>{i.description}</span>
          ) : null}
          <span className="t-caption" style={{ ...muted, display: 'block', marginTop: 'var(--space-2)' }}>
            {busyId === i.id && pending ? '여는 중…' : '내려받기'}
          </span>
        </button>
      ))}
      {msg ? <p className="t-caption" style={muted}>{msg}</p> : null}
    </div>
  );
}
