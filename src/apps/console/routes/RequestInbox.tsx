import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronRight, RotateCcw } from 'lucide-react';
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
  REQUEST_TYPE_LABEL,
  acceptRequest,
  fetchPendingRequests,
  fetchRequest,
  fetchResultMeasurementsByLot,
  type RequestListItem,
  type RequestType,
  type ResultMeasurement,
  rejectRequest,
} from '@shared/db';
import { DetailScreen, FilterChip, ListScreen } from '../components/SplitView';

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

const FILTER_LABEL: Record<Filter, string> = { all: '전체', new: '신규', remake: '재제조' };

/** 의뢰함 목록. 필터는 URL(?f=)에 둔다. */
export function RequestList() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<RequestListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const filter = (params.get('f') as Filter | null) ?? 'all';

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

  return (
    <ListScreen
      title="의뢰함"
      count={items?.length}
      filters={(['all', 'new', 'remake'] as Filter[]).map((f) => (
        <FilterChip key={f} active={filter === f} onClick={() => setParams({ f })}>
          {FILTER_LABEL[f]}
        </FilterChip>
      ))}
    >
      {error ? (
        <p role="alert" className="text-caption text-phenol-pink">
          {error}
        </p>
      ) : !items ? (
        <p className="text-caption text-ink-dim">불러오는 중…</p>
      ) : visible.length === 0 ? (
        <p className="text-caption text-ink-dim">대기중인 의뢰가 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((r) => (
            <li key={r.id}>
              <Card
                as="button"
                onClick={() => navigate(`/console/requests/${r.id}?f=${filter}`)}
                className="flex min-h-touch w-full cursor-pointer items-center gap-3 p-4 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <DataValue emphasis>{r.code}</DataValue>
                    <StatusBadge tone={toneFor[r.request_type]}>{REQUEST_TYPE_LABEL[r.request_type]}</StatusBadge>
                  </div>
                  <p className="mt-1 text-caption text-ink-soft">
                    {r.recipe.name} · {r.requester.name} · {since(r.created_at)}
                  </p>
                </div>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-dim" />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </ListScreen>
  );
}

/** 의뢰 상세 화면. 수락하면 생성된 배치의 준비 탭으로 바로 간다. */
export function RequestDetailScreen() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<RequestListItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRequest(id)
      .then(setRequest)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  const f = params.get('f');
  const backTo = `/console/requests${f ? `?f=${f}` : ''}`;
  return (
    <DetailScreen back={{ to: backTo, label: '의뢰함' }}>
      {error ? (
        <p role="alert" className="p-5 text-caption text-phenol-pink">
          {error}
        </p>
      ) : !request ? (
        <p className="p-5 text-caption text-ink-dim">불러오는 중…</p>
      ) : (
        <RequestDetail
          request={request}
          onAccepted={(batchId) => navigate(`/console/batches/${batchId}`)}
          onRejected={() => navigate(backTo)}
        />
      )}
    </DetailScreen>
  );
}

function RequestDetail({
  request,
  onAccepted,
  onRejected,
}: {
  request: RequestListItem;
  onAccepted: (batchId: string) => void;
  onRejected: () => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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

        {toast && (
          <p role="status" className="rounded-control border border-indicator-green/40 bg-indicator-green/[.06] p-3 text-caption text-indicator-green">
            {toast}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-control border border-phenol-pink/45 p-3 text-caption text-phenol-pink">
            {error}
          </p>
        )}

        <div className="mt-auto flex gap-3 pt-2">
          <Button
            variant="primary"
            touch
            className="flex-[2]"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError(null);
              acceptRequest(request.id)
                .then((b) => {
                  setToast(`배치 ${b.lot_number} 생성됨 — 준비 체크로 이동합니다`);
                  setTimeout(() => onAccepted(b.id), 600);
                })
                .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
                .finally(() => setBusy(false));
            }}
          >
            {busy ? '처리 중…' : '수락 → 배치 생성'}
          </Button>
          <Button variant="ghost" touch className="flex-1" disabled={busy} onClick={() => setRejecting(true)}>
            반려 (사유 입력)
          </Button>
        </div>

        <PromptDialog
          open={rejecting}
          title={`${request.code} 반려`}
          description="사유는 의뢰자 코멘트 스레드로 전달됩니다."
          fields={[{ name: 'reason', label: '반려 사유', placeholder: '예) 요청하신 부피가 1회 제조 한도를 넘습니다' }]}
          confirmLabel="반려"
          confirmVariant="deviation"
          onCancel={() => setRejecting(false)}
          onConfirm={async (v) => {
            await rejectRequest(request.id, v.reason ?? '');
            setRejecting(false);
            onRejected();
          }}
        />
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
