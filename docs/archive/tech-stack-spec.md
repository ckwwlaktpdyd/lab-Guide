# 기술 스택 & 데이터 아키텍처 확정 스펙
*(기획서 12번 미정 항목 중 "기술 스택 / 데이터 저장 / 인증" 해소분)*

## 1. 스택

| 영역 | 선택 | 사유 |
|---|---|---|
| 프레임워크 | Vite + React + TypeScript | SSR 불필요한 MVP에 Next.js보다 가볍고 Claude Code 작업에 수월 |
| 스타일 | Tailwind CSS | 공유 디자인 토큰을 tailwind config 하나로 정의, 두 사이트가 import |
| 백엔드/DB | Supabase (무료 티어, Postgres) | 서버 코드 없이 두 사이트 연동. 데이터 모델을 테이블로 직역 가능 |
| 실시간 연동 | Supabase Realtime 구독 | 상태 변경이 상대 사이트에 즉시 반영 (승인 체인 시연의 핵심) |
| 인증 | Supabase Auth — 이메일 매직링크 | MVP에 충분. role(client/manufacturer)은 User 테이블에서 관리 |
| 패키지 관리 | pnpm 모노레포 | 기획서 3번 폴더 분리 구조 대응 |
| 배포 | Vercel 프로젝트 2개 | 사이트별 독립 배포 (기존 계획 유지) |

## 2. 모노레포 구조

```
/apps
  /client-portal          # 의뢰자 포털 (반응형 웹)
  /manufacturer-console   # 제조자 콘솔 (아이패드 미니 가로 전용)
/packages
  /ui                     # 공유 디자인 토큰 + 공통 컴포넌트 (마일스톤 ①)
  /db                     # Supabase 클라이언트, 타입, 쿼리 헬퍼 공유
```

- 랜딩/스위처 페이지는 client-portal 루트 또는 별도 정적 페이지로 처리 (리뷰어 혼선 방지, 기획서 3번)

## 3. 데이터 저장 원칙

- **두 사이트가 동일한 Supabase 프로젝트를 공유** → "두 사이트 간 상태 연동"(마일스톤 ⑤)은 별도 API 서버 없이 성립
- 목업 데이터는 폐기하지 않고 **시드(seed) 데이터**로 전환: 데모 계정, 진행 단계별 배치 샘플, 계측기 자동 기록 값 포함
- Row Level Security(RLS)로 역할별 접근 제어: client는 본인 의뢰 건만, manufacturer는 전체 배치 조회 (기획서 5번 권한 매트릭스를 DB 레벨에서 강제)

## 4. 데이터 모델 보강 — 계측기 데이터 출처

무선 데이터 전송 계측기(pH미터·전도도계 등)가 표준인 현재 실무를 반영해, 측정값에 출처 개념을 추가한다.

**Measurement (공통 구조 — Result.values 및 ProcessStep 기록에 사용)**
- `value`, `unit`
- `source`: `instrument` | `manual`
- `instrument_id` (source=instrument일 때): 기기 식별자, 예: "pH-2000-A"
- `captured_at`: 자동 수집 시각
- `entered_by`, `override_reason` (source=manual일 때): 수동 입력자 + 사유 — QC 감사 추적(audit trail)

**UI 반영 규칙**
- 자동 수집 값: 출처 배지("⚡ pH-2000 자동 기록 16:32") + 읽기 전용 표시
- 수동 입력/덮어쓰기: 구분 스타일 + 사유 입력 필수
- 의뢰자 포털 결과 패널에도 동일 배지 노출 (투명성 톤 반영)
- 실제 기기 연동(BLE/시리얼)은 스코프 외 — 시드 데이터로 시연

## 5. 남은 미정 항목 (업데이트)

- [x] ~~와이어프레임~~ → 제조자 콘솔·의뢰자 포털 확정 (별도 스펙 문서)
- [x] ~~기술 스택 / 데이터 저장~~ → 본 문서
- [x] ~~인증 방식~~ → Supabase Auth 이메일 매직링크
- [ ] 데이터 모델 필드 최종 검증 (계측기 출처 필드 포함해 재검토)
- [ ] 알림 방식 — 1차: 인앱만 (Realtime 구독으로 커버). 이메일 연동은 Phase 2
- [ ] 공유 디자인 토큰 구체값 (컬러 hex, 폰트 패밀리)
