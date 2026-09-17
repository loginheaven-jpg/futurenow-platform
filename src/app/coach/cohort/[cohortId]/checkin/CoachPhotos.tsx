'use client';
// 인도자 명단 펼침의 워크북 사진(ADR-83 → ADR-197). 인도자·운영자 열람 — 참여자가 「인도자 열람」을 해제한 회차는
//   목록 자체가 비어 온다(저장소 정책 · 불변식 16). 삭제 표시는 운영자에게만(canDelete).
//   그림은 읽는 화면과 **같은 줄**(WorkbookPhotoStrip)을 쓰고 삭제 표시만 얹는다 — 사진 그리는 곳을 둘로 두지 않는다.
//   **모아 보기에서 옮겨 왔다**(2026-09-18) — 모아 보기는 나눔 도구라 사진을 싣지 않는다.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CheckinPhoto } from '@/contracts';
import { WorkbookPhotoStrip } from '@/instruments/futurenow/checkin/CheckinReadView';
import { deletePhotoAction } from './actions';

export function CoachPhotos({ photos, canDelete }: { photos: CheckinPhoto[]; canDelete: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  if (photos.length === 0) return null;

  async function onDelete(path: string) {
    setBusy(path);
    // finally 가 없으면 액션이 throw 할 때 버튼이 영구히 잠긴다(성능 감사 2026-08-25).
    try {
      const res = await deletePhotoAction(path);
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <WorkbookPhotoStrip
      photos={photos}
      overlay={
        canDelete
          ? (p) => (
              <button
                type="button"
                onClick={() => onDelete(p.path)}
                disabled={busy === p.path}
                aria-label="사진 삭제(운영자)"
                style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'var(--color-danger)', color: 'var(--color-text-on-accent)', cursor: 'pointer', lineHeight: 1, fontSize: 13 }}
              >
                ×
              </button>
            )
          : undefined
      }
    />
  );
}
