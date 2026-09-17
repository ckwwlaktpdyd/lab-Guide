import { Navigate, Route, Routes } from 'react-router-dom';
import { useSession } from '@shared/db';
import { ClientNav } from './components/ClientNav';
import { ClientDashboard } from './routes/ClientDashboard';
import { RequestList } from './routes/RequestList';
import { RequestDetail } from './routes/RequestDetail';

/**
 * 의뢰자 포털 — 웹/모바일 반응형.
 * 탭 메뉴: 대시보드 · 진행 중 · 완료. 상태 탭은 같은 리스트 컴포넌트다(docs/feedback-0914.md §1).
 */
export function ClientApp() {
  const { session, role, loading } = useSession();

  if (loading) return <div className="grid min-h-dvh place-items-center bg-paper text-ink-dim">…</div>;
  if (!session) return <Navigate to="/" replace />;
  if (role !== 'client') {
    return (
      <div className="grid min-h-dvh place-items-center bg-paper px-8 text-center">
        <p className="text-body text-ink-soft">
          의뢰자 계정으로만 접근할 수 있습니다.
          <br />
          <a href="/" className="font-semibold text-indicator-teal">
            처음으로 돌아가기
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-paper">
      <ClientNav />
      <Routes>
        <Route index element={<ClientDashboard />} />
        <Route path="active" element={<RequestList stage="in_progress" />} />
        <Route path="done" element={<RequestList stage="done" />} />
        <Route path="requests/:id" element={<RequestDetail />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </div>
  );
}
