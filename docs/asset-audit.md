# 기존 레포 자산 감사

*(spec-v2 §11 "기존 레포 자산 감사" 실행분 · 작성 2026-08-01)*

재설계 착수(마일스톤 ①) 전에 레포에 남아 있는 자산을 전수 검토하고 재사용/폐기를 확정한다.
추출 대상 도메인 데이터는 `docs/seed-data.md`로 분리했다.

## 판정 요약

| 판정 | 대상 |
|---|---|
| 그대로 재사용 | `docs/mockups/design-tokens.html`, `client-portal-hifi.html`, `manufacturer-console-hifi.html` |
| 내용만 추출 후 폐기 | `docs/archive/*.md` 3개, `design-system/stitch/MASTER.md`, `screen_*.json` 4개, 기존 HTML 9장 (추출분 → `seed-data.md`) |
| 즉시 폐기 | `index.html`, `patch_p0.js`, `batch_summary.html`, `docs/mockups/*-wireframe.html` 2개 |
| 분리 보관 | `pptx_project/`, `.claude/skills/pptx` + `skills-lock.json` |

---

## 1. 재사용 — 마일스톤 ①의 직접 입력

### `docs/mockups/design-tokens.html`
`packages/ui` Tailwind preset의 1:1 소스. `:root` CSS 변수 9색 + 타입 스케일 5단 + 시그니처 스테퍼가 그대로 토큰이 된다.

### `client-portal-hifi.html` / `manufacturer-console-hifi.html`
공통 컴포넌트가 이미 CSS 클래스로 분해되어 있어 그대로 매핑 가능하다.

| 시안 클래스 | 공유 컴포넌트 후보 | 사용처 |
|---|---|---|
| `.badge` + `.b-wait/.b-run/.b-done/.b-dev/.b-re` | `<StatusBadge>` | 양쪽 |
| `.b-inst` | `<InstrumentBadge>` (zap 아이콘 + 자동기록) | 양쪽 |
| `.stepper/.seg/.knob` · `.ph-stepper` | `<GradientStepper>` | 양쪽 |
| `.tl/.ti` | `<Timeline>` | 의뢰자 |
| `.f-in.auto` vs `.f-in` | `<MeasurementField source=…>` | 양쪽 |
| `.rail/.r-item/.r-badge` | `<IconRail>` | 콘솔 |
| `.tabs/.tab.lock` | `<LockedTabs>` | 콘솔 |
| `.now-box` | `<CurrentStepBox>` | 콘솔 |
| `.approve` | `<ReviewPanel>` | 의뢰자 |

**주의** — hifi 시안은 액자 안에서 `font-size: clamp(6px,1.6vw,11.2px)` + 전 치수를 `%`로 잡은 시연용 트릭이다. 비율 참고용으로만 읽고, 실제 구현은 `archive/design-tokens-spec.md`의 4px 그리드/px 스케일을 따른다.

---

## 2. 폐기 — 단, 내용은 추출

### `docs/archive/*.md` (3개)
`tech-stack-spec.md`·`design-tokens-spec.md`는 spec-v2 §4·§5로 흡수 완료. 다만 **v2에도 CLAUDE.md에도 아직 없는 값**이 남아 있어 그대로 지우면 손실이다.

- `design-tokens-spec.md` — 4px 배수 그리드, 보더 1.5px/선택 2px, 타입 스케일 px 값, 다크모드 `#101B1D` + 채도 +8%
- `wireframe-spec-manufacturer.md` — 스플릿뷰 실측 폭(레일 88 / 리스트 320 / 상세 730pt), 완료 단계 취소선, 편차 탭 open/resolved 추적

→ 위 값을 `packages/ui` 토큰과 CLAUDE.md로 올린 뒤 `docs/archive/` 삭제.
→ `design-tokens-spec.md`는 `indicator-green`을 "완료 / **승인**"으로 표기하고 `wireframe-spec-manufacturer.md`는 "최종**승인** 요청"을 쓴다. 흡수 시 용어 교정 필수.

### `design-system/stitch/MASTER.md`
디자인 파트는 전면 충돌 — 폐기.

| 항목 | Stitch | 새 스펙 |
|---|---|---|
| Primary | `#ec5b13` 오렌지 | `#0E8290` teal |
| 배경 | `#E7E5E4` | `paper` / `bench` |
| 폰트 | Inter + Space Mono | Pretendard + JetBrains Mono |
| 계층 | 뉴모피즘 그림자 4종 | 그림자 없음(플랫) |
| 라운드 | 6/10/14/16 | 12/8/6/999 |

덧붙여 **MASTER.md는 실제 구현된 페이지와도 어긋난다.** 문서는 Primary `#ec5b13`/Accent `#006666`라고 하지만, 기존 HTML 9장은 전부 Primary `#006666`/Accent `#c45e2c`("TypeUI Neumorphism palette")를 쓴다. `#ec5b13`은 레포 어디에도 없다. 문서가 이미 실물을 반영하지 못하는 상태다.

**단, 접근성 섹션(P0/P1·안티패턴·체크리스트)은 살아있는 자산**이다. 팔레트와 무관하게 유효하므로 새 문서(`docs/ui-rules.md`)로 이전한다.

- 승계 — `prefers-reduced-motion`, `focus-visible:ring`(≠`focus:`), 시맨틱 HTML, `aria-live="polite"`, `tabular-nums`, 대비 4.5:1, z-index 스케일(10/20/30/50), `<label for>` 필수, onblur 검증, 토스트 3–5초 자동 해제, ease-out/in
- 조정 필요 3건
  1. "다크모드 금지" → 제조자 콘솔 다크는 Phase 2 후보. "MVP 라이트 전용"으로 완화
  2. "모바일 375px 가로스크롤 금지" → 의뢰자 포털에만 적용. 콘솔은 1133×744 고정
  3. "이모지 아이콘 금지 → Material Symbols" → 원칙(이모지 금지)은 승계하되 아이콘 세트는 **인라인 SVG(Lucide)**로 교체 (§5-7에서 확정)

### `screen_*.json` (4개)
Google Stitch(figaro) 생성 메타데이터. **파일 자체는 가치 없음** — 실제 HTML/이미지는 로컬에 없고 만료 가능한 서명 URL만 있어 재현 불가. `deviceType: "MOBILE" / width 780`으로 아이패드 미니 가로와도 불일치.

`prompt` 필드의 시나리오도 대부분 현 스코프 밖이다.

| prompt 내용 | 충돌 |
|---|---|
| "Bluetooth Pipette: Connected" | BLE 연동 스코프 밖 |
| "Approve and Log Batch" | "승인" 용어 금지 |
| 풀스크린 "Step 2 of 5" | 새 스펙은 배치 상세 탭 내부 스텝 리스트 |
| 편차를 붉은 모달 오버레이로 | 새 스펙은 공정 흐름 안 인라인 |

건질 것은 도메인 시나리오뿐이며 `seed-data.md`로 이전했다 — 동결 버퍼 → Heating Bath 37°C 10분, 준비 가이드 시약 체크리스트 및 도구 3종.

### 기존 HTML 9장
스택·디자인·정보구조·용어가 전부 새 스펙과 어긋난다. Tailwind CDN + 뉴모피즘(`neu-` 클래스 47회) + Material Symbols + Inter/Noto/Space Mono 구성이고, 무엇보다 CLAUDE.md가 명시적으로 금지한 **페이지 분할 구조**다 — `client_progress`/`client_issues`/`client_results`/`client_data`는 새 스펙에서 "의뢰 상세" 한 장으로 통합돼야 한다.

용어·스코프 위반:

| 위반 | 위치 |
|---|---|
| "작업자 포털"(→제조자 콘솔) | `manufacturer_home` |
| "이슈관리"(→편차) | `client_home`, `client_issues` |
| "승인/거부"(→리뷰/보완 요청) | `client_issues` 10회, `active_workflow` |
| "스캔 결과 NaCl LOT 만료" | `client_issues` — 바코드 스코프 밖 |
| 블루투스 저울·피펫 연결 | `manufacturer_home`, `active_workflow` |
| 캘리브레이션 만료 관리 | `manufacturer_home` — 장비=Phase 2 |
| CoA 자동 발행 | `manufacturer_home` — 스코프 밖 |
| **"블록체인 노드에 동기화"** | `active_workflow` — 허구. 반드시 제거 |

그럼에도 시드 데이터 원천으로는 품질이 높다. 추출분은 전량 `docs/seed-data.md`에 정리했다.

| 파일 | 추출한 것 |
|---|---|
| `client_progress.html` | 10x PBS 9단계 공정 + 시약 4종 실제 조성·LOT·유효기간 |
| `client_results.html` | TAE 7단계 완료 기록 + 서명 체인 + pH 측정값 |
| `client_issues.html` | 편차 2건 + 시정조치 문구 |
| `active_workflow.html` | 5단계 시퀀스, 편차 조치 가이드 |
| `preparation_guide.html` | 시약 체크리스트, 필수 장비 3종, SOP 안내 문구 |
| `client_equipment.html` | 예약 폼 필드 6종, 장비 5종, 제조 라인 |
| `client_home.html` | 월 캘린더 IA, 새 의뢰 모달 필드, 버퍼 4종 |

**처리** — spec §11대로 `reference/v1-html` 태그(또는 브랜치)로 보존 후 main에서 제거.

---

## 3. 즉시 폐기

- **`index.html`** — `location.replace()` 리다이렉트. spec §3의 "랜딩/스위처 페이지"로 대체되며, `location.replace` 자체가 Stitch 안티패턴 목록에도 있다.
- **`patch_p0.js`** — 일회성 패치 스크립트. 목적인 `prefers-reduced-motion`은 `packages/ui` 글로벌 CSS에 상시 포함되므로 스크립트 자체가 불필요. 규칙만 승계.
- **`batch_summary.html`** — 다른 9장과 달리 **버퍼 도메인이 아니다.** "Batch ID #BX-8924 · Product: Thermal Compound Alpha", 100°C 가열/50L 투입/RPM 120/수율 48.5L의 화학플랜트 공정이다. 미변환 템플릿이며 추출할 도메인 데이터가 없다. UI 패턴(전자서명 PIN + 확인 문구)만 참고 가치가 있으나 hifi 시안의 `.approve` 패널이 이를 대체한다.
- **`docs/mockups/*-wireframe.html` 2개** — hifi 시안이 동일 레이아웃을 토큰까지 얹어 완전히 대체. `docs/archive/`로 내리거나 삭제.

---

## 4. 분리 보관

- **`pptx_project/`** — 포트폴리오 발표 데크 빌더. 앱과 무관하므로 **pnpm 워크스페이스에 포함하지 말 것** (독립 `package.json`·`package-lock.json`이 루트 lockfile과 충돌). `tools/pptx-deck/`로 이동 권장. 데크 색상이 아직 `EC5B13`/`006666` 구 팔레트라 나중에 갱신 필요.
- **`.claude/skills/pptx`** — `../../.agents/skills/pptx`를 가리키는 심볼릭 링크인데 `.gitignore`가 `.agents/`를 제외하고 있어 **클론하면 깨진 링크**다. `skills-lock.json`도 이 항목 하나뿐. spec §11은 "유지하되 업데이트"라 했으나 UI 작업과 무관하므로 링크 정리를 권한다.

---

## 5. 시안 불일치 — 확정 및 반영 *(완료)*

토큰 시트(`design-tokens.html`)를 단일 기준으로 확정하고 두 hifi 시안에 반영했다.

| # | 쟁점 | 확정 | 근거 |
|---|---|---|---|
| 1 | "승인" 잔존 | **전량 교체** — 배지 "리뷰 완료", 버튼 "리뷰 완료 · 서명" / "보완 요청", 팔레트 설명 "완료 · 서명", 콘솔 하단 "리뷰 체인" | CLAUDE.md 도메인 용어 |
| 2 | 보더 1px vs 1.5px | **기본 1px** `line` · 선택/강조 **1.5px** `teal` + ring | 그림자 없는 플랫 시스템에서 1.5px 기본선은 Retina 서브픽셀 렌더링이 흔들린다. 두 hifi가 이미 1px로 검증됨 |
| 3 | `b-wait` 텍스트색 | **`#A96C0F`** (기존 `#B57712` 폐기) | amber 15% 배경 위 대비 약 4.6:1로 WCAG AA 충족. `#B57712`는 약 3.9:1로 미달 |
| 4 | 누락 토큰 | `b-re`(재제조 dashed amber), **`ink-dim #A7B0B2`** 신설 | 비활성·잠김·placeholder 회색 3종(`#A7B0B2`/`#B4BFC0`/하드코딩)을 하나로 통일 |
| 5 | "그림자 없음" vs 실사용 | **`ring-teal` 토큰 신설** — `0 0 0 3px rgba(14,130,144,.08)` | 선택·포커스 링을 그림자와 분리해 명명하면 플랫 원칙과 모순이 사라진다 |
| 6 | 그라디언트 남용 | **진행률 표현 + 브랜드 마크(로고·아바타)만** 허용. hero 배경 그라디언트는 **제거**(단색 `rgba(teal,.05)` + 보더) | "유일한 장식 요소" 원칙 유지. 10% 알파 그라디언트는 보이지도 않으면서 규칙만 흐린다 |
| 7 | 아이콘 정책 | **인라인 SVG (Lucide 계열, stroke 2px, `currentColor`)**. 이모지 금지 — ⚡→`zap`, ↻→`rotate-ccw`, 🔒→`lock` | 이모지는 OS별 렌더링이 제각각이고 색을 물려받지 못해 배지 안에서 baseline이 흔들린다. Material Symbols는 아이콘 폰트라 CDN 의존 + 새 스택과 안 맞음 |
| 8 | 식별자·인물명 | 신규 시안 체계 채택 + 순환 재배치 | `seed-data.md` §0-B, §0-C |

**부수 교정 2건**
- `client-portal-hifi.html` 모바일 변형의 "**기록지** 리뷰 대기" → "결과 리뷰 대기" (CLAUDE.md: "제조 기록지"가 아니라 "제조 결과")
- `design-tokens.html` 제조자 스킨의 버튼 색이 뒤바뀌어 있었다 — "편차 등록"이 ink 주버튼, "단계 완료"가 outline. **"단계 완료"를 green, "편차 등록"을 pink outline으로 교정** (CLAUDE.md: 서명·단계 완료 액션만 green)

> Lucide는 tree-shakable React 컴포넌트라 새 스택에 맞고 교체도 쉽다. 다른 세트를 원하면 아이콘 3개만 바꾸면 된다.

---

## 6. 후속 순서

1. `CLAUDE.md` + `docs/` 커밋 (현재 미추적 상태 — 기준선 확보)
2. 현 main을 `reference/v1-html` 태그로 보존
3. 폐기 대상 제거 (기존 HTML 10장 · `index.html` · `patch_p0.js` · `screen_*.json` · `design-system/` · `docs/archive/` · wireframe 2종)
4. `design-system/stitch/MASTER.md`의 접근성 규칙 → `docs/ui-rules.md`로 이전
5. 모노레포 골격 → 마일스톤 ① (`packages/ui` 토큰 = 확정된 `design-tokens.html`)
