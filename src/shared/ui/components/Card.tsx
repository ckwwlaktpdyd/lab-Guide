import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** 선택 상태 — 그림자가 아니라 ring으로 표현한다 */
  selected?: boolean;
  children: ReactNode;
}

/** 계층은 1px 보더 + 배경 대비로. 그림자를 쓰지 않는다. */
export function Card({ selected = false, className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-card bg-surface ${
        selected
          ? 'border-[1.5px] border-indicator-teal shadow-ring'
          : 'border border-line'
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
