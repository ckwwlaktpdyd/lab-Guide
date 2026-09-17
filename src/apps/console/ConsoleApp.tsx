import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { RotateGuard } from '@shared/ui';
import { fetchCounts, useSession } from '@shared/db';
import { IconRail } from './components/IconRail';
import { ConsoleHome } from './routes/ConsoleHome';
import { RequestList, RequestDetailScreen } from './routes/RequestInbox';
import { BatchList, BatchDetailScreen } from './routes/BatchWorkspace';

/**
 * 제조자 콘솔 — 아이패드 미니 세로 전용(744×1133).
 * 좌측 레일 72pt + 콘텐츠. 리스트 → 상세는 스택 전환이다.
 */
export function ConsoleApp() {
  const { session, role, loading } = useSession();
  const [counts, setCounts] = useState({ pendingRequests: 0, activeBatches: 0, openDeviations: 0 });

  const location = useLocation();
  useEffect(() => {
    if (role === 'manufacturer') void fetchCounts().then(setCounts);
    // 수락·편차 조치로 카운트가 바뀌므로 화면을 옮길 때마다 다시 센다.
  }, [role, location.pathname]);

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
        <Route index element={<ConsoleHome />} />
        <Route path="requests" element={<RequestList />} />
        <Route path="requests/:id" element={<RequestDetailScreen />} />
        <Route path="batches" element={<BatchList />} />
        <Route path="batches/:id" element={<BatchDetailScreen />} />
        <Route path="deviations" element={<BatchList initialFilter="deviation" />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </div>
  );
}
