import { Link } from 'react-router-dom';

/**
 * 리뷰어 혼선 방지용 스위처(spec §3).
 * 두 앱이 별개라는 걸 첫 화면에서 알린다.
 */
export function Landing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <header>
        <div className="mb-6 h-1.5 w-full rounded-sm bg-ph-progress" />
        <h1 className="text-display">
          LAB GUIDE<span className="text-indicator-teal">.</span>
        </h1>
        <p className="mt-2 text-body text-ink-soft">
          버퍼 제조 QC 프로세스 관리. 역할에 따라 두 개의 독립된 화면으로 나뉩니다.
        </p>
      </header>

      <nav className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/client"
          className="rounded-card border border-line bg-surface p-6 transition-colors duration-150 ease-out hover:border-indicator-teal"
        >
          <h2 className="text-title">의뢰자 포털</h2>
          <p className="mt-1.5 text-caption text-ink-soft">
            버퍼를 의뢰하고 진행 상황을 확인한 뒤 제조 결과를 리뷰·서명합니다.
          </p>
          <p className="mt-3 font-mono text-caption text-ink-dim">웹 · 모바일 반응형</p>
        </Link>

        <Link
          to="/console"
          className="rounded-card border border-line bg-surface p-6 transition-colors duration-150 ease-out hover:border-indicator-teal"
        >
          <h2 className="text-title">제조자 콘솔</h2>
          <p className="mt-1.5 text-caption text-ink-soft">
            의뢰를 수락하고 공정을 기록하며 결과를 1차 검토(서명)합니다.
          </p>
          <p className="mt-3 font-mono text-caption text-ink-dim">아이패드 미니 가로 전용</p>
        </Link>
      </nav>
    </main>
  );
}
