import { useEffect, useMemo, useState } from 'react';
import { Card } from '@shared/ui';
import {
  CLIENT_STAGE_LABEL,
  clientStage,
  fetchMyRequests,
  type ClientStage,
  type MyRequest,
} from '@shared/db';
import { RequestCard } from '../components/RequestCard';

/** 상태 탭 하나 = 이 컴포넌트 하나. 진행 중이든 완료든 같은 리스트다. */
export function RequestList({ stage }: { stage: ClientStage }) {
  const [items, setItems] = useState<MyRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(null);
    fetchMyRequests()
      .then(setItems)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [stage]);

  const visible = useMemo(
    () =>
      (items ?? []).filter(
        (r) => clientStage({ status: r.status, result: r.batch?.result ?? null, openInquiry: r.batch?.inquiries.some((q) => q.decision === null) ?? false }) === stage,
      ),
    [items, stage],
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-display">{CLIENT_STAGE_LABEL[stage]}</h1>
      <p className="mt-1 text-caption text-ink-soft">{items ? `${visible.length}건` : '불러오는 중…'}</p>

      {error && (
        <p role="alert" className="mt-4 text-caption text-phenol-pink">
          {error}
        </p>
      )}

      {items && visible.length === 0 ? (
        <Card className="mt-6 p-8 text-center text-body text-ink-dim">
          {CLIENT_STAGE_LABEL[stage]} 상태의 의뢰가 없습니다.
        </Card>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {visible.map((r) => (
            <li key={r.id}>
              <RequestCard request={r} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
