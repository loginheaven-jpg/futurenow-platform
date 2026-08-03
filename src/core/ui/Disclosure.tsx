'use client';
// 접힘 블록(공용·인스트루먼트 중립). design_system §5 · CC_GUIDE_checkin_session2_spec §3-2.
//   화살표 하나로는 '누를 수 있는 줄'임이 전달되지 않아(d11d3cb·bf86b13 두 차례 실패) 구조를 바꾼 부품이다.
//   핵심은 글자다 — '펼치기'/'접기'가 지금 열려 있는지까지 말해 준다. 영문·마우스 은유를 쓰지 않는다(대부분 폰에서 탭한다).
//
// 계측을 모른다(ADR-86 제1원칙). 열림 여부를 서버에 기록할지는 호출부가 onToggle 로 결정한다.
// 문안을 갖지 않는다 — 제목·요약·뱃지 문구는 전부 호출부(레지스트리)가 준다.
import { useState, type ReactNode } from 'react';

export function Disclosure({
  title,
  summary,
  badge,
  defaultOpen = false,
  onToggle,
  last = false,
  openLabel = '펼치기',
  closeLabel = '접기',
  children,
}: {
  title: string;
  summary?: string;        // 접힌 상태에서 안에 무엇이 있는지 한 줄. 열기 전에 알 수 있어야 여는 판단이 선다.
  badge?: string;          // 기본 펼침 블록에만 붙는 '선택' 표기(ADR-82 조건 추가). 접힘 블록은 접힘 자체가 신호라 두지 않는다.
  defaultOpen?: boolean;
  onToggle?: (open: boolean) => void;
  last?: boolean;          // 면의 마지막 블록이면 아래 여백 0
  openLabel?: string;
  closeLabel?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`ui-disc${last ? ' ui-disc--last' : ''}`} data-open={open}>
      <button
        type="button"
        className="ui-disc__head"
        aria-expanded={open}
        onClick={() => { const next = !open; setOpen(next); onToggle?.(next); }}
      >
        <span className="ui-disc__title">
          <span className="ui-disc__row">
            <span className="t-body-lg">{title}</span>
            {badge ? <span className="t-caption ui-disc__badge">{badge}</span> : null}
          </span>
          {summary ? <span className="t-caption ui-disc__summary">{summary}</span> : null}
        </span>
        <span className="t-caption ui-disc__toggle">
          {open ? closeLabel : openLabel}
          <span className="ui-disc__caret" aria-hidden>⌄</span>
        </span>
      </button>
      <div className="ui-disc__body">{children}</div>
    </div>
  );
}
