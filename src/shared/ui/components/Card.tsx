import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

interface Base {
  /** 선택 상태 — 그림자가 아니라 ring으로 표현한다 */
  selected?: boolean;
  children: ReactNode;
}

type DivCard = Base & { as?: 'div' } & HTMLAttributes<HTMLDivElement>;
type ButtonCard = Base & { as: 'button' } & ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * 계층은 1px 보더 + 배경 대비로. 그림자를 쓰지 않는다.
 * 목록에서 고를 수 있는 카드는 `as="button"`으로 쓴다 —
 * div에 onClick을 달지 않는다(docs/ui-rules.md §1.3).
 */
export function Card(props: DivCard | ButtonCard) {
  const cls = (className: string | undefined, selected: boolean) =>
    `rounded-card bg-surface ${
      selected ? 'border-[1.5px] border-indicator-teal shadow-ring' : 'border border-line'
    } ${className ?? ''}`;

  if (props.as === 'button') {
    const { as: _as, selected = false, className, children, ...rest } = props;
    return (
      <button type="button" className={cls(className, selected)} {...rest}>
        {children}
      </button>
    );
  }

  const { as: _as, selected = false, className, children, ...rest } = props;
  return (
    <div className={cls(className, selected)} {...rest}>
      {children}
    </div>
  );
}
