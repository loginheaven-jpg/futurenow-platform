'use client';
// 공용 Button — primary(골드)·ghost(테두리). 높이 ≥44px(ui.css). 인스트루먼트 중립.
import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' };

export function Button({ variant = 'primary', className, type = 'button', ...rest }: Props) {
  return <button type={type} className={`ui-btn ui-btn--${variant} ${className ?? ''}`} {...rest} />;
}
