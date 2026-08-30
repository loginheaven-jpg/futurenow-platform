'use client';
// 자료 화면 본문 — **제목은 껍데기가 든다.**
//
// 라우트 키 표(`_lib/screenChrome`)는 **라우트의 성질**만 적는데 이 제목은 **서버 데이터**다.
//   그래서 U-4 가 세운 **통로**(`useSetChrome`)로 껍데기에 알린다. **새로 만들지 않았다**(§11).
//
// ⚠ ADR-162 의 성질이 그대로 따라온다 — 통로는 effect 로 서므로 **이 제목도 SSR 원문에 없다.**
//   하이드레이션 뒤에 뜬다. `/join` 과 같은 창이고 **새 결함이 아니다.**
import { useSetChrome } from '@/app/_screens/shell/chromeContext';
import { CopyLink } from './CopyLink';
import { VideoFacade } from './VideoFacade';

const muted = { color: 'var(--color-text-secondary)' } as const;

export function LibraryItemView({
  id, title, kind, url, video, backHref, backLabel,
}: {
  id: string; title: string; kind: 'file' | 'link';
  url: string | null;
  /**
   * 영상이면 재생·새 창 주소 둘, 아니면 `null`.
   *
   * ★ **화면이 판정하지 않는다.** 「이 주소가 유튜브인가」는 서버가 정해서 넘긴다 —
   *   화면이 다시 훑으면 판정이 두 곳이 되고, 한 곳만 고쳐지는 날이 온다.
   *   `photo` 를 서버가 판정해 내려보낸 것과 같은 형식이다(ADR-165).
   */
  video: { embedUrl: string; watchUrl: string } | null;
  backHref: string; backLabel: string;
}) {
  useSetChrome({ variant: 'sub', title, backHref });

  return (
    <div className="pc-shell">
      {/* 영상이면 **얼굴판이 먼저**다(설계서 §4.2). 누르기 전에는 유튜브로 아무것도 나가지 않는다. */}
      {video ? <VideoFacade itemId={id} embedUrl={video.embedUrl} watchUrl={video.watchUrl} /> : null}
      {kind === 'link' ? (
        // 링크 자료 — 주소는 **관문을 지난 이 화면에서만** 나온다.
        <a className="ui-btn ui-btn--primary" href={url ?? '#'} target="_blank" rel="noopener noreferrer">
          자료 열기
        </a>
      ) : (
        // 파일 자료 — 저장소 주소가 아니라 **프록시 주소**다. 매 요청이 관문을 다시 지난다.
        <a className="ui-btn ui-btn--primary" href={`/library/${id}/file`} target="_blank" rel="noopener noreferrer">
          내려받기
        </a>
      )}
      {/* ★ **잠긴 자료에도 복사 단추를 남긴다**(설계서 §6.3) — 공유는 권한과 별개다.
          열 수 있는 사람에게 보내라고 건네는 일까지 막을 이유가 없다.
          (이 화면 자체가 관문이라 여기 선 사람은 이미 지났다. 그래도 규칙은 그쪽이다.) */}
      <div style={{ marginTop: 'var(--space-4)' }}>
        <CopyLink id={id} />
      </div>
      <p className="t-caption" style={{ ...muted, marginTop: 'var(--space-4)' }}>
        {backLabel}로 돌아가려면 위의 뒤로를 눌러 주세요.
      </p>
    </div>
  );
}
