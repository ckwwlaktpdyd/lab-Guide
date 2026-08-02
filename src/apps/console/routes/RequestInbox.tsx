import { useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  Button,
  Card,
  DataValue,
  InstrumentBadge,
  StatusBadge,
  type BadgeTone,
} from '@shared/ui';
import {
  REQUEST_TYPE_LABEL,
  fetchPendingRequests,
  fetchResultMeasurementsByLot,
  type RequestListItem,
  type RequestType,
  type ResultMeasurement,
} from '@shared/db';
import { EmptyDetail, FilterChip, SplitView } from '../components/SplitView';

type Filter = 'all' | 'new' | 'remake';

const toneFor: Record<RequestType, BadgeTone> = {
  new: 'wait',
  resubmit: 'wait',
  remake: 'remake',
};

const dt = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function since(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.round(hours / 24)}일 전`;
}

export function RequestInbox() {
  const [items, setItems] = useState<RequestListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingRequests()
      .then(setItems)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const visible = useMemo(() => {
    if (!items) return [];
    if (filter === 'all') return items;
    if (filter === 'remake') return items.filter((r) => r.request_type === 'remake');
    return items.filter((r) => r.request_type !== 'remake');
  }, [items, filter]);

  const selected = visible.find((r) => r.id === selectedId) ?? visible[0] ?? null;

  return (
    <SplitView
      title="의뢰함"
      count={items?.length}
      filters={
        <>
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            전체
          </FilterChip>
          <FilterChip active={filter === 'new'} onClick={() => setFilter('new')}>
            신규
          </FilterChip>
          <FilterChip active={filter === 'remake'} onClick={() => setFilter('remake')}>
            재제조
          </FilterChip>
        </>
      }
      list={
        error ? (
          <p role="alert" className="p-2 text-caption text-phenol-pink">
            {error}
          </p>
        ) : !items ? (
          <p className="p-2 text-caption text-ink-dim">불러오는 중…</p>
        ) : visible.length === 0 ? (
          <p className="p-2 text-caption text-ink-dim">대기중인 의뢰가 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {visible.map((r) => (
              <li key={r.id}>
                <Card
                  as="button"
                  selected={selected?.id === r.id}
                  onClick={() => setSelectedId(r.id)}
                  className="w-full cursor-pointer p-3 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <DataValue emphasis>{r.code}</DataValue>
                    <StatusBadge tone={toneFor[r.request_type]}>
                      {REQUEST_TYPE_LABEL[r.request_type]}
                    </StatusBadge>
                  </div>
                  <p className="mt-1.5 text-caption text-ink-soft">
                    {r.recipe.name} · {r.requester.name} · {since(r.created_at)}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )
      }
      detail={selected ? <RequestDetail request={selected} /> : <EmptyDetail>의뢰를 선택하세요</EmptyDetail>}
    />
  );
}

function RequestDetail({ request }: { request: RequestListItem }) {
  const { target_params: target } = request.recipe;
  const originLot = request.parent?.batches?.lot_number ?? null;

  return (
    <>
      <header className="border-b border-line bg-surface px-5 py-3">
        <div className="flex items-center gap-2">
          <DataValue emphasis className="text-[22px]">
            {request.code}
          </DataValue>
          <StatusBadge tone={toneFor[request.request_type]}>
            {REQUEST_TYPE_LABEL[request.request_type]}
          </StatusBadge>
        </div>
        <p className="mt-1 font-mono text-caption text-ink-soft">
          {request.recipe.name}
          {target.ph !== undefined && ` · pH ${target.ph.toFixed(2)}`}
          {target.ph_tolerance !== undefined && ` ±${target.ph_tolerance}`}
          {` · ${request.volume_ml} mL`}
          {` · 희망 ${dt.format(new Date(request.desired_completion_at))}`}
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
        {request.request_type === 'remake' && (
          <>
            <section className="rounded-card border border-phenol-pink/35 bg-phenol-pink/[.04] p-4">
              <h2 className="flex items-center gap-1.5 text-body font-bold text-phenol-pink">
                <RotateCcw aria-hidden className="size-4" />
                재제조 사유
                {originLot && (
                  <span className="font-normal text-ink-soft">
                    · 원본 <DataValue>{originLot}</DataValue>
                  </span>
                )}
              </h2>
              <p className="mt-2 whitespace-pre-line text-body leading-relaxed text-ink-soft">
                {request.reason}
              </p>
              <p className="mt-2 font-mono text-caption text-ink-soft">
                {request.requester.name} · {dt.format(new Date(request.created_at))}
              </p>
            </section>

            {originLot && <OriginResult lotNumber={originLot} />}
          </>
        )}

        {request.request_type !== 'remake' && (
          <section className="rounded-card border border-line bg-surface p-4">
            <h2 className="text-body font-bold">요청 정보</h2>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 font-mono text-caption">
              <dt className="text-ink-soft">의뢰자</dt>
              <dd>
                {request.requester.name} · {request.requester.org}
              </dd>
              <dt className="text-ink-soft">레시피</dt>
              <dd>{request.recipe.name}</dd>
              <dt className="text-ink-soft">부피</dt>
              <dd>{request.volume_ml} mL</dd>
              <dt className="text-ink-soft">희망 완료</dt>
              <dd>{dt.format(new Date(request.desired_completion_at))}</dd>
            </dl>
          </section>
        )}

        <div className="mt-auto flex gap-3 pt-2">
          <Button variant="primary" touch className="flex-[2]">
            수락 → 배치 생성
          </Button>
          <Button variant="ghost" touch className="flex-1">
            반려 (사유 입력)
          </Button>
        </div>
      </div>
    </>
  );
}

/**
 * 재제조 판단에는 원본 배치 결과가 필요하다 — 어떤 값이 어긋났는지 보고 수락 여부를 정한다.
 * 콘솔에서만 대조 표시한다(spec §9).
 */
function OriginResult({ lotNumber }: { lotNumber: string }) {
  const [rows, setRows] = useState<ResultMeasurement[] | null>(null);

  useEffect(() => {
    void fetchResultMeasurementsByLot(lotNumber).then(setRows);
  }, [lotNumber]);

  const instrument = rows?.find((m) => m.instrument_id && m.captured_at);

  return (
    <section className="rounded-card border border-line bg-surface p-4">
      <h2 className="text-body font-bold">
        원본 배치 결과 <span className="font-normal text-ink-soft">· 대조용</span>
      </h2>
      {!rows ? (
        <p className="mt-2 text-caption text-ink-dim">불러오는 중…</p>
      ) : (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 font-mono text-body">
          {rows.map((m) => (
            <div key={m.label} className="contents">
              <dt className="text-ink-soft">{m.label}</dt>
              <dd>
                <b>{m.value}</b> {m.unit}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {instrument?.instrument_id && instrument.captured_at && (
        <div className="mt-3">
          <InstrumentBadge
            instrumentId={instrument.instrument_id}
            capturedAt={new Date(instrument.captured_at)}
          />
        </div>
      )}
    </section>
  );
}
