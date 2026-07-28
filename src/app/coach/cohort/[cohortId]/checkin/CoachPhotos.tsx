'use client';
// 인도자 현황의 편지 사진 표시(ADR-83). 인도자·운영자 열람. 삭제 버튼은 운영자에게만(canDelete).
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deletePhotoAction } from './actions';

export function CoachPhotos({ photos, canDelete }: { photos: { path: string; url: string }[]; canDelete: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  if (photos.length === 0) return null;

  async function onDelete(path: string) {
    setBusy(path);
    const res = await deletePhotoAction(path);
    setBusy(null);
    if (res.ok) router.refresh();
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
      {photos.map((p) => (
        <div key={p.path} style={{ position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.url} alt="편지 사진" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 'var(--radius)', border: 'var(--border-hair) solid var(--color-border)' }} />
          {canDelete ? (
            <button
              type="button"
              onClick={() => onDelete(p.path)}
              disabled={busy === p.path}
              aria-label="사진 삭제(운영자)"
              style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'var(--color-danger)', color: 'var(--color-text-on-accent)', cursor: 'pointer', lineHeight: 1, fontSize: 13 }}
            >
              ×
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
