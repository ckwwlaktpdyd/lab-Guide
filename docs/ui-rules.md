# UI 구현 규칙

*(`design-system/stitch/MASTER.md` 접근성 규칙 + `docs/archive/*-spec.md` 실측값 승계분 · 2026-08-01)*

디자인 **값**은 `docs/mockups/design-tokens.html`이 기준이다. 이 문서는 그 값을 **어떻게 구현할지**의 규칙이다.
Stitch 디자인 시스템(뉴모피즘·오렌지 팔레트)은 폐기됐지만, 접근성 규칙은 팔레트와 무관하게 유효해 이곳으로 옮겼다.

---

## 1. 접근성 P0 — 필수

### 1.1 `prefers-reduced-motion`
전역 CSS에 상시 포함한다. (구 `patch_p0.js`가 매번 주입하던 것을 기본값으로 승격)

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

### 1.2 포커스는 `focus-visible`
마우스 클릭에는 링이 뜨지 않고 키보드 탐색에만 뜬다.

```tsx
// ✅
<button className="focus-visible:ring-2 focus-visible:ring-teal/40 focus-visible:outline-none">
// ❌
<button className="focus:ring-2">
```

포커스 링은 `ring` 토큰을 쓴다 — 그림자가 아니다. 플랫 원칙(그림자 없음)과 충돌하지 않는다.

### 1.3 시맨틱 HTML
액션은 `<button>`, 내비게이션은 `<a>`/`<Link>`. **`<div onClick>` 금지.**
시안 HTML의 `<div class="btn">`은 시연용 마크업이므로 옮길 때 반드시 실제 요소로 바꾼다.

### 1.4 대비 4.5:1 이상
확정 팔레트는 검증을 마쳤다. 새 조합을 만들 때 재확인할 것.
- `b-wait` 텍스트는 `#A96C0F` (약 4.6:1). ~~`#B57712`~~는 3.9:1로 미달이라 폐기됨.
- `ink-dim #A7B0B2`는 **비활성·placeholder 전용**이다. 읽어야 하는 본문에 쓰지 말 것.

---

## 2. 접근성 P1 — 권장

- 동적 콘텐츠 컨테이너에 `aria-live="polite"` — 특히 Realtime으로 갱신되는 타임라인·배치 상태
- 수치 표시에 `tabular-nums` (측정값·LOT·타임스탬프·KPI)
- 뷰당 애니메이션 1–2개. 여러 요소에 동시 적용 금지
- 입력은 `<label htmlFor>` 필수. placeholder만으로 라벨을 대신하지 말 것
- 폼 검증은 `onBlur`. 제출 시점에만 검증하지 말 것
- 토스트는 3–5초 자동 해제

---

## 3. 안티패턴

| 금지 | 대신 |
|---|---|
| 이모지를 아이콘으로 사용 | **인라인 SVG (Lucide)** — `zap` / `rotate-ccw` / `lock` |
| `z-index: 9999` | 스케일 준수 — `z-10` 카드 · `z-20` sticky · `z-30` 드롭다운 · `z-50` 모달 |
| `linear` 이징 | 등장 `ease-out` · 퇴장 `ease-in` (150–300ms) |
| `location.replace()` | 라우터 네비게이션 |
| 클릭 요소에 커서 없음 | `cursor-pointer` |
| 고정 헤더에 콘텐츠 가림 | 스크롤 컨테이너에 패딩 확보 |
| 그림자로 계층 표현 | 1px 보더 + 배경 대비, 선택은 `ring` |
| 배경 그라디언트 | 진행률 표현과 브랜드 마크에만 허용 |

> **변경된 규칙 2건** — 구 MASTER.md의 "Material Symbols 사용"은 아이콘 폰트라 CDN 의존이 생겨 폐기하고 인라인 SVG로 대체했다. "다크모드 금지"는 "**MVP 라이트 전용, 제조자 콘솔 다크는 Phase 2**"로 완화했다(토큰 구조만 미리 준비).

---

## 4. 레이아웃 실측값

`docs/archive/design-tokens-spec.md`·`wireframe-spec-manufacturer.md`에서 승계.

### 공통
- 기본 그리드 **4px 배수**
- 라운드: 카드 12 · 버튼/입력 8 · 배지 6 · 칩 999
- 보더: 기본 1px `line` · 선택/강조 1.5px `teal` + ring

### 타입 스케일 (px)
| 역할 | 크기 / 굵기 | 용도 |
|---|---|---|
| `display` | 26 / 800 | 페이지 제목, 상태 히어로 |
| `title` | 19 / 700 | 카드·패널 제목 |
| `body` | 15 / 400 | 본문 (콘솔도 15 유지, 밀도는 행간으로) |
| `caption` | 12.5 / 400 | 메타 정보, 타임스탬프 |
| `data` | 15 mono (KPI 32) | 측정값·LOT |

### 의뢰자 포털 — `paper` 배경
섹션 간격 40–48 · 카드 패딩 24. 여백 넉넉하게, 신뢰·투명성 톤.

### 제조자 콘솔 — `bench` 배경, 744×1133 세로 고정 *(2026-09-17 가로 → 세로)*
섹션 간격 24 · 카드 패딩 16 · **터치 타겟 최소 44pt**, 레일 항목 56pt.

| 영역 | 폭 | 비고 |
|---|---|---|
| 다크 아이콘 레일 | 80pt | 5항목 고정, 항목 56pt. 의뢰·편차에 미처리 건수 배지 |
| 콘텐츠 | 664pt | 리스트 화면 또는 상세 화면 — **나란히 두지 않는다** |

- 세로 폭에서는 스플릿뷰가 안 들어간다. 리스트 → 상세는 스택 전환. 필터는 URL(`?f=`)에 둬 돌아와도 유지.
- 대시보드 큐 행은 상세로 직행. 의뢰 수락 시 새 배치의 준비 탭으로 바로 간다.
- 가로 감지 시 회전 안내 오버레이만 표시. **가로 레이아웃을 만들지 말 것**
- 배치 상세 탭 5개(준비·공정·편차·요약·결과)가 664pt에 들어간다. 현재 단계만 펼친다
- `manufacturer-console-hifi.html`은 가로 스플릿뷰라 **레이아웃 참고용으로는 폐기**. 컴포넌트·톤은 유효
- 다크 모드는 Phase 2. `#101B1D` 배경 + 지시약 컬러 채도 +8% 기준으로 토큰 구조만 준비

---

## 5. 배포 전 체크리스트

- [ ] `prefers-reduced-motion` 전역 CSS 포함
- [ ] `focus-visible:ring` 사용 (`focus:ring` 아님)
- [ ] 클릭 요소에 `cursor-pointer` + 호버 전이 150–300ms
- [ ] 텍스트 대비 4.5:1 이상
- [ ] 동적 영역에 `aria-live="polite"`
- [ ] 시맨틱 HTML — 액션 `<button>`, 이동 `<a>`/`<Link>`
- [ ] 수치에 `tabular-nums`
- [ ] 아이콘 전부 인라인 SVG (이모지 없음)
- [ ] z-index 스케일 준수 (10 → 20 → 30 → 50)
- [ ] 의뢰자 포털: 375px에서 가로 스크롤 없음
- [ ] 제조자 콘솔: 744×1133 세로. 준비 탭 4단계가 한 화면, 터치 타겟 44pt 이상(레일 56pt)
- [ ] "승인" 표현 없음 — 1차 검토(서명) / 결과 리뷰(서명)
- [ ] 하드코딩된 hex 없음 — 토큰만 사용
