import type { ReactNode } from 'react';

interface SplitViewProps {
  title: string;
  count?: number;
  filters?: ReactNode;
  list: ReactNode;
  detail: ReactNode;
}

/**
 * 리스트 320pt + 상세 나머지. 아이패드 미니 가로 한 화면에 들어가야 하므로
 * 바깥은 스크롤하지 않고 각 열이 따로 스크롤한다.
 */
export function SplitView({ title, count, filters, list, detail }: SplitViewProps) {
  return (
    <>
      <section
        aria-label={title}
        className="flex w-list shrink-0 flex-col border-r border-line bg-surface"
      >
        <header className="flex items-baseline justify-between border-b border-line px-5 py-3">
          <h1 className="text-title">{title}</h1>
          {count !== undefined && <span className="font-mono text-caption text-ink-soft">{count}</span>}
        </header>
        {filters && <div className="flex gap-2 border-b border-line px-5 py-2.5">{filters}</div>}
        <div className="flex-1 overflow-y-auto p-3">{list}</div>
      </section>

      <section className="flex flex-1 flex-col overflow-hidden bg-bench">{detail}</section>
    </>
  );
}

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function FilterChip({ active, onClick, children }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer whitespace-nowrap rounded-chip border px-3 py-1 text-caption transition-colors duration-150 ease-out ${
        active ? 'border-ink bg-ink text-white' : 'border-line text-ink-soft hover:border-ink-soft'
      }`}
    >
      {children}
    </button>
  );
}

export function EmptyDetail({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8 text-center text-body text-ink-dim">
      {children}
    </div>
  );
}
