// 공용 Card — surface-2 + border-hair + radius-lg(ui.css).
import type { HTMLAttributes } from 'react';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`ui-card ${className ?? ''}`} {...rest} />;
}
