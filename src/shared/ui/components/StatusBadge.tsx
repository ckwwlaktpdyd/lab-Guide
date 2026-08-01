import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';

/**
 * 표현용 톤. 도메인 상태 문자열을 여기에 두지 않는다.
 * 상태 → 톤 매핑은 `src/shared/db`의 union 타입을 받아 앱 레이어에서 한다.
 */
export type BadgeTone = 'wait' | 'running' | 'done' | 'deviation' | 'remake';

const toneClass: Record<BadgeTone, string> = {
  wait: 'bg-badge-amber-bg text-badge-amber-fg',
  running: 'bg-badge-teal-bg text-indicator-teal',
  done: 'bg-badge-green-bg text-badge-green-fg',
  deviation: 'bg-phenol-pink text-white',
  // 재제조는 신규 의뢰와 구분되어야 해서 amber에 dashed 보더를 더한다.
  remake: 'bg-badge-amber-bg text-badge-amber-fg border border-dashed border-indicator-amber/60',
};

interface StatusBadgeProps {
  tone: BadgeTone;
  children: ReactNode;
  className?: string;
}

export function StatusBadge({ tone, children, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-badge px-2 py-0.5 text-caption font-semibold ${toneClass[tone]} ${className}`}
    >
      {tone === 'remake' && <RotateCcw aria-hidden className="size-3.5" />}
      {children}
    </span>
  );
}
