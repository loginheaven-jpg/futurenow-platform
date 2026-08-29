'use client';
// 자료 화면 본문 — **제목은 껍데기가 든다.**
//
// 라우트 키 표(`_lib/screenChrome`)는 **라우트의 성질**만 적는데 이 제목은 **서버 데이터**다.
//   그래서 U-4 가 세운 **통로**(`useSetChrome`)로 껍데기에 알린다. **새로 만들지 않았다**(§11).
//
// ⚠ ADR-162 의 성질이 그대로 따라온다 — 통로는 effect 로 서므로 **이 제목도 SSR 원문에 없다.**
//   하이드레이션 뒤에 뜬다. `/join` 과 같은 창이고 **새 결함이 아니다.**
import { useSetChrome } from '@/app/_screens/shell/chromeContext';

const muted = { color: 'var(--color-text-secondary)' } as const;

export function LibraryItemView({
  id, title, kind, url, backHref, backLabel,
}: {
  id: string; title: string; kind: 'file' | 'link';
  url: string | null; backHref: string; backLabel: string;
}) {
  useSetChrome({ variant: 'sub', title, backHref });

  return (
    <div className="pc-shell">
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
      <p className="t-caption" style={{ ...muted, marginTop: 'var(--space-4)' }}>
        {backLabel}로 돌아가려면 위의 뒤로를 눌러 주세요.
      </p>
    </div>
  );
}
