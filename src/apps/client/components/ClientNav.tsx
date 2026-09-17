import { NavLink } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';

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
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6">
        <span className="shrink-0 whitespace-nowrap text-[17px] font-extrabold tracking-tight">
          LAB GUIDE<span className="text-indicator-teal">.</span>
        </span>

        <nav aria-label="내 의뢰" className="flex gap-0.5 sm:gap-1">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `relative whitespace-nowrap rounded-control px-2 py-1.5 text-body transition-colors duration-150 ease-out sm:px-3 ${
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
                      className="absolute inset-x-2 -bottom-[13px] h-0.5 rounded-sm bg-indicator-teal sm:inset-x-3"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
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
            aria-label="새 의뢰"
            className="flex cursor-not-allowed items-center gap-1 whitespace-nowrap rounded-control bg-ink px-2.5 py-1.5 text-caption font-bold text-white opacity-40 sm:px-4"
          >
            <Plus aria-hidden className="size-4" />
            <span className="hidden sm:inline">새 의뢰</span>
          </button>
          <span aria-hidden className="hidden size-8 rounded-full bg-ph-mark sm:block" />
        </div>
      </div>
    </header>
  );
}
