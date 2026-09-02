'use client';
// 편지 사진 첨부(ADR-83) — 참여자 본인 카드. 업로드/조회/삭제를 브라우저 supabase(storage RLS로 게이트)로 직접.
//   업로드 전 EXIF 제거(재디코드)·리사이즈(장변 2000px·jpeg 0.85)로 위치정보 제거 + 용량 절감.
//   열람 본인/인도자/운영자 · 삭제 본인/운영자(운영자 삭제는 인도자 현황 화면). 본인 삭제 전까지 보관.
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { createBrowserSupabase } from '@/core/supabase/client';

const BUCKET = 'checkin-photos';
const MAX_PHOTOS = 3;

// 캔버스 재인코딩 = EXIF(GPS 등) 제거 + 리사이즈. HEIC 등 디코드 불가 포맷은 throw → 안내.
async function processImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const maxDim = 2000;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', 0.85),
  );
}

export function LetterPhotos({ cohortId, sessionNo, userId }: { cohortId: string; sessionNo: number; userId: string }) {
  const sb = useMemo(() => createBrowserSupabase(), []);
  const prefix = `${cohortId}/${userId}/${sessionNo}`;
  const [photos, setPhotos] = useState<{ path: string; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    const { data, error } = await sb.storage.from(BUCKET).list(prefix);
    if (error) return;
    const out: { path: string; url: string }[] = [];
    for (const o of data ?? []) {
      if (o.name.startsWith('.')) continue;
      const path = `${prefix}/${o.name}`;
      const { data: s } = await sb.storage.from(BUCKET).createSignedUrl(path, 3600);
      if (s?.signedUrl) out.push({ path, url: s.signedUrl });
    }
    setPhotos(out);
  }
  useEffect(() => {
    // 마운트 시 본인 사진 로드(비동기 fetch 후 setState — 파생상태 아님).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (photos.length >= MAX_PHOTOS) {
      setErr(`사진은 최대 ${MAX_PHOTOS}장까지예요.`);
      return;
    }
    setBusy(true);
    setErr(null);
    let blob: Blob;
    try {
      blob = await processImage(file); // 디코드/재인코딩 실패(HEIC 등) → 형식 안내
    } catch {
      setErr('jpg·png 사진으로 다시 시도해 주세요.');
      setBusy(false);
      return;
    }
    const path = `${prefix}/${crypto.randomUUID()}.jpg`;
    const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
    if (error) {
      // 서버 상한(3MB·jpeg) 거부 등 — 크기 안내(경고색 없음).
      setErr('사진이 너무 커요. 다시 시도해 주세요.');
      setBusy(false);
      return;
    }
    await refresh();
    setBusy(false);
  }

  async function onDelete(path: string) {
    setBusy(true);
    setErr(null);
    await sb.storage.from(BUCKET).remove([path]);
    await refresh();
    setBusy(false);
  }

  return (
    <div style={{ marginTop: 'var(--space-2)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
        {photos.map((p) => (
          <div key={p.path} style={{ position: 'relative' }}>
            {/* 첨부 편지 사진 — signed URL(만료). 외부 도메인 아님(같은 supabase). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="첨부한 편지 사진" style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 'var(--radius)', border: 'var(--border-hair) solid var(--color-border)' }} />
            <button
              type="button"
              onClick={() => onDelete(p.path)}
              disabled={busy}
              aria-label="사진 삭제"
              style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'var(--color-danger)', color: 'var(--color-text-on-accent)', cursor: 'pointer', lineHeight: 1, fontSize: 14 }}
            >
              ×
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS ? (
          <label style={{ width: 84, height: 84, borderRadius: 'var(--radius)', border: 'var(--border-hair) dashed var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 13 }}>
            {busy ? '…' : '＋ 사진'}
            <input type="file" accept="image/*" capture="environment" onChange={onPick} disabled={busy} style={{ display: 'none' }} />
          </label>
        ) : null}
      </div>
      {/* ★ **열람 고지를 걷었다**(지휘부 판정 2026-09-02) — 회차 문안의 `notice2` 와 같은 이유다.
          누가 보는지는 모집 자료·세미나 진행 중에 이미 공지되고, **쓰는 순간에 또 보이면
          자기검열이 생긴다.** 정책은 한 글자도 안 바뀌었다 — 위치정보 제거(EXIF)도 그대로 돈다
          (이 파일 머리 참조). **없어서 빠진 것이 아니라 일부러 뺐다. 되살리지 마라.** */}
      {err ? <p className="t-caption" style={{ color: 'var(--color-danger)', margin: 'var(--space-1) 0 0' }}>{err}</p> : null}
    </div>
  );
}
