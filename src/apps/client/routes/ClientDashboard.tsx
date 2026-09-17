import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@shared/ui';
import {
  CLIENT_STAGE,
  CLIENT_STAGE_LABEL,
  clientStage,
  fetchMyRequests,
  needsAction,
  type ClientStage,
  type MyRequest,
} from '@shared/db';
import { RequestCard } from '../components/RequestCard';

const PAGE = 5;

const stageTo: Record<ClientStage, string | null> = {
  pending: null,
  in_progress: '/client/active',
  review: null,
  done: '/client/done',
};

/**
 * 대시보드 = 홈.
 * 상단은 상태별 현황(확인용), 하단은 "내 조치가 필요한 의뢰"(작업 진입점).
 * 완료 건은 여기에 쌓이지 않는다 — 완료 탭에서 본다(docs/feedback-0914.md §1).
 */
export function ClientDashboard() {
  const [items, setItems] = useState<MyRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchMyRequests()
      .then(setItems)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const counts = useMemo(() => {
    const c: Record<ClientStage, number> = { pending: 0, in_progress: 0, review: 0, done: 0 };
    for (const r of items ?? []) c[clientStage({ status: r.status, result: r.batch?.result ?? null, openInquiry: r.batch?.inquiries.some((q) => q.decision === null) ?? false })]++;
    return c;
  }, [items]);

  const actionable = useMemo(
    () => (items ?? []).filter((r) => needsAction({ status: r.status, result: r.batch?.result ?? null, openInquiry: r.batch?.inquiries.some((q) => q.decision === null) ?? false })),
    [items],
  );
  const pages = Math.max(1, Math.ceil(actionable.length / PAGE));
  const slice = actionable.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-display">내 의뢰</h1>
      <p className="mt-1 text-caption text-ink-soft">
        {items ? `전체 ${items.length}건` : '불러오는 중…'}
      </p>

      {error && (
        <p role="alert" className="mt-4 text-caption text-phenol-pink">
          {error}
        </p>
      )}

      {/* 상태별 현황 — 확인용. 카드가 그 상태 목록으로 이어진다. */}
      <section aria-label="상태별 현황" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CLIENT_STAGE.map((s) => {
          const to = stageTo[s];
          const body = (
            <>
              <div
                className={`font-mono text-kpi ${
                  s === 'review' && counts[s] > 0 ? 'text-indicator-teal' : 'text-ink'
                }`}
              >
                {counts[s]}
              </div>
              <div className="mt-0.5 text-caption text-ink-soft">{CLIENT_STAGE_LABEL[s]}</div>
            </>
          );
          return to ? (
            <Link key={s} to={to} className="block">
              <Card className="p-4 transition-colors duration-150 ease-out hover:border-ink-soft">
                {body}
              </Card>
            </Link>
          ) : (
            <Card key={s} className="p-4">
              {body}
            </Card>
          );
        })}
      </section>

      {/* 조치 필요 — 상태가 아니라 뷰. 이 건들은 자기 상태 목록에도 그대로 있다. */}
      <section aria-label="내 조치가 필요한 의뢰" className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-title">내 조치가 필요한 의뢰</h2>
          {actionable.length > 0 && (
            <span className="font-mono text-caption text-ink-soft">{actionable.length}건</span>
          )}
        </div>

        {!items ? (
          <p className="mt-4 text-caption text-ink-dim">불러오는 중…</p>
        ) : actionable.length === 0 ? (
          <Card className="mt-4 p-8 text-center text-body text-ink-dim">
            지금 처리할 일이 없습니다.
          </Card>
        ) : (
          <>
            <ul className="mt-4 flex flex-col gap-3">
              {slice.map((r) => (
                <li key={r.id}>
                  <RequestCard request={r} detailed />
                </li>
              ))}
            </ul>
            {pages > 1 && (
              <nav aria-label="페이지" className="mt-4 flex justify-center gap-1">
                {Array.from({ length: pages }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-current={i === page ? 'page' : undefined}
                    onClick={() => setPage(i)}
                    className={`size-8 cursor-pointer rounded-control font-mono text-caption ${
                      i === page ? 'bg-ink text-white' : 'text-ink-soft hover:bg-bench'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </nav>
            )}
          </>
        )}
      </section>
    </main>
  );
}
