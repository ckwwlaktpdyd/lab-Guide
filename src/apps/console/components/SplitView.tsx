import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * 세로(744) 폭에서는 리스트와 상세를 나란히 둘 수 없다.
 * 리스트 화면 → 상세 화면으로 전환하는 스택 구조다. 대시보드가 작업 진입점이라
 * 대부분은 대시보드에서 상세로 바로 들어가고, 리스트는 둘러볼 때 쓴다.
 */

interface ListScreenProps {
  title: string;
  count?: number;
  filters?: ReactNode;
  children: ReactNode;
}

export function ListScreen({ title, count, filters, children }: ListScreenProps) {
  return (
    <section aria-label={title} className="flex flex-1 flex-col overflow-hidden bg-bench">
      <header className="flex items-baseline justify-between border-b border-line bg-surface px-5 py-3">
        <h1 className="text-title">{title}</h1>
        {count !== undefined && <span className="font-mono text-caption text-ink-soft">{count}</span>}
      </header>
      {filters && (
        <div className="flex gap-2 overflow-x-auto border-b border-line bg-surface px-5 py-2.5">{filters}</div>
      )}
      <div className="flex-1 overflow-y-auto p-4">{children}</div>
    </section>
  );
}

interface DetailScreenProps {
  /** 뒤로 가기 목적지와 라벨 */
  back: { to: string; label: string };
  children: ReactNode;
}

export function DetailScreen({ back, children }: DetailScreenProps) {
  return (
    <section className="flex flex-1 flex-col overflow-hidden bg-bench">
      <Link
        to={back.to}
        className="flex min-h-touch items-center gap-1.5 border-b border-line bg-surface px-4 text-caption font-semibold text-ink-soft hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-4" /> {back.label}
      </Link>
      {children}
    </section>
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
      className={`min-h-9 cursor-pointer whitespace-nowrap rounded-chip border px-3.5 text-caption transition-colors duration-150 ease-out ${
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
