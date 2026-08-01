import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * green은 서명·단계 완료 전용이다(CLAUDE.md). 일반 확인 액션에 쓰지 말 것.
 * deviation은 편차 등록처럼 흐름을 벗어나는 액션에만.
 */
export type ButtonVariant = 'primary' | 'sign' | 'ghost' | 'deviation';

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-white border-ink',
  sign: 'bg-indicator-green text-white border-indicator-green',
  ghost: 'bg-surface text-ink border-line',
  deviation: 'bg-surface text-phenol-pink border-phenol-pink/45',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** 제조자 콘솔에서는 항상 true — 터치 타겟 44pt 확보 */
  touch?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  touch = false,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-control border px-5 font-semibold transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-ink-dim ${
        touch ? 'min-h-touch py-2.5' : 'py-2'
      } ${variantClass[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
