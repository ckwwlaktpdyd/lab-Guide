import { Zap } from 'lucide-react';

interface InstrumentBadgeProps {
  /** 예: "pH-2000-A" */
  instrumentId: string;
  /** 계측기가 값을 잡은 시각 */
  capturedAt: Date;
  /** "· 수동 입력하려면 값을 탭하세요" 같은 보조 문구 */
  hint?: string;
  className?: string;
}

const time = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/**
 * 자동 수집 측정값의 출처 배지.
 * 의뢰자 결과 패널에도 동일하게 노출한다 — 투명성 톤(spec §10).
 */
export function InstrumentBadge({
  instrumentId,
  capturedAt,
  hint,
  className = '',
}: InstrumentBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-badge bg-badge-inst-bg px-2 py-0.5 font-mono text-caption text-indicator-teal ${className}`}
    >
      <Zap aria-hidden className="size-3.5" />
      {instrumentId} 자동 기록 <time dateTime={capturedAt.toISOString()}>{time.format(capturedAt)}</time>
      {hint && <span className="text-ink-soft">{hint}</span>}
    </span>
  );
}
