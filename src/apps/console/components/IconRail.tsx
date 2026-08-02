import { NavLink } from 'react-router-dom';
import { AlertTriangle, FlaskConical, Home, Inbox, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface RailItem {
  to: string;
  label: string;
  Icon: LucideIcon;
  badge?: number;
  disabled?: boolean;
}

interface IconRailProps {
  pendingRequests: number;
  openDeviations: number;
}

/**
 * 다크 아이콘 레일 88pt. 풀 사이드바 대신 아이콘 레일을 쓰는 이유는
 * 콘텐츠 폭 확보 + 장갑 착용 시 큰 타겟이 유리하기 때문이다(docs/ui-rules.md §4).
 */
export function IconRail({ pendingRequests, openDeviations }: IconRailProps) {
  const items: RailItem[] = [
    { to: '/console', label: '홈', Icon: Home },
    { to: '/console/requests', label: '의뢰', Icon: Inbox, badge: pendingRequests },
    { to: '/console/batches', label: '배치', Icon: FlaskConical },
    { to: '/console/deviations', label: '편차', Icon: AlertTriangle, badge: openDeviations },
    { to: '/console/equipment', label: '장비', Icon: Wrench, disabled: true },
  ];

  return (
    <nav
      aria-label="주 메뉴"
      className="flex w-rail shrink-0 flex-col items-center gap-2 bg-ink py-4"
    >
      {/* 브랜드 마크 — 그라디언트가 허용되는 두 곳 중 하나 */}
      <div className="mb-3 size-11 rounded-[26%] bg-ph-mark" aria-hidden />

      {items.map(({ to, label, Icon, badge, disabled }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/console'}
          aria-disabled={disabled}
          onClick={(e) => disabled && e.preventDefault()}
          className={({ isActive }) =>
            [
              'relative flex size-touch flex-col items-center justify-center gap-1 rounded-[24%]',
              'text-[11px] font-semibold transition-colors duration-150 ease-out',
              disabled
                ? 'cursor-not-allowed text-white/25'
                : isActive
                  ? 'bg-white/[.13] text-white'
                  : 'cursor-pointer text-white/55 hover:text-white/80',
            ].join(' ')
          }
        >
          {({ isActive }) => (
            <>
              {isActive && !disabled && (
                <span
                  aria-hidden
                  className="absolute -left-2 top-1/4 h-1/2 w-[3px] rounded-sm bg-indicator-teal"
                />
              )}
              <Icon aria-hidden className="size-5" />
              {label}
              {badge !== undefined && badge > 0 && (
                <span className="absolute -right-1 -top-1 flex size-[18px] items-center justify-center rounded-full bg-phenol-pink font-mono text-[10px] text-white">
                  {badge}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
