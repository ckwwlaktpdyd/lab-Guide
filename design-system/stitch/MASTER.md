# Design System Master File — Stitch

> **LOGIC:** When building a specific page, first check `design-system/stitch/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Stitch (Laboratory Manufacturing QC Platform)
**Updated:** 2026-04-12
**Category:** Industrial SaaS / Lab Operations
**Style:** Soft UI Evolution (Evolved Neumorphism with improved contrast)

---

## Global Rules

### Brand Color Palette

| Role | Hex | Tailwind | CSS Variable | Usage |
|------|-----|----------|-------------|-------|
| Primary | `#ec5b13` | `text-primary` / `bg-primary` | `--color-primary` | 브랜드 아이덴티티, 현재 상태 강조 |
| Accent | `#006666` | - | `--color-accent` | 네비게이션 활성, 보조 강조 |
| CTA | `#ec5b13` | `bg-primary` | `--color-cta` | 주요 행동 유도 버튼 |
| Secondary Action | `slate-700` | `bg-slate-700` | - | 보조 액션 (취소, 뒤로가기) |
| Background | `#E7E5E4` | `bg-surface` | `--color-bg` | 전체 배경 (뉴모피즘 기반) |
| Surface | `#FFFFFF` | `bg-white` | `--color-surface` | 카드, 모달 내부 |
| Text Primary | `#1E2938` | `text-ink` | `--color-text` | 본문, 제목 |
| Text Secondary | `#57534e` | `text-ink-soft` | `--color-text-muted` | 부제, 설명 |
| Text Muted | `#a8a29e` | `text-ink-muted` | `--color-text-dim` | 힌트, 레이블 |
| Success | `#00A63D` | `text-pass` | `--color-success` | 완료, 정상 |
| Warning | `#FE9900` | `text-warn` | `--color-warning` | 경고, MED 이슈 |
| Danger | `#FF2157` | `text-fail` | `--color-danger` | 에러, HIGH 이슈 |

**Color Notes:**
- Primary(`#ec5b13`)는 Stitch 브랜드 고유 색상으로 변경 금지
- CTA와 Primary가 동일 색상이므로, Secondary Action은 반드시 `slate-700/800`으로 분리하여 시각적 계층을 확보할 것
- 이슈 심각도: HIGH → `red-500/600`, MED → `amber-400/600`

### Typography

- **Heading/Title:** Space Mono, JetBrains Mono (monospace)
- **Body:** Inter, Noto Sans KR (한글 폴백)
- **Data/Numeric:** JetBrains Mono + `font-variant-numeric: tabular-nums`
- **Mood:** technical, precise, laboratory, data-driven

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+KR:wght@400;500;700&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
```

**Tailwind Config:**
```js
fontFamily: {
  "sans":  ["Inter", "Noto Sans KR", "Apple SD Gothic Neo", "sans-serif"],
  "title": ["Space Mono", "JetBrains Mono", "monospace"],
  "mono":  ["JetBrains Mono", "monospace"],
}
```

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | 아이콘 간격, 인라인 |
| `--space-sm` | `8px` / `0.5rem` | 뱃지, 칩 내부 |
| `--space-md` | `16px` / `1rem` | 카드 패딩, 표준 간격 |
| `--space-lg` | `24px` / `1.5rem` | 섹션 패딩 |
| `--space-xl` | `32px` / `2rem` | 페이지 마진 |

### Shadow Depths (Neumorphism)

| Level | Value | Usage |
|-------|-------|-------|
| `neu-raised` | `6px 6px 12px #bebebe, -6px -6px 12px #ffffff` | 카드, 상위 요소 |
| `neu-inset` | `inset 4px 4px 8px #bebebe, inset -4px -4px 8px #ffffff` | 눌린 상태, 메타 정보 영역 |
| `neu-btn` | `4px 4px 8px #bebebe, -4px -4px 8px #ffffff` | 버튼 기본 |
| `neu-btn:active` | `inset 3px 3px 6px #bebebe, inset -3px -3px 6px #ffffff` | 버튼 누름 |

### Border Radius

| Token | Value |
|-------|-------|
| DEFAULT | `0.375rem` (6px) |
| lg | `10px` |
| xl | `14px` |
| 2xl | `1rem` (16px) |
| full | `9999px` |

---

## Component Specs

### Buttons

```css
/* Primary CTA Button (Neumorphic Gradient) */
.neu-btn-primary {
  background: linear-gradient(135deg, #007a7a 0%, #005252 100%);
  border-radius: 14px;
  box-shadow: 4px 4px 8px #bebebe, -4px -4px 8px #ffffff,
              inset 0 1px 0 rgba(255,255,255,0.15);
  color: white;
  transition: all 0.15s ease;
  cursor: pointer;
}

/* Secondary Button (Flat Neumorphic) */
.neu-btn {
  background: #E7E5E4;
  border-radius: 14px;
  box-shadow: 4px 4px 8px #bebebe, -4px -4px 8px #ffffff;
  transition: all 0.15s ease;
  cursor: pointer;
}
```

### Cards

```css
.card-tap {
  -webkit-tap-highlight-color: transparent;
  transition: all 0.15s ease;
}
.card-tap:active {
  box-shadow: inset 3px 3px 6px #bebebe, inset -3px -3px 6px #ffffff !important;
  transform: scale(0.99);
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
}
.modal-panel {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 20px 25px rgba(0,0,0,0.15);
  max-width: 500px;
  width: 90%;
}
```

---

## Accessibility Rules (WCAG AA+ Required)

### P0 — Critical (Must have)

1. **`prefers-reduced-motion: reduce`** — All HTML files must include:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

2. **Visible Focus States** — Use `focus-visible:ring-2` (not `focus:ring-2`):
```html
<!-- ✅ Good: focus ring only for keyboard users -->
<button class="focus-visible:ring-2 focus-visible:ring-primary/40">

<!-- ❌ Bad: focus ring on mouse click too -->
<button class="focus:ring-2 focus:ring-primary/40">
```

3. **Semantic HTML** — Use `<button>` for actions, `<a>` for navigation. Never `<div onclick>`.

### P1 — Important (Should have)

4. **`aria-live="polite"`** on SPA content containers for screen reader announcements
5. **`tabular-nums`** on all numeric data displays (`.font-data` class)
6. **Minimum 1-2 animations per view** — Never `animate-bounce` on multiple elements

---

## Anti-Patterns (Do NOT Use)

- ❌ **Emojis as icons** — Use Material Symbols Outlined (`<span class="material-symbols-outlined">`)
- ❌ **Missing `cursor: pointer`** — All clickable elements must have `cursor-pointer`
- ❌ **`z-index: 9999`** — Use scale system: `z-10` (cards), `z-20` (sticky), `z-30` (dropdown), `z-50` (modal)
- ❌ **Linear easing** — Use `ease-out` for entering, `ease-in` for exiting
- ❌ **Placeholder-only inputs** — Always use `<label for="id">`
- ❌ **Toast that never dismisses** — Auto-dismiss in 3-5 seconds
- ❌ **`location.replace()`** — Use `history.pushState()` for SPA navigation
- ❌ **Validate only on submit** — Use `onblur` validation for forms
- ❌ **Dark mode** — 라이트 모드만 지원 (실험실 밝은 환경 전용)

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] `prefers-reduced-motion` media query present in all HTML files
- [ ] `focus-visible:ring` used (not `focus:ring`)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Text contrast 4.5:1 minimum
- [ ] `aria-live="polite"` on dynamic content areas
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile (375px min)
- [ ] Semantic HTML: `<button>` for actions, `<a>` for links
- [ ] `tabular-nums` on numeric data displays
- [ ] All icons from Material Symbols Outlined (consistent set)
- [ ] Z-index follows scale: 10 → 20 → 30 → 50
