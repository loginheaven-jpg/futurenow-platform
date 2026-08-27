// 부품 8 · SessionChipStrip — 시안 E `.sess-chip` (4차 F-1 · 발주 §3-8).
//
// 6칸 가로. 완료=네이비 면+체크 · 진행=골드 면 · **잠금=점선 테두리+회색이고 감추지 않는다**
//   (여정의 전체 길이가 보여야 한다 — IA §3).
//
// **부품은 계산하지 않는다**(불변식 10 계열 · 지휘부 강조 ①).
//   `state` 는 **prop 이고 판정 로직이 여기 없다.** 지금이 몇 회차인지·열렸는지는
//   `cohort_sessions` 개폐가 정하고 서버가 내려보낸다. 부품이 날짜를 보면 진실이 둘이 된다.
import Link from 'next/link';
import './site.css';

export type SessionState = 'done' | 'current' | 'open' | 'locked';

export interface SessionChip {
  no: number;
  state: SessionState;
  /** 잠금이면 보통 없다 — 없으면 링크가 아니라 span 으로 그린다. */
  href?: string;
}

const CLASS: Record<SessionState, string> = {
  done: 'site-chip is-done',
  current: 'site-chip is-current',
  open: 'site-chip',
  locked: 'site-chip is-locked',
};
const LABEL: Record<SessionState, string> = {
  done: '완료', current: '진행 중', open: '열림', locked: '잠김',
};

/** 완료 표시 — **문자 체크가 아니라 인라인 SVG**(발주 §5-3). currentColor 를 따르므로
 *  네이비 면 위에서 자동으로 흰색이 된다. 문자로 두면 폰트마다 굵기가 달라진다. */
function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function SessionChipStrip({ chips }: { chips: SessionChip[] }) {
  return (
    <div className="site-chips" role="list">
      {chips.map((c) => {
        const label = `${c.no}회차 ${LABEL[c.state]}`;
        const inner = c.state === 'done' ? <Check /> : String(c.no);
        return c.href && c.state !== 'locked' ? (
          <Link key={c.no} href={c.href} className={CLASS[c.state]} role="listitem" aria-label={label}
                aria-current={c.state === 'current' ? 'step' : undefined}>
            {inner}
          </Link>
        ) : (
          // 잠긴 회차는 `<span>` 이라 애초에 초점을 받지 않는다 — `aria-disabled` 를 얹지 않는다.
          //   `listitem` 이 지원하지 않는 속성이고(린트가 잡았다), **상태는 이미 `aria-label` 이 말한다.**
          <span key={c.no} className={CLASS[c.state]} role="listitem" aria-label={label}>
            {inner}
          </span>
        );
      })}
    </div>
  );
}
