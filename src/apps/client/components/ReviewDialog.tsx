import { useEffect, useId, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { Button, DataValue, InstrumentBadge, PromptDialog } from '@shared/ui';
import { requestRemake, signClientReview, type RequestDetailData } from '@shared/db';

const mdt = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

interface ReviewDialogProps {
  open: boolean;
  data: RequestDetailData;
  /** 리뷰가 끝난 의뢰 — 결과만 보여주고 서명·보완 버튼은 감춘다. 재제조는 열어둔다. */
  readOnly: boolean;
  onClose: () => void;
  onChanged: () => void;
}

/**
 * 제조 결과 + 리뷰 액션. 인라인 패널이 아니라 모달이다 —
 * 검토 단계가 아닌 사용자에게 빈 영역을 보여주지 않기 위해서(docs/feedback-0914.md §2).
 *
 * 의뢰자 액션 2종: 리뷰 완료·서명 / 재제조 요청. "보완 요청"은 없다 —
 * 버퍼는 이미 만들어졌으니 끝에서 보완할 게 없고 사실상 재제조다(현장 문답 09-17).
 * 문제는 공정 중 의뢰자 확인 요청으로 잡는다.
 * 재제조는 새 배치를 만드는 무게가 다른 액션이라 구분선 아래 따로 둔다.
 */
export function ReviewDialog({ open, data: r, readOnly, onClose, onChanged }: ReviewDialogProps) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaking, setRemaking] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setBusy(false);
      setDone(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const result = r.batch?.result;
  const target = r.recipe.target_params;
  const instrument = result?.measurements.find((m) => m.instrument_id && m.captured_at);

  const sign = async () => {
    if (!result) return;
    setBusy(true);
    setError(null);
    try {
      await signClientReview(result.id);
      setDone('리뷰 서명이 완료되었습니다. 이 의뢰는 완료 탭으로 이동합니다.');
      setTimeout(onChanged, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    // 모바일은 모달이 아니라 다음 스텝(전체 화면)이다. 액션은 하단 고정 — 구매하기 바 패턴.
    // sm 이상에서는 가운데 모달.
    <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center sm:bg-ink/40 sm:p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="flex h-full w-full flex-col bg-surface sm:h-auto sm:max-h-[92dvh] sm:max-w-lg sm:rounded-card sm:border sm:border-line"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 id={`${id}-title`} className="text-title">
              제조 결과
            </h2>
            <p className="mt-0.5 text-caption text-ink-soft">
              {r.recipe.name} · <DataValue>{r.batch?.lot_number}</DataValue>
              {result?.manufacturer_signed_at && (
                <>
                  {' · 1차 검토 '}
                  {result.manufacturer_signed_by?.name}{' '}
                  {mdt.format(new Date(result.manufacturer_signed_at))}
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="cursor-pointer rounded-control p-1 text-ink-soft hover:bg-bench"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* 측정값 — 콘솔과 같은 출처 배지를 노출한다(투명성) */}
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 font-mono text-body">
            {(result?.measurements ?? []).map((m) => {
              const isPh = m.label === 'pH';
              const hint =
                isPh && target.ph !== undefined ? ` (목표 ${target.ph.toFixed(2)})` : '';
              return (
                <div key={m.label} className="contents">
                  <dt className="text-ink-soft">{m.label}</dt>
                  <dd>
                    <b>{m.value}</b> {m.unit}
                    <span className="text-ink-soft">{hint}</span>
                  </dd>
                </div>
              );
            })}
            {(result?.measurements.length ?? 0) === 0 && (
              <dd className="col-span-2 text-caption text-ink-dim">결과 측정값이 아직 없습니다.</dd>
            )}
          </dl>
          {instrument?.instrument_id && instrument.captured_at && (
            <div className="mt-3">
              <InstrumentBadge
                instrumentId={instrument.instrument_id}
                capturedAt={new Date(instrument.captured_at)}
              />
            </div>
          )}

          {r.batch?.batch_summaries?.content && (
            <div className="mt-5 rounded-control bg-bench px-4 py-3 text-body">
              <p className="text-caption font-semibold text-ink-soft">배치 요약</p>
              <p className="mt-1">{r.batch.batch_summaries.content}</p>
            </div>
          )}

          {result?.client_review_status === 'reviewed' && (
            <p className="mt-5 rounded-control border border-indicator-green/40 bg-indicator-green/[.06] px-4 py-3 text-caption text-badge-green-fg">
              결과 리뷰(서명) 완료 · {result.client_signed_at && mdt.format(new Date(result.client_signed_at))}
            </p>
          )}

          {done && (
            <p role="status" className="mt-5 rounded-control border border-indicator-green/40 bg-indicator-green/[.06] px-4 py-3 text-caption text-badge-green-fg">
              {done}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-5 text-caption text-phenol-pink">
              {error}
            </p>
          )}

        </div>

        {/* 하단 고정 액션 — 스크롤과 무관하게 항상 손 닿는 곳에 */}
        <div className="border-t border-line px-6 py-4">
          {!readOnly && !done && (
            <>
              <p className="text-caption text-ink-soft">제조 결과를 확인했으며 이상이 없음을 서명합니다.</p>
              <Button variant="sign" touch className="mt-2 w-full" disabled={busy} onClick={() => void sign()}>
                {busy ? '서명 중…' : '리뷰 완료 · 서명'}
              </Button>
            </>
          )}

          {/* 재제조 — 무게가 다른 액션. 구분선 아래. 완료 건에서도 열린다. */}
          {!readOnly && !done && <div className="my-4 h-px bg-line" />}
          <Button variant="deviation" touch className="w-full" disabled={busy} onClick={() => setRemaking(true)}>
            <RotateCcw aria-hidden className="size-4" /> 재제조 요청
          </Button>
          <p className="mt-2 text-caption text-ink-soft">
            결과 편차·실험 중 문제 발견 시 동일 조건으로 새 배치를 요청합니다.
          </p>
        </div>
      </div>

      <PromptDialog
        open={remaking}
        title="재제조 요청"
        description={`${r.code}와 동일 조건(${r.recipe.name} · ${r.volume_ml} mL)으로 새 의뢰를 만듭니다. 사유는 필수이며 제조자에게 원본 결과와 함께 전달됩니다.`}
        fields={[{ name: 'reason', label: '재제조 사유', placeholder: '예) 전기영동 진행 중 밴드 번짐 발생. 버퍼 전도도 이상 의심됩니다' }]}
        confirmLabel="재제조 요청"
        confirmVariant="deviation"
        onCancel={() => setRemaking(false)}
        onConfirm={async (v) => {
          const desired = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
          const created = await requestRemake(r.id, v.reason ?? '', desired);
          setRemaking(false);
          setDone(`재제조 요청 ${created.code}이(가) 접수되었습니다. 제조자 의뢰함으로 전달됩니다.`);
          setTimeout(onChanged, 1200);
        }}
      />
    </div>
  );
}
