import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RotateGuard } from '@shared/ui';
import { fetchCounts, useSession } from '@shared/db';
import { IconRail } from './components/IconRail';
import { RequestInbox } from './routes/RequestInbox';
import { BatchWorkspace } from './routes/BatchWorkspace';

/**
 * 제조자 콘솔 — 아이패드 미니 가로 전용(1133×744).
 * 한 화면에 들어가야 하므로 바깥은 스크롤하지 않고 각 열이 따로 스크롤한다.
 */
export function ConsoleApp() {
  const { session, role, loading } = useSession();
  const [counts, setCounts] = useState({ pendingRequests: 0, activeBatches: 0, openDeviations: 0 });

  useEffect(() => {
    if (role === 'manufacturer') void fetchCounts().then(setCounts);
  }, [role]);

  if (loading) return <div className="grid min-h-dvh place-items-center bg-bench text-ink-dim">…</div>;
  if (!session) return <Navigate to="/" replace />;

  // 의뢰자가 URL로 직접 들어오면 RLS가 데이터를 막지만, 빈 화면을 보여주는 대신 돌려보낸다.
  if (role !== 'manufacturer') {
    return (
      <div className="grid min-h-dvh place-items-center bg-bench px-8 text-center">
        <p className="text-body text-ink-soft">
          제조자 계정으로만 접근할 수 있습니다.
          <br />
          <a href="/" className="font-semibold text-indicator-teal">
            처음으로 돌아가기
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-bench">
      <RotateGuard />
      <IconRail pendingRequests={counts.pendingRequests} openDeviations={counts.openDeviations} />
      <Routes>
        <Route index element={<Navigate to="batches" replace />} />
        <Route path="requests" element={<RequestInbox />} />
        <Route path="batches" element={<BatchWorkspace />} />
        <Route path="deviations" element={<Navigate to="../batches" replace />} />
        <Route path="*" element={<Navigate to="batches" replace />} />
      </Routes>
    </div>
  );
}
