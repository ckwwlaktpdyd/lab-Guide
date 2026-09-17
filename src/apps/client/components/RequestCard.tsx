import { Link } from 'react-router-dom';
import { AlertTriangle, MessageCircleQuestion, RotateCcw } from 'lucide-react';
import { Card, DataValue, GradientStepper, StatusBadge } from '@shared/ui';
import {
  CLIENT_STAGE_LABEL,
  CLIENT_STEPS,
  clientStage,
  needsAction,
  stageIndex,
  type MyRequest,
} from '@shared/db';

const md = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' });
const mdt = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function toStageInput(r: MyRequest) {
  return {
    status: r.status,
    result: r.batch?.result ?? null,
    batchDone: r.batch?.status === 'completed',
    openInquiry: r.batch?.inquiries.some((q) => q.decision === null) ?? false,
  };
}

interface RequestCardProps {
  request: MyRequest;
  /** 대시보드 "조치 필요" 카드는 상세가 더 드러난다 — 바로 들어와서 알아야 할 정보라서 */
  detailed?: boolean;
}

export function RequestCard({ request: r, detailed = false }: RequestCardProps) {
  const input = toStageInput(r);
  const stage = clientStage(input);
  const action = needsAction(input);
  const steps = r.batch?.process_steps ?? [];
  const done = steps.filter((s) => s.status === 'done').length;
  const openDev = r.batch?.deviations.filter((d) => d.status === 'open').length ?? 0;
  const rejected = r.status === 'rejected';

  return (
    <Link to={`/client/requests/${r.id}`} className="block">
      <Card
        selected={action}
        className={`transition-colors duration-150 ease-out hover:border-ink-soft ${
          detailed ? 'p-5' : 'p-4'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-title">{r.recipe.name}</span>
              <DataValue className="text-caption text-ink-soft">{r.code}</DataValue>
              {r.request_type === 'remake' && (
                <StatusBadge tone="remake">재제조</StatusBadge>
              )}
              {rejected && <StatusBadge tone="deviation">반려</StatusBadge>}
              {input.openInquiry && <StatusBadge tone="wait">확인 요청</StatusBadge>}
              {openDev > 0 && <StatusBadge tone="deviation">편차 {openDev}</StatusBadge>}
            </div>
            <p className="mt-1 text-caption text-ink-soft">
              {md.format(new Date(r.created_at))} 의뢰
              {r.batch && (
                <>
                  {' · '}
                  <DataValue>{r.batch.lot_number}</DataValue>
                </>
              )}
              {' · 희망 '}
              {mdt.format(new Date(r.desired_completion_at))}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <GradientStepper steps={CLIENT_STEPS} current={stageIndex(input)} className="w-36" />
            <span
              className={`w-20 text-right text-caption font-semibold ${
                action ? 'text-indicator-teal' : 'text-ink-soft'
              }`}
            >
              {rejected ? '재의뢰 필요' : input.openInquiry ? '답변 필요' : CLIENT_STAGE_LABEL[stage]}
              {action && ' →'}
            </span>
          </div>
        </div>

        {/* 조치 필요 카드는 왜 조치가 필요한지가 바로 보여야 한다 */}
        {detailed && (
          <div className="mt-4 border-t border-bench pt-3 text-body">
            {rejected ? (
              <p className="flex items-start gap-2 text-phenol-pink">
                <RotateCcw aria-hidden className="mt-1 size-4 shrink-0" />
                <span>
                  <b>반려됨</b> — {r.rejection_reason}
                  <br />
                  <span className="text-caption text-ink-soft">사유를 확인하고 재의뢰해 주세요.</span>
                </span>
              </p>
            ) : input.openInquiry ? (
              <p className="flex items-start gap-2 text-ink">
                <MessageCircleQuestion aria-hidden className="mt-1 size-4 shrink-0 text-indicator-amber" />
                <span>
                  <b>제조자가 확인을 요청했습니다.</b> 답을 줄 때까지 공정이 멈춰 있습니다.
                </span>
              </p>
            ) : stage === 'review' ? (
              <p className="text-ink">
                제조가 완료되었습니다. <b>제조 결과를 확인하고 서명해 주세요.</b>
                <span className="ml-2 text-caption text-ink-soft">
                  공정 {done}/{steps.length} · 편차 {r.batch?.deviations.length ?? 0}건
                </span>
              </p>
            ) : openDev > 0 ? (
              <p className="flex items-center gap-2 text-ink">
                <AlertTriangle aria-hidden className="size-4 text-phenol-pink" />
                편차가 등록되었습니다. 제조자가 원인·조치를 기록하는 중입니다.
              </p>
            ) : null}
          </div>
        )}
      </Card>
    </Link>
  );
}
