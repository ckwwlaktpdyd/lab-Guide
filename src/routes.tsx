import { createBrowserRouter } from 'react-router-dom';
import { Landing } from './Landing';
import { ClientApp } from '@client/ClientApp';
import { ConsoleApp } from '@console/ConsoleApp';
import { Preview } from '@shared/ui/Preview';

/**
 * 두 앱은 라우트로 분리한다. 코드가 한 프로젝트에 있어도 UX는 완전히 별개다.
 * 공통 레이아웃·내비게이션을 공유하지 않는다(CLAUDE.md).
 */
export const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/client/*', element: <ClientApp /> },
  { path: '/console/*', element: <ConsoleApp /> },
  // 공통 컴포넌트 갤러리 — 토큰 회귀 확인용
  { path: '/preview', element: <Preview /> },
]);
