'use client';
// 공용 ListRow — 명단 행(이름 + 상태/부제 + 트레일링)(§8). 인스트루먼트 중립.
// tone='care' = 저채도 코랄(인도자 화면 돌봄 표시). 참여자 화면엔 쓰지 않는다.
import type { ReactNode } from 'react';

export function ListRow({
  title,
  subtitle,
  trailing,
  onClick,
  tone = 'default',
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  tone?: 'default' | 'care';
}) {
  const cls = `ui-listrow${tone === 'care' ? ' ui-listrow--care' : ''}${onClick ? ' ui-listrow--tappable' : ''}`;
  const inner = (
    <>
      <span className="ui-listrow__main">
        <span className="ui-listrow__title t-body">{title}</span>
        {subtitle ? <span className="ui-listrow__sub t-caption">{subtitle}</span> : null}
      </span>
      {trailing ? <span className="ui-listrow__trail t-caption">{trailing}</span> : null}
    </>
  );
  return onClick ? (
    <button type="button" className={cls} onClick={onClick}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
