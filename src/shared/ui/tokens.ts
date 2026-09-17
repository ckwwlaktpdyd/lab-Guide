/**
 * 디자인 토큰 — 단일 원천
 *
 * 원본: docs/mockups/design-tokens.html
 * 값을 바꿀 때는 토큰 시트와 함께 고칠 것. 컴포넌트에 hex를 직접 쓰지 않는다.
 */

/** pH 지시약 스펙트럼 — 브랜드 컬러가 곧 상태 컬러다. */
export const colors = {
  /** BTB 산성 — 대기 / 주의 */
  'indicator-amber': '#F0A62E',
  /** BTB 중성 — 완료 / 서명 */
  'indicator-green': '#3AA05F',
  /** BTB 염기 — 진행중 / 프라이머리 */
  'indicator-teal': '#0E8290',
  /** 페놀프탈레인 — 편차 / 반려 / 재제조 */
  'phenol-pink': '#E14E68',

  ink: '#17272B',
  'ink-soft': '#5C6B70',
  /** 비활성 · 잠김 · placeholder 전용. 본문에 쓰지 말 것 */
  'ink-dim': '#A7B0B2',
  line: '#D4DCDD',

  surface: '#FFFFFF',
  /** 의뢰자 포털 배경 */
  paper: '#FAFAF8',
  /** 제조자 콘솔 배경 */
  bench: '#EEF2F2',
} as const;

/**
 * 배지 전용 조합. 배경 알파 위에서 대비 4.5:1을 만족하도록 텍스트 색을 따로 고정했다.
 * amber 계열 텍스트는 #A96C0F (약 4.6:1). #B57712는 3.9:1로 미달이라 쓰지 않는다.
 */
export const badgeColors = {
  'badge-amber-bg': 'rgba(240,166,46,.15)',
  'badge-amber-fg': '#A96C0F',
  'badge-teal-bg': 'rgba(14,130,144,.12)',
  'badge-green-bg': 'rgba(58,160,95,.14)',
  'badge-green-fg': '#2C7F4B',
  'badge-inst-bg': 'rgba(14,130,144,.10)',
} as const;

/** 그림자는 쓰지 않는다. 선택·포커스는 ring으로만 표현한다. */
export const boxShadow = {
  none: 'none',
  ring: '0 0 0 3px rgba(14,130,144,.08)',
  'ring-focus': '0 0 0 3px rgba(14,130,144,.20)',
} as const;

export const borderRadius = {
  card: '12px',
  control: '8px',
  badge: '6px',
  chip: '999px',
} as const;

export const fontFamily = {
  sans: ['Pretendard Variable', 'Pretendard', '-apple-system', 'sans-serif'],
  /** LOT · 측정값 · 타임스탬프 */
  mono: ['JetBrains Mono', 'ui-monospace', 'Menlo', 'monospace'],
} satisfies Record<string, string[]>;

/** Tailwind fontSize 형식 — [크기, { 행간, 굵기 }] */
type FontSizeEntry = [string, { lineHeight: string; fontWeight?: string }];

export const fontSize = {
  display: ['26px', { lineHeight: '1.25', fontWeight: '800' }],
  title: ['19px', { lineHeight: '1.4', fontWeight: '700' }],
  body: ['15px', { lineHeight: '1.6', fontWeight: '400' }],
  caption: ['12.5px', { lineHeight: '1.5', fontWeight: '400' }],
  data: ['15px', { lineHeight: '1.5' }],
  kpi: ['32px', { lineHeight: '1.05', fontWeight: '700' }],
} satisfies Record<string, FontSizeEntry>;

/**
 * 제조자 콘솔 — 아이패드 미니 세로(744×1133) 전용.
 * 폭이 좁아 리스트·상세를 나란히 둘 수 없다. 리스트 → 상세는 화면 전환(스택)이고,
 * 다크 아이콘 레일은 72pt로 좁혀 왼쪽에 유지한다.
 */
export const consoleLayout = {
  viewport: { width: 744, height: 1133 },
  railWidth: 80,
  /** 레일을 뺀 콘텐츠 폭 */
  contentWidth: 744 - 80,
  /** 터치 타겟 최소 */
  touchTarget: 44,
  /** 레일 항목 — 손에 들고 엄지로 누르므로 최소보다 넉넉히 */
  railTarget: 56,
} as const;
