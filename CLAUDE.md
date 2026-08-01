# CLAUDE.md — Lab Guide

버퍼 제조 QC 프로세스 관리 서비스. 포트폴리오 MVP.
전체 기획은 `docs/lab-guide-spec-v2.md`, 시각 시안은 `docs/mockups/` 참고.

## 무엇보다 먼저

- **두 개의 독립된 앱**이다. 하나의 반응형 사이트가 아니다.
  - `src/apps/client` — 의뢰자 포털, 웹/모바일 반응형
  - `src/apps/console` — 제조자 콘솔, **아이패드 미니 가로 모드 전용(1133×744)**
- 프로젝트는 **단일 Vite + React 앱 하나**다. 두 앱은 라우트로 분리한다(`/client/*`, `/console/*`). 모노레포·pnpm workspace를 쓰지 않는다.
- 코드는 분리되어 있어도 **UX는 완전히 별개**로 취급한다. 공통 레이아웃·내비게이션을 억지로 공유하지 말 것.
- 제조자 콘솔에 모바일 세로 레이아웃을 만들지 말 것. 세로 감지 시 회전 안내 오버레이만 표시한다.
- 공유 코드는 `src/shared/ui`(디자인 토큰·컴포넌트), `src/shared/db`(Supabase 클라이언트·타입)에 둔다. **`src/apps/client` ↔ `src/apps/console` 간 직접 import 금지.**

```
/src
  /apps
    /client     # 의뢰자 포털 라우트 트리
    /console    # 제조자 콘솔 라우트 트리
  /shared
    /ui         # 디자인 토큰 + 공통 컴포넌트
    /db         # Supabase 클라이언트 · 타입 · 쿼리 헬퍼
  /routes.tsx   # 두 앱 + 랜딩/스위처
```

## 스택

Vite + React + TypeScript · Tailwind CSS · Supabase(Postgres + Auth + Realtime) · **단일 프로젝트** · Vercel 프로젝트 1개

- 인증: Supabase Auth 이메일 매직링크
- 권한: RLS로 DB 레벨 강제 (client는 본인 의뢰만, manufacturer는 전체 배치)
- 두 앱이 **같은 Supabase 프로젝트**를 공유한다. 별도 API 서버 없음.
- Tailwind config는 루트 하나. 토큰은 `src/shared/ui`에 정의하고 두 앱이 같은 config를 쓴다.
- 화면은 `docs/mockups/client-portal-hifi.html`·`manufacturer-console-hifi.html`을 기준으로 옮긴다. 로우파이 와이어프레임은 폐기됐다.

## 스코프 밖 (구현하지 말 것)

- 카메라 / QR·바코드 스캔 (Safari BarcodeDetector 미지원)
- 실제 계측기 연동(BLE·시리얼). **단, 데이터 모델과 UI는 계측기 자동 수집을 전제로 만들고 시드 데이터로 시연한다.**
- 장비 관리 화면 (Phase 2)
- 이메일 알림 (Phase 2, 1차는 인앱 Realtime만)

## 디자인 토큰

토큰은 `src/shared/ui`에 정의하고 루트 Tailwind config가 참조한다. 하드코딩된 hex를 컴포넌트에 직접 쓰지 말 것.
확정된 토큰 원본은 `docs/mockups/design-tokens.html`이다.

```
indicator-amber  #F0A62E   대기 / 주의
indicator-green  #3AA05F   완료 / 서명
indicator-teal   #0E8290   진행중 / 프라이머리
phenol-pink      #E14E68   편차 / 반려 / 재제조
ink #17272B   ink-soft #5C6B70   line #D4DCDD
surface #FFFFFF   paper #FAFAF8(의뢰자 배경)   bench #EEF2F2(제조자 배경)
```

- 폰트: UI는 **Pretendard Variable**, 데이터(LOT·측정값·타임스탬프)는 **JetBrains Mono**. 숫자는 `tabular-nums`.
- **시그니처**: 진행률 표현(스테퍼·타임라인)과 브랜드 마크(로고·아바타)에만 amber→green→teal 그라디언트 사용. 배경 그라디언트 금지.
- 그림자 없음(플랫). 계층은 1px 보더 + 배경 대비로. 선택·포커스는 `ring` 토큰(`0 0 0 3px rgba(14,130,144,.08)`)으로만 표현한다.
- 보더: 기본 1px `line` / 선택·강조 1.5px `indicator-teal` + ring. 비활성·잠김·placeholder는 `ink-dim #A7B0B2`.
- **아이콘은 인라인 SVG(Lucide)**. 이모지를 아이콘으로 쓰지 말 것 — 자동기록 `zap`, 재제조 `rotate-ccw`, 잠긴 탭 `lock`.
- 라운드: 카드 12 / 버튼·입력 8 / 배지 6 / 칩 999
- 컬러 버튼 남용 금지: 주 버튼은 `ink`, **서명·단계 완료 액션만** `indicator-green`.
- 제조자 콘솔은 **터치 타겟 최소 44pt**.

## 도메인 용어 (엄수)

- 제조자의 검토 = **1차 검토(서명)** / 의뢰자의 검토 = **결과 리뷰(서명)**
- **"승인"이라는 단어를 쓰지 않는다.** 실제 관행은 수기 버퍼 기록지를 의뢰자가 확인하고 서명하는 것이므로 "리뷰"가 맞다.
- 의뢰자 액션 3종: `리뷰 완료 · 서명` / `보완 요청` / `재제조 요청`(rotate-ccw 아이콘)
- UI 라벨은 "제조 기록지"가 아니라 **"제조 결과"**를 쓴다.

## 핵심 워크플로우

```
의뢰 → 제조자 수락(=배치 생성) → 공정 진행(편차 발생 시 등록/조치)
  → 배치 요약 확정 → 결과 입력 + 1차 검토(서명)
  → 의뢰자 결과 리뷰 → [리뷰 서명 → 완료] 또는 [보완 요청 → 재작업]
```

- **재제조 요청**은 별도 경로다. 버퍼가 완벽하지 않아 실험 단계에서 문제가 드러나는 경우가 있으므로, **완료된 의뢰에서도 접근 가능**해야 한다. `parent_request_id`로 원본과 연결하고 사유 입력을 필수로 한다. 제조자 콘솔에서는 원본 배치 결과를 대조용으로 함께 보여준다.
- 반려 시 사유 입력 모달 필수.

## 화면 구조

**의뢰자 포털 (5장)** — 대시보드 / 새 의뢰 / 의뢰 상세 / 캘린더 / 준비 가이드
- 공정 조회·편차·배치 요약·결과를 **"의뢰 상세" 한 페이지로 통합**했다. 별도 페이지로 쪼개지 말 것.
- 좌측 타임라인(스토리 축) + 우측 결과·코멘트·액션 패널
- 재제조 요청 버튼은 구분선 아래 별도 배치 (오조작 방지)

**제조자 콘솔** — 다크 아이콘 레일(홈/의뢰/배치/편차/장비) + 리스트 + 상세 스플릿뷰
- 공정·편차·요약·결과는 **배치 상세 안의 탭 4개**다. 별도 화면이 아니다.
- **탭 잠금**: 공정 완료 전 요약·결과 비활성, 요약 확정 전 결과 비활성 → 워크플로우 순서 강제
- 공정 탭은 **현재 진행 단계에만** 입력 박스를 인라인 노출. [단계 완료] [편차 등록]
- 대시보드는 조회용이 아니라 작업 진입점. 각 행에서 해당 작업 공간으로 직행.

## 측정값(Measurement) 처리

모든 측정값에 출처를 기록한다.

```ts
{ value, unit,
  source: 'instrument' | 'manual',
  instrument_id?, captured_at?,        // 자동
  entered_by?, override_reason? }      // 수동 (사유 필수 — 감사 추적)
```

- 자동 수집값: teal 필드 + `[zap] pH-2000-A 자동 기록 14:31` 배지, 읽기 전용
- 수동 덮어쓰기: 값 탭 → 사유 입력 필수
- 의뢰자 결과 패널에도 같은 배지를 노출한다

**칭량 시약 vs 적정 시약** — 레시피 시약은 두 종류다. `BufferRecipe.steps[]`에 `reagent_kind: 'weighed' | 'titrated'`를 둔다.

- **칭량**(NaCl·Tris base·EDTA 분말 등): 레시피에 고정된 양. 저울 자동 기록.
- **적정**(HCl·NaOH): **고정 용량을 박아두지 말 것.** 목표 pH에 도달할 때까지 넣으므로 투입량은 목표가 아니라 **결과**다. 단계 완료 판정은 투입량이 아니라 **측정 pH가 허용 범위 안에 들어왔는지**로 한다. 실제 투입량은 `source: 'manual'`로 기록(뷰렛은 계측기 연동 밖).

Tris 계열은 pH가 온도에 크게 좌우된다(−0.028 pH/°C). **온도 평형 단계가 pH 조정보다 앞**이고, pH 측정값에는 측정 온도가 함께 남아야 한다.

## 코딩 컨벤션

- TypeScript strict. `any` 금지, DB 타입은 `src/shared/db`에서 생성된 타입을 쓴다.
- 컴포넌트는 함수형 + named export. 파일명 PascalCase.
- 상태 문자열은 하드코딩하지 말고 `src/shared/db`의 union 타입/상수를 참조.
- 커밋은 마일스톤/브랜치 단위로 리뷰 가능한 크기로 나눈다.

## 마일스톤 순서

1. Vite + React + TS 프로젝트 초기화 + `src/shared/ui` 토큰 + 공통 컴포넌트
2. `src/shared/db` 스키마 + 시드 + RLS — 시드 원본은 `docs/seed-data.md`
3. 제조자 콘솔: 의뢰함 · 배치 상세
4. 제조자 콘솔: 대시보드 · 나머지
5. 의뢰자 포털 전체
6. Realtime 연동 + 리뷰 체인 E2E 시연

`docs/asset-audit.md`(자산 판정)와 `docs/seed-data.md`(도메인 데이터)를 먼저 읽을 것.
