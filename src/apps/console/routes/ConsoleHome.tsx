import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Inbox, PlayCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, DataValue, StatusBadge } from '@shared/ui';
import {
  REQUEST_TYPE_LABEL,
  fetchBatches,
  fetchCounts,
  fetchPendingRequests,
  supabase,
  type BatchListItem,
  type RequestListItem,
} from '@shared/db';

const dt = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const today = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
});

interface QueueRow {
  key: string;
  kind: '의뢰' | '편차' | '공정';
  code: string;
  detail: string;
  badge?: { label: string; tone: 'wait' | 'deviation' | 'remake' };
  action: string;
  to: string;
}

/**
 * 대시보드는 조회용이 아니라 **작업 진입점**이다(spec §9).
 * 각 행의 버튼이 해당 작업 공간으로 직행한다.
 */
export function ConsoleHome() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ pendingRequests: 0, activeBatches: 0, openDeviations: 0 });
  const [queue, setQueue] = useState<QueueRow[] | null>(null);
  const [operator, setOperator] = useState<{ name: string; org: string } | null>(null);

  useEffect(() => {
    void fetchCounts().then(setCounts);

    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase
        .from('profiles')
        .select('name, org')
        .eq('id', data.user.id)
        .single();
      if (p) setOperator(p);
    });

    void Promise.all([fetchPendingRequests(), fetchBatches()]).then(([requests, batches]) => {
      setQueue(buildQueue(requests, batches));
    });
  }, []);

  return (
    <section className="flex flex-1 flex-col overflow-hidden bg-bench">
      <header className="border-b border-line bg-surface px-5 py-3">
        <h1 className="text-[21px] font-extrabold">{today.format(new Date())}</h1>
        {operator && (
          <p className="mt-0.5 text-caption text-ink-soft">
            {operator.name} · {operator.org}
          </p>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        <div className="flex gap-4">
          <Kpi
            Icon={Inbox}
            n={counts.pendingRequests}
            label="신규 의뢰 대기"
            accent="text-indicator-amber"
            onClick={() => navigate('/console/requests')}
          />
          <Kpi
            Icon={PlayCircle}
            n={counts.activeBatches}
            label="진행중 배치"
            accent="text-indicator-teal"
            onClick={() => navigate('/console/batches')}
          />
          <Kpi
            Icon={AlertTriangle}
            n={counts.openDeviations}
            label="미해결 편차"
            accent="text-phenol-pink"
            danger
            onClick={() => navigate('/console/deviations')}
          />
        </div>

        <Card className="flex-1 p-4">
          <h2 className="text-body font-bold">처리 필요</h2>
          {!queue ? (
            <p className="mt-3 text-caption text-ink-dim">불러오는 중…</p>
          ) : queue.length === 0 ? (
            <p className="mt-3 text-caption text-ink-dim">지금 처리할 일이 없습니다.</p>
          ) : (
            <ul className="mt-1">
              {queue.map((row) => (
                <li
                  key={row.key}
                  className="flex items-center justify-between gap-4 border-b border-bench py-2.5 last:border-none"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <DataValue emphasis>{row.code}</DataValue>
                    {row.badge && (
                      <StatusBadge tone={row.badge.tone}>{row.badge.label}</StatusBadge>
                    )}
                    <span className="truncate text-caption text-ink-soft">{row.detail}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(row.to)}
                    className="shrink-0 cursor-pointer rounded-control border border-ink bg-ink px-4 py-1.5 text-caption font-bold text-white transition-colors duration-150 ease-out hover:bg-ink/90"
                  >
                    {row.action}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}

function Kpi({
  Icon,
  n,
  label,
  accent,
  danger = false,
  onClick,
}: {
  Icon: LucideIcon;
  n: number;
  label: string;
  accent: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      as="button"
      onClick={onClick}
      className={`flex-1 cursor-pointer p-4 text-left transition-colors duration-150 ease-out hover:border-ink-soft ${
        danger && n > 0 ? 'border-phenol-pink/40 bg-phenol-pink/[.04]' : ''
      }`}
    >
      <Icon aria-hidden className={`size-5 ${accent}`} />
      <div className={`mt-1 font-mono text-kpi ${accent}`}>{n}</div>
      <div className="mt-0.5 text-caption text-ink-soft">{label}</div>
    </Card>
  );
}

/** 긴급도 순 — 재제조 · 신규 의뢰 → 미해결 편차 → 진행중 공정. */
function buildQueue(requests: RequestListItem[], batches: BatchListItem[]): QueueRow[] {
  const rows: QueueRow[] = [];

  for (const r of requests) {
    rows.push({
      key: r.id,
      kind: '의뢰',
      code: r.code,
      detail:
        r.request_type === 'remake'
          ? `원본 ${r.parent?.batches?.lot_number ?? '—'} · ${r.recipe.name}`
          : `${r.recipe.name} · 희망 ${dt.format(new Date(r.desired_completion_at))}`,
      badge: {
        label: REQUEST_TYPE_LABEL[r.request_type],
        tone: r.request_type === 'remake' ? 'remake' : 'wait',
      },
      action: '검토',
      to: '/console/requests',
    });
  }

  for (const b of batches.filter((x) => x.status === 'deviation')) {
    rows.push({
      key: `dev-${b.id}`,
      kind: '편차',
      code: b.lot_number,
      detail: `${b.requests.buffer_recipes.name} · 편차 미해결`,
      badge: { label: '편차', tone: 'deviation' },
      action: '조치',
      to: '/console/deviations',
    });
  }

  for (const b of batches.filter((x) => x.status === 'running')) {
    rows.push({
      key: `run-${b.id}`,
      kind: '공정',
      code: b.lot_number,
      detail: `${b.requests.buffer_recipes.name} · 공정 진행중`,
      action: '계속',
      to: '/console/batches',
    });
  }

  return rows;
}
