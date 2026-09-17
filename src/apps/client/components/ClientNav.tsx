import { NavLink } from 'react-router-dom';
import { Search } from 'lucide-react';

const TABS = [
  { to: '/client', label: '대시보드', end: true },
  { to: '/client/active', label: '진행 중' },
  { to: '/client/done', label: '완료' },
];

/**
 * 탭 메뉴 — 토글이 아니다. 통합 검색 자리는 잡되 MVP에서는 만들지 않는다.
 * 상태별 검색창을 두면 "완료만 검색"이 되어버린다(docs/feedback-0914.md §1).
 */
export function ClientNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 sm:px-6">
        <span className="text-[17px] font-extrabold tracking-tight">
          LAB GUIDE<span className="text-indicator-teal">.</span>
        </span>

        <nav aria-label="내 의뢰" className="flex gap-1">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `relative rounded-control px-3 py-1.5 text-body transition-colors duration-150 ease-out ${
                  isActive ? 'font-bold text-ink' : 'text-ink-soft hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {t.label}
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-sm bg-indicator-teal"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            disabled
            title="통합 검색 — MVP 범위 밖"
            aria-label="검색"
            className="hidden size-9 cursor-not-allowed items-center justify-center rounded-control text-ink-dim sm:flex"
          >
            <Search aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            disabled
            title="새 의뢰 — 후순위"
            className="cursor-not-allowed rounded-control bg-ink px-4 py-1.5 text-caption font-bold text-white opacity-40"
          >
            + 새 의뢰
          </button>
          <span aria-hidden className="size-8 rounded-full bg-ph-mark" />
        </div>
      </div>
    </header>
  );
}
