import type { ReactNode } from 'react';

interface DataValueProps {
  children: ReactNode;
  /** LOT·REQ 번호처럼 식별자일 때 굵게 */
  emphasis?: boolean;
  className?: string;
}

/** LOT·측정값·타임스탬프 등 데이터는 모노스페이스 + tabular-nums. */
export function DataValue({ children, emphasis = false, className = '' }: DataValueProps) {
  return (
    <span className={`font-mono ${emphasis ? 'font-bold' : ''} ${className}`}>{children}</span>
  );
}
