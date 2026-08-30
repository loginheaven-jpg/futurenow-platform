'use client';
// 영상 얼굴판 — **누르기 전에는 유튜브에 요청이 한 번도 가지 않는다**(설계서 §4.2).
//
// 설계서가 정한 넷을 그대로 옮겼다:
//   ⑴ 처음에는 **썸네일과 재생 단추만** 그리고, **누른 뒤에** iframe 을 넣는다
//   ⑵ 도메인은 **`youtube-nocookie.com`**
//   ⑶ 누르기 전 유튜브 요청 **0회**
//   ⑷ **「새 창에서 보기」를 함께 둔다** — 사내망·확장프로그램이 iframe 을 막는 경우가 있다
//
// ★ ⑶ 을 지키는 것은 이 파일이 아니라 **썸네일이 어디서 오는가**다.
//   `/library/{id}/thumb` 는 **우리 주소**이고 서버가 받아 바이트로 흘린다.
//   `i.ytimg.com` 을 여기 박으면 화면을 여는 것만으로 방문자 IP 가 구글로 가고,
//   그 순간 ⑶ 은 «누르기 전 1회» 가 된다. **주소를 이 파일에 두지 않는 것이 그 잠금이다.**
//
// ★ **영상 id 가 이 화면에 오지 않는다.** 재생 주소는 눌렀을 때 서버가 아니라
//   **부모가 이미 건네준 값**으로 만든다 — 부모(`LibraryItemView`)는 관문을 지난 화면이다.
//
// ★ **design_system 부품 부재**(불변식 20) — 영상 카드 부품이 확정되지 않았다.
//   `LibraryList` 의 사진 상자와 **같은 토큰·같은 모양**을 차용했다. 새로 디자인하지 않았다.
//
// ★ **깨진 표지에 말을 붙이지 않는다.** 죽은·비공개·지역차단 영상은 썸네일이 404 다.
//   그때 `onError` 로 **그림만 감추고** 재생 단추·새 창 링크는 그대로 남긴다 —
//   경고색도 «불러올 수 없습니다» 도 두지 않는다(불변식 9 · 그 문장은 신설 문안이다).
import { useState } from 'react';
import { SHARE_COPY } from '../copy';

const box = {
  position: 'relative' as const,
  width: '100%',
  aspectRatio: '16 / 9',
  overflow: 'hidden',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-2)',
  marginBottom: 'var(--space-3)',
};

export function VideoFacade({ itemId, embedUrl, watchUrl }: {
  itemId: string;
  embedUrl: string;
  watchUrl: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [thumbBroken, setThumbBroken] = useState(false);

  return (
    <>
      <div style={box}>
        {playing ? (
          // **누른 뒤에만** 선다. 이 시점의 유튜브 요청은 사용자가 고른 일이다.
          <iframe
            src={embedUrl}
            title={SHARE_COPY.videoAlt}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={SHARE_COPY.playLabel}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              padding: 0, border: 0, background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {thumbBroken ? null : (
              // 우리 주소다. 유튜브가 아니다 — 그것이 ⑶ 을 지킨다.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/library/${itemId}/thumb`}
                alt={SHARE_COPY.videoAlt}
                onError={() => setThumbBroken(true)}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
            {/* 재생 표시 — 아이콘 부품이 확정되지 않아 글자로 둔다(불변식 20). */}
            <span
              className="ui-btn ui-btn--primary"
              style={{ position: 'relative', pointerEvents: 'none' }}
            >
              {SHARE_COPY.playLabel}
            </span>
          </button>
        )}
      </div>
      {/* ⑷ 새 창 — iframe 이 막히는 자리가 실제로 있다. */}
      <a
        className="ui-btn ui-btn--ghost"
        href={watchUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {SHARE_COPY.watchOnYoutube}
      </a>
    </>
  );
}
