'use client';
// 워크북 사진(ADR-197 · ADR-83 편지 사진을 넓혔다) — 참여자 본인 카드 **맨 위 한 자리**.
//   올리기: 브라우저 supabase 로 저장소에 직접(바이트가 서버 액션을 지나지 않는다) · storage RLS(본인 + 회기 멤버)가 게이트.
//   목록·삭제·「인도자 열람」: 서버 액션 → 코어(불변식 4 — 앱이 표·RPC 를 직접 부르지 않는다).
//   재인코딩(EXIF 제거·리사이즈)은 `_lib/resizeImage` 한 곳이다 — 피드와 같은 함수(사본 0).
//   장수 제한 없음(2026-09-18 결정). 여러 장을 한꺼번에 고른다 — `capture` 를 두지 않아 촬영과 앨범이 함께 열린다.
//   삭제 본인/운영자(운영자 삭제는 인도자 명단 펼침). 본인 삭제 전까지 보관.
import { useRef, useState, type ChangeEvent } from 'react';
import type { CheckinPhoto } from '@/contracts';
import { CheckRow } from '@/core/ui';
import { createBrowserSupabase } from '@/core/supabase/client';
import { CHECKIN_PHOTO_BUCKET, thumbPathOf } from '@/core/checkinPhotos';
import { resizeToJpeg, THUMB_MAX_DIM, THUMB_QUALITY } from '@/app/_lib/resizeImage';
import { WORKBOOK_COACH_VIEW_LABEL, WORKBOOK_TITLE } from '@/instruments/futurenow/checkin';
import { deleteMyCheckinPhotoAction, listMyCheckinPhotosAction, setCheckinPhotoCoachViewAction } from './actions';

const tile = { width: 84, height: 84, borderRadius: 'var(--radius)' } as const;

export function WorkbookPhotos({
  cohortId,
  sessionNo,
  userId,
  initialPhotos,
  initialCoachView,
  preview = false,
}: {
  cohortId: string;
  sessionNo: number;
  userId: string;
  initialPhotos: CheckinPhoto[];
  initialCoachView: boolean;
  /** 인도자 미리보기 — 저장소·서버를 한 번도 부르지 않는다(서버 쓰기 0 규율). 체크는 화면 안에서만 바뀐다. */
  preview?: boolean;
}) {
  const [photos, setPhotos] = useState<CheckinPhoto[]>(initialPhotos);
  const [coachView, setCoachView] = useState(initialCoachView);
  const [busy, setBusy] = useState<string | null>(null); // 진행 표시 — 여러 장이면 '2/5'
  const [err, setErr] = useState<string | null>(null);
  const saving = useRef(false);
  const prefix = `${cohortId}/${userId}/${sessionNo}`;

  async function refresh() {
    const res = await listMyCheckinPhotosAction(cohortId, sessionNo);
    if (res.ok) setPhotos(res.photos);
  }

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0 || preview) return;
    setErr(null);
    // 미리보기에서는 만들지 않는다 — 브라우저 클라이언트를 여는 것부터가 저장소 호출의 시작이다.
    const sb = createBrowserSupabase();
    let failed: string | null = null;
    // finally 가 없으면 한 장이 throw 할 때 올리기 칸이 영구히 잠긴다(성능 감사 2026-08-25).
    try {
      for (const [i, file] of files.entries()) {
        setBusy(files.length > 1 ? `${i + 1}/${files.length}` : '…');
        let blob: Blob;
        try {
          blob = await resizeToJpeg(file); // 디코드/재인코딩 실패(HEIC 등) → 형식 안내
        } catch {
          failed = 'jpg·png 사진으로 다시 시도해 주세요.';
          continue;
        }
        const path = `${prefix}/${crypto.randomUUID()}.jpg`;
        const { error } = await sb.storage.from(CHECKIN_PHOTO_BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
        if (error) {
          // 서버 상한(3MB·jpeg) 거부 등 — 크기 안내(경고색 없음). 나머지 장은 계속 올린다.
          failed = '사진이 너무 커요. 다시 시도해 주세요.';
          continue;
        }
        // 미리보기는 원본 **뒤에** 올린다 — 실패해도 원본이 서고, 읽는 화면이 원본으로 대신 그린다.
        try {
          const thumb = await resizeToJpeg(file, THUMB_MAX_DIM, THUMB_QUALITY);
          await sb.storage.from(CHECKIN_PHOTO_BUCKET).upload(thumbPathOf(path), thumb, { contentType: 'image/jpeg' });
        } catch {
          /* 미리보기 실패는 원본을 막지 않는다 */
        }
      }
      await refresh();
    } finally {
      setBusy(null);
      if (failed) setErr(failed);
    }
  }

  async function onDelete(path: string) {
    if (preview) return;
    setBusy('…');
    setErr(null);
    try {
      await deleteMyCheckinPhotoAction(path);
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  // 「인도자 열람」 — 누르는 즉시 저장한다(사진이 카드 저장과 따로 올라가는 것과 같은 결).
  //   저장 중에 또 누르면 무시한다 — 응답이 뒤바뀌어 도착하면 화면과 서버가 갈린다.
  async function onCoachView(v: boolean) {
    if (saving.current) return;
    const prev = coachView;
    setCoachView(v);
    if (preview) return;
    saving.current = true;
    setErr(null);
    try {
      const res = await setCheckinPhotoCoachViewAction(sessionNo, v);
      if (!res.ok) {
        setCoachView(prev);
        setErr('저장하지 못했습니다 · 다시 시도');
      }
    } catch {
      setCoachView(prev);
      setErr('저장하지 못했습니다 · 다시 시도');
    } finally {
      saving.current = false;
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {photos.map((p) => (
          <div key={p.path} style={{ position: 'relative' }}>
            {/* 누르면 원본 — 손글씨는 미리보기 크기로는 읽히지 않는다. signed URL(만료) · 같은 supabase. */}
            <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', lineHeight: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumbUrl ?? p.url} alt={WORKBOOK_TITLE} style={{ ...tile, objectFit: 'cover', border: 'var(--border-hair) solid var(--color-border)' }} />
            </a>
            <button
              type="button"
              onClick={() => onDelete(p.path)}
              disabled={busy !== null}
              aria-label="사진 삭제"
              style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'var(--color-danger)', color: 'var(--color-text-on-accent)', cursor: 'pointer', lineHeight: 1, fontSize: 14 }}
            >
              ×
            </button>
          </div>
        ))}
        <label style={{ ...tile, border: 'var(--border-hair) dashed var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: preview ? 'default' : 'pointer', color: 'var(--color-text-muted)', fontSize: 13 }}>
          {busy ?? '＋ 사진'}
          <input type="file" accept="image/*" multiple onChange={onPick} disabled={busy !== null || preview} style={{ display: 'none' }} />
        </label>
      </div>
      <CheckRow label={WORKBOOK_COACH_VIEW_LABEL} checked={coachView} onChange={(v) => void onCoachView(v)} />
      {/* ★ **열람 고지를 걷었다**(지휘부 판정 2026-09-02) — 회차 문안의 `notice2` 와 같은 이유다.
          누가 보는지는 모집 자료·세미나 진행 중에 이미 공지되고, **쓰는 순간에 또 보이면
          자기검열이 생긴다.** 위치정보 제거(EXIF)는 그대로 돈다(`_lib/resizeImage`).
          **없어서 빠진 것이 아니라 일부러 뺐다. 되살리지 마라.**
          「인도자 열람」 체크는 고지문이 아니라 **선택**이다(2026-09-18 결정) — 기본 체크라
          아무것도 하지 않으면 전과 같고, 문장으로 누가 보는지를 설명하지 않는다. */}
      {err ? <p className="t-caption" style={{ color: 'var(--color-danger)', margin: 0 }}>{err}</p> : null}
    </div>
  );
}
