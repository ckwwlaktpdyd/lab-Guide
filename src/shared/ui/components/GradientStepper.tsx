/**
 * 시그니처 요소 — "적정이 진행될수록 색이 변한다."
 * amber→green→teal 그라디언트는 진행률 표현과 브랜드 마크에만 쓴다(CLAUDE.md).
 */

interface GradientStepperProps {
  /** 단계 라벨. 예: ['의뢰','수락','공정','검토','완료'] */
  steps: readonly string[];
  /** 현재 단계 인덱스 (0-based). steps.length면 전체 완료 */
  current: number;
  /** 라벨 표시 여부 — 대시보드 행에서는 숨기고 상세에서만 켠다 */
  showLabels?: boolean;
  className?: string;
}

export function GradientStepper({
  steps,
  current,
  showLabels = false,
  className = '',
}: GradientStepperProps) {
  const done = Math.max(0, Math.min(current, steps.length));
  const atStart = done === 0;

  return (
    <div className={className}>
      <div
        className="flex items-center gap-1"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={done}
        aria-valuetext={`${steps.length}단계 중 ${done}단계 — ${steps[Math.min(done, steps.length - 1)] ?? ''}`}
      >
        {steps.map((label, i) => {
          if (i === done) {
            return (
              <span
                key={label}
                className={`size-2.5 shrink-0 rounded-full outline outline-[3px] ${
                  atStart
                    ? 'bg-indicator-amber outline-indicator-amber/20'
                    : 'bg-indicator-teal outline-indicator-teal/20'
                }`}
              />
            );
          }
          return (
            <span
              key={label}
              className={`h-1 flex-1 rounded-sm ${i < done ? '' : 'bg-line'}`}
              style={i < done ? { background: segmentFill(i, steps.length) } : undefined}
            />
          );
        })}
      </div>

      {showLabels && (
        <div className="mt-1.5 flex justify-between text-caption text-ink-soft">
          {steps.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 세그먼트마다 그라디언트의 해당 구간만 잘라 쓴다.
 * 막대 전체에 같은 그라디언트를 반복하면 단계마다 색이 되감겨 진행감이 사라진다.
 */
function segmentFill(index: number, total: number): string {
  const stops = ['#F0A62E', '#3AA05F', '#0E8290'];
  const at = (t: number) => {
    const p = t * (stops.length - 1);
    const i = Math.min(Math.floor(p), stops.length - 2);
    return mix(stops[i]!, stops[i + 1]!, p - i);
  };
  const denom = Math.max(total - 1, 1);
  return `linear-gradient(90deg, ${at(index / denom)}, ${at((index + 1) / denom)})`;
}

function mix(a: string, b: string, t: number): string {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const v = [0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t));
  return `rgb(${v.join(' ')})`;
}
