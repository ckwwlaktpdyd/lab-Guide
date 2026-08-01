import type { Config } from 'tailwindcss';
import {
  badgeColors,
  borderRadius,
  boxShadow,
  colors,
  consoleLayout,
  fontFamily,
  fontSize,
} from './src/shared/ui/tokens';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ...colors, ...badgeColors },
      fontFamily,
      fontSize,
      borderRadius,
      boxShadow,
      backgroundImage: {
        // 시그니처 — 진행률 표현과 브랜드 마크에만 사용한다.
        'ph-progress': `linear-gradient(90deg, ${colors['indicator-amber']}, ${colors['indicator-green']}, ${colors['indicator-teal']})`,
        'ph-progress-y': `linear-gradient(180deg, ${colors['indicator-amber']}, ${colors['indicator-green']} 55%, ${colors['indicator-teal']})`,
        'ph-mark': `linear-gradient(135deg, ${colors['indicator-amber']}, ${colors['indicator-green']} 55%, ${colors['indicator-teal']})`,
      },
      spacing: {
        touch: `${consoleLayout.touchTarget}px`,
        rail: `${consoleLayout.railWidth}px`,
        list: `${consoleLayout.listWidth}px`,
      },
    },
  },
  plugins: [],
} satisfies Config;
