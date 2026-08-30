'use client';
// 링크 복사 — **주소는 하나다**(설계서 §6.1).
//
// 복사되는 것은 `https://<이 사이트>/library/{id}` 뿐이다.
//   **자격에 따라 다른 주소를 만들지 않는다** — 주소가 자격을 담으면 그 주소가 곧 열쇠가 되고,
//   카톡으로 옮겨 다니는 열쇠는 막을 방법이 없다. **주소는 가리키기만 하고 판정은 도착지에서 한다.**
//
// ★ **오리진을 손으로 박지 않는다.** 설계서 §6.1 은 `https://future.yebom.org` 라고 적었지만
//   그것은 **따라가야 하는 값**이라(CLAUDE.md §11 ⑴) 박으면 프리뷰·로컬에서 낡는다.
//   `window.location.origin` 에서 얻는다 — 선례가 있다(`ScheduleSeedClient`).
//
// ★ **design_system 부품 부재**(불변식 20). 복사 단추는 확정 부품이 없다 —
//   `ItemSocial` 이 같은 자리에서 한 그대로, `AccountCopy` 의 **기존 관용구를 차용**했다.
//   새로 디자인하지 않았다. `rc-copy` 는 모집 랜딩 전용 팔레트라 쓰지 않고 `ui-btn ui-btn--ghost` 다.
//
// ★ **실패를 감추지 않는다**(설계서 §6.4). `navigator.clipboard` 는 보안 컨텍스트에서만 살아 있고
//   인앱 브라우저에서 막히는 사례가 있다. 그때 아무 일도 안 일어나면 사용자는 **고장으로 읽는다.**
//   그래서 **주소를 화면에 그대로 띄워** 직접 고를 수 있게 한다. 경고색은 쓰지 않는다(불변식 9).
import { useState } from 'react';
import { useToast } from '@/app/_toast/ToastProvider';
import { SHARE_COPY } from '../copy';

export function CopyLink({ id }: { id: string }) {
  const toast = useToast();
  // 실패했을 때만 주소를 띄운다 — 평소에 띄우면 화면이 주소로 시끄러워진다.
  const [fallback, setFallback] = useState<string | null>(null);

  async function onCopy() {
    // 서버에서는 origin 을 모른다. 이 부품은 'use client' 라 누를 때는 반드시 브라우저다.
    const href = `${window.location.origin}/library/${id}`;
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(href);
      setFallback(null);
      toast.success(SHARE_COPY.copied);
    } catch {
      // 조용히 넘어가지 않는다 — 주소를 내주고 무엇을 하면 되는지 말한다.
      setFallback(href);
      toast.info(SHARE_COPY.copyFailed);
    }
  }

  return (
    <>
      <button type="button" className="ui-btn ui-btn--ghost" onClick={onCopy}>
        {SHARE_COPY.copyLabel}
      </button>
      {fallback ? (
        // 고를 수 있어야 뜻이 있다 — `user-select` 를 막지 않고 줄바꿈을 허용한다.
        <p
          className="t-caption"
          style={{
            color: 'var(--color-text-secondary)',
            marginTop: 'var(--space-2)',
            wordBreak: 'break-all',
            userSelect: 'all',
          }}
        >
          {fallback}
        </p>
      ) : null}
    </>
  );
}
