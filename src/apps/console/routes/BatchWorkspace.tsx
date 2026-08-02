import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import {
  Button,
  Card,
  DataValue,
  InstrumentBadge,
  PromptDialog,
  StatusBadge,
  type BadgeTone,
} from '@shared/ui';
import {
  BATCH_STATUS_LABEL,
  DEVIATION_STATUS_LABEL,
  completeStep,
  fetchBatchDeviations,
  fetchBatches,
  fetchBatchSteps,
  registerDeviation,
  resolveDeviation,
  type BatchDeviation,
  type BatchListItem,
  type BatchStatus,
  type BatchStep,
  type RecipeTargetParams,
} from '@shared/db';
import { EmptyDetail, FilterChip, SplitView } from '../components/SplitView';

/**
 * 규격 이탈 판정. 허용 범위를 벗어난 측정값은 정상값과 같은 색으로 두면 안 된다 —
 * 콘솔에서 가장 먼저 눈에 들어와야 하는 정보다.
 * ph_min/ph_max가 있으면 그것을, 없으면 ph ± ph_tolerance를 쓴다.
 */
function outOfSpec(label: string, value: number, target: RecipeTargetParams): boolean {
  if (label !== 'pH') return false;
  const min = target.ph_min ?? (target.ph !== undefined && target.ph_tolerance !== undefined
    ? target.ph - target.ph_tolerance : undefined);
  const max = target.ph_max ?? (target.ph !== undefined && target.ph_tolerance !== undefined
    ? target.ph + target.ph_tolerance : undefined);
  if (min === undefined || max === undefined) return false;
  return value < min || value > max;
}

function specRange(target: RecipeTargetParams): string | null {
  if (target.ph_min !== undefined && target.ph_max !== undefined)
    return `허용 ${target.ph_min}–${target.ph_max}`;
  if (target.ph !== undefined && target.ph_tolerance !== undefined)
    return `허용 ${(target.ph - target.ph_tolerance).toFixed(2)}–${(target.ph + target.ph_tolerance).toFixed(2)}`;
  return null;
}

const toneFor: Record<BatchStatus, BadgeTone> = {
  preparing: 'wait',
  running: 'running',
  deviation: 'deviation',
  completed: 'done',
};

const hm = new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
const md = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

type Filter = 'active' | 'preparing' | 'completed' | 'deviation';

export function BatchWorkspace({ initialFilter }: { initialFilter?: Filter } = {}) {
  const [batches, setBatches] = useState<BatchListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>(initialFilter ?? 'active');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const reload = useCallback(() => {
    fetchBatches()
      .then(setBatches)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(reload, [reload]);

  const visible = useMemo(() => {
    if (!batches) return [];
    if (filter === 'active') return batches.filter((b) => b.status === 'running' || b.status === 'deviation');
    if (filter === 'deviation') return batches.filter((b) => b.status === 'deviation');
    if (filter === 'preparing') return batches.filter((b) => b.status === 'preparing');
    return batches.filter((b) => b.status === 'completed');
  }, [batches, filter]);

  const selected = visible.find((b) => b.id === selectedId) ?? visible[0] ?? null;

  return (
    <SplitView
      title="배치"
      count={batches?.length}
      filters={
        <>
          <FilterChip active={filter === 'active'} onClick={() => setFilter('active')}>
            진행중
          </FilterChip>
          <FilterChip active={filter === 'deviation'} onClick={() => setFilter('deviation')}>
            편차
          </FilterChip>
          <FilterChip active={filter === 'preparing'} onClick={() => setFilter('preparing')}>
            대기
          </FilterChip>
          <FilterChip active={filter === 'completed'} onClick={() => setFilter('completed')}>
            완료
          </FilterChip>
        </>
      }
      list={
        error ? (
          <p role="alert" className="p-2 text-caption text-phenol-pink">
            {error}
          </p>
        ) : !batches ? (
          <p className="p-2 text-caption text-ink-dim">불러오는 중…</p>
        ) : visible.length === 0 ? (
          <p className="p-2 text-caption text-ink-dim">해당 상태의 배치가 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {visible.map((b) => (
              <li key={b.id}>
                <Card
                  as="button"
                  selected={selected?.id === b.id}
                  onClick={() => setSelectedId(b.id)}
                  className="w-full cursor-pointer p-3 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <DataValue emphasis>{b.lot_number}</DataValue>
                    <StatusBadge tone={toneFor[b.status]}>{BATCH_STATUS_LABEL[b.status]}</StatusBadge>
                  </div>
                  <p className="mt-1.5 text-caption text-ink-soft">
                    {b.requests.buffer_recipes.name} · {b.requests.profiles.name}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )
      }
      detail={
        selected ? (
          <BatchDetail batch={selected} onChanged={reload} />
        ) : (
          <EmptyDetail>배치를 선택하세요</EmptyDetail>
        )
      }
    />
  );
}

type TabId = 'process' | 'deviations' | 'summary' | 'result';

function BatchDetail({ batch, onChanged }: { batch: BatchListItem; onChanged: () => void }) {
  const [steps, setSteps] = useState<BatchStep[] | null>(null);
  const [deviations, setDeviations] = useState<BatchDeviation[] | null>(null);
  const [tab, setTab] = useState<TabId>('process');

  const refresh = useCallback(() => {
    void fetchBatchSteps(batch.id).then(setSteps);
    void fetchBatchDeviations(batch.id).then(setDeviations);
  }, [batch.id]);

  useEffect(() => {
    setSteps(null);
    setDeviations(null);
    setTab('process');
    refresh();
  }, [batch.id, refresh]);

  const after = useCallback(() => {
    refresh();
    onChanged();
  }, [refresh, onChanged]);

  const done = steps?.filter((s) => s.status === 'done').length ?? 0;
  const total = steps?.length ?? 0;
  const processComplete = total > 0 && done === total;

  /**
   * 탭 잠금 — 워크플로우 순서를 화면이 강제한다.
   * 공정 완료 전 요약·결과 비활성, 요약 확정 전 결과 비활성(spec §9).
   * 요약 확정은 마일스톤 ④에서 붙이므로 지금은 공정 완료까지만 판정한다.
   */
  const locked: Record<TabId, string | null> = {
    process: null,
    deviations: null,
    summary: processComplete ? null : '공정을 모두 완료해야 열립니다',
    result: processComplete ? '배치 요약을 먼저 확정하세요' : '공정을 모두 완료해야 열립니다',
  };

  const target = batch.requests.buffer_recipes.target_params;
  const openCount = deviations?.filter((d) => d.status === 'open').length ?? 0;

  const tabs: { id: TabId; label: string; suffix?: string }[] = [
    { id: 'process', label: '공정', suffix: total ? `${done}/${total}` : undefined },
    { id: 'deviations', label: '편차', suffix: `${deviations?.length ?? 0}` },
    { id: 'summary', label: '요약' },
    { id: 'result', label: '결과' },
  ];

  return (
    <>
      <header className="border-b border-line bg-surface px-5 py-3">
        <div className="flex items-center gap-2">
          <DataValue emphasis className="text-[22px]">
            {batch.lot_number}
          </DataValue>
          <StatusBadge tone={toneFor[batch.status]}>{BATCH_STATUS_LABEL[batch.status]}</StatusBadge>
          {openCount > 0 && <StatusBadge tone="deviation">편차 {openCount}</StatusBadge>}
        </div>
        <p className="mt-1 font-mono text-caption text-ink-soft">
          {batch.requests.buffer_recipes.name}
          {target.ph !== undefined && ` · pH ${target.ph.toFixed(2)}`}
          {target.ph_tolerance !== undefined && ` ±${target.ph_tolerance}`}
          {target.ph_min !== undefined && ` (${target.ph_min}–${target.ph_max})`}
          {` · ${batch.requests.volume_ml} mL`}
          {` · 희망 ${md.format(new Date(batch.requests.desired_completion_at))}`}
        </p>
      </header>

      <div role="tablist" aria-label="배치 상세" className="flex border-b border-line bg-surface">
        {tabs.map(({ id, label, suffix }) => {
          const lockReason = locked[id];
          const active = tab === id;
          return (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={active}
              disabled={lockReason !== null}
              title={lockReason ?? undefined}
              onClick={() => setTab(id)}
              className={`relative flex flex-1 items-center justify-center gap-1.5 py-3 text-body transition-colors duration-150 ease-out ${
                lockReason
                  ? 'cursor-not-allowed text-ink-dim'
                  : active
                    ? 'cursor-pointer font-bold text-ink'
                    : 'cursor-pointer text-ink-soft hover:text-ink'
              }`}
            >
              {label}
              {lockReason ? (
                <Lock aria-hidden className="size-3.5" />
              ) : (
                suffix && <span className="font-mono text-caption">({suffix})</span>
              )}
              {active && !lockReason && (
                <span
                  aria-hidden
                  className="absolute inset-x-[14%] bottom-0 h-[3px] rounded-t-sm bg-indicator-teal"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {tab === 'process' && <ProcessTab steps={steps} target={target} onChanged={after} />}
        {tab === 'deviations' && <DeviationTab deviations={deviations} onChanged={after} />}
      </div>
    </>
  );
}

function ProcessTab({
  steps,
  target,
  onChanged,
}: {
  steps: BatchStep[] | null;
  target: RecipeTargetParams;
  onChanged: () => void;
}) {
  if (!steps) return <p className="text-caption text-ink-dim">불러오는 중…</p>;

  return (
    <ol className="flex flex-col">
      {steps.map((step) => {
        const isNow = step.status === 'running' || step.status === 'deviation';
        return (
          <li key={step.id}>
            <div className="flex items-center gap-3 py-2">
              <StepDot status={step.status} />
              <span
                className={`flex-1 text-body ${
                  step.status === 'todo'
                    ? 'text-ink-dim'
                    : isNow
                      ? 'font-bold'
                      : 'text-ink-soft'
                }`}
              >
                {step.seq}. {step.recipe_steps.name}
              </span>
              {step.completed_at && (
                <time className="font-mono text-caption text-ink-soft">
                  {hm.format(new Date(step.completed_at))}
                </time>
              )}
              {step.status === 'running' && (
                <span className="font-mono text-caption font-bold text-indicator-teal">진행중</span>
              )}
              {step.status === 'deviation' && (
                <span className="font-mono text-caption font-bold text-phenol-pink">편차</span>
              )}
            </div>

            {/* 현재 진행 단계에만 입력 박스를 인라인 노출한다(spec §9) */}
            {isNow && <CurrentStepBox step={step} target={target} onChanged={onChanged} />}
          </li>
        );
      })}
    </ol>
  );
}

function StepDot({ status }: { status: BatchStep['status'] }) {
  if (status === 'done')
    return (
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-indicator-green text-[11px] text-white">
        ✓
      </span>
    );
  if (status === 'running')
    return <span className="size-5 shrink-0 rounded-full bg-indicator-teal outline outline-[3px] outline-indicator-teal/20" />;
  if (status === 'deviation')
    return <span className="size-5 shrink-0 rounded-full bg-phenol-pink outline outline-[3px] outline-phenol-pink/20" />;
  return <span className="size-5 shrink-0 rounded-full border-[1.5px] border-line bg-surface" />;
}

function CurrentStepBox({
  step,
  target,
  onChanged,
}: {
  step: BatchStep;
  target: RecipeTargetParams;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { kind, reagent, target_amount, target_unit, note } = step.recipe_steps;
  const auto = step.measurements.filter((m) => m.source === 'instrument');
  const badge = auto.find((m) => m.instrument_id && m.captured_at);

  return (
    <div className="ml-8 mb-3 mt-1 rounded-card border-[1.5px] border-indicator-teal bg-surface p-4 shadow-ring">
      <h3 className="text-body font-bold">측정값 기록</h3>

      {kind === 'titrated' && (
        <p className="mt-1.5 text-caption text-ink-soft">
          {reagent}는 <b>적정 시약</b>입니다 — 목표 pH에 도달할 때까지 투입하며, 단계 완료는
          투입량이 아니라 <b>측정 pH가 허용 범위에 들어왔는지</b>로 판정합니다.
        </p>
      )}
      {kind === 'weighed' && target_amount !== null && (
        <p className="mt-1.5 font-mono text-caption text-ink-soft">
          목표 {target_amount} {target_unit} · {reagent}
        </p>
      )}
      {note && <p className="mt-1.5 text-caption text-ink-soft">{note}</p>}

      <div className="mt-3 flex flex-wrap gap-3">
        {auto.map((m) => {
          const bad = outOfSpec(m.label, m.value, target);
          return (
            <div key={m.id} className="min-w-32 flex-1">
              <div className="mb-1 text-caption text-ink-soft">
                {m.label} <span className="text-indicator-teal">· 계측기 연동</span>
                {bad && <span className="ml-1 font-semibold text-phenol-pink">· 범위 이탈</span>}
              </div>
              <output
                className={`block rounded-control border px-3 py-2 font-mono font-bold ${
                  bad
                    ? 'border-phenol-pink/45 bg-phenol-pink/[.06] text-phenol-pink'
                    : 'border-indicator-teal/30 bg-indicator-teal/[.06] text-indicator-teal'
                }`}
              >
                {m.value} {m.unit}
              </output>
              {bad && specRange(target) && (
                <p className="mt-1 font-mono text-caption text-phenol-pink">{specRange(target)}</p>
              )}
            </div>
          );
        })}
        {auto.length === 0 && (
          <p className="text-caption text-ink-dim">이 단계에는 아직 자동 수집값이 없습니다.</p>
        )}
      </div>

      {badge?.instrument_id && badge.captured_at && (
        <div className="mt-3">
          <InstrumentBadge
            instrumentId={badge.instrument_id}
            capturedAt={new Date(badge.captured_at)}
            hint="· 수동 입력하려면 값을 탭하세요"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-caption text-phenol-pink">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-3">
        <Button
          variant="sign"
          touch
          className="flex-[2]"
          disabled={busy || step.status === 'deviation'}
          title={step.status === 'deviation' ? '편차를 먼저 조치해야 합니다' : undefined}
          onClick={() => {
            setBusy(true);
            setError(null);
            completeStep(step.id)
              .then(onChanged)
              .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
              .finally(() => setBusy(false));
          }}
        >
          {busy ? '처리 중…' : '단계 완료'}
        </Button>
        <Button
          variant="deviation"
          touch
          className="flex-1"
          disabled={busy || step.status === 'deviation'}
          onClick={() => setRegistering(true)}
        >
          편차 등록
        </Button>
      </div>

      <PromptDialog
        open={registering}
        title="편차 등록"
        description="공정 흐름을 벗어나지 않고 이 자리에서 기록합니다. 원인·조치는 편차 탭에서 이어서 입력합니다."
        fields={[
          {
            name: 'description',
            label: '무엇이 어긋났습니까',
            placeholder: '예) 측정 pH 8.12 — 허용 7.95–8.05 상한 이탈',
          },
        ]}
        confirmLabel="편차 등록"
        confirmVariant="deviation"
        onCancel={() => setRegistering(false)}
        onConfirm={async (v) => {
          await registerDeviation(step.id, v.description ?? '');
          setRegistering(false);
          onChanged();
        }}
      />
    </div>
  );
}

function DeviationTab({
  deviations,
  onChanged,
}: {
  deviations: BatchDeviation[] | null;
  onChanged: () => void;
}) {
  const [resolving, setResolving] = useState<BatchDeviation | null>(null);
  if (!deviations) return <p className="text-caption text-ink-dim">불러오는 중…</p>;
  if (deviations.length === 0)
    return <p className="text-caption text-ink-dim">등록된 편차가 없습니다.</p>;

  return (
    <ul className="flex flex-col gap-3">
      {deviations.map((d) => (
        <li key={d.id}>
          <Card className={`p-4 ${d.status === 'open' ? 'border-phenol-pink/40' : ''}`}>
            <div className="flex items-center justify-between gap-2">
              <DataValue emphasis>{d.code}</DataValue>
              <StatusBadge tone={d.status === 'open' ? 'deviation' : 'done'}>
                {DEVIATION_STATUS_LABEL[d.status]}
              </StatusBadge>
            </div>
            {d.process_steps && (
              <p className="mt-1 text-caption text-ink-soft">
                {d.process_steps.seq}단계 · {d.process_steps.recipe_steps.name}
              </p>
            )}
            <p className="mt-2 text-body">{d.description}</p>

            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-caption">
              <dt className="text-ink-soft">원인</dt>
              <dd className={d.cause ? '' : 'text-ink-dim'}>{d.cause ?? '미입력'}</dd>
              <dt className="text-ink-soft">조치</dt>
              <dd className={d.corrective_action ? '' : 'text-ink-dim'}>
                {d.corrective_action ?? '미입력'}
              </dd>
            </dl>

            {d.status === 'open' && (
              <div className="mt-3">
                <Button variant="primary" touch onClick={() => setResolving(d)}>
                  원인 · 조치 입력
                </Button>
              </div>
            )}
          </Card>
        </li>
      ))}

      <PromptDialog
        open={resolving !== null}
        title={`${resolving?.code ?? ''} 조치 완료`}
        description="원인과 조치를 모두 남겨야 편차를 닫을 수 있습니다. 마지막 편차가 닫히면 배치가 다시 진행중으로 돌아갑니다."
        fields={[
          { name: 'cause', label: '원인', placeholder: '예) 적정 과잉 — 산 투입 속도 과다' },
          { name: 'action', label: '조치', placeholder: '예) NaOH로 재조정 후 재측정. 7.99 확인' },
        ]}
        confirmLabel="조치 완료"
        confirmVariant="sign"
        onCancel={() => setResolving(null)}
        onConfirm={async (v) => {
          if (!resolving) return;
          await resolveDeviation(resolving.id, v.cause ?? '', v.action ?? '');
          setResolving(null);
          onChanged();
        }}
      />
    </ul>
  );
}
