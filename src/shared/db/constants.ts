/**
 * 도메인 상태 상수 — 단일 원천.
 *
 * 상태 문자열을 컴포넌트에 하드코딩하지 않는다(CLAUDE.md).
 * DB의 enum과 1:1로 대응하며, 값이 바뀌면 마이그레이션과 함께 고친다.
 */

export const REQUEST_TYPE = ['new', 'resubmit', 'remake'] as const;
export type RequestType = (typeof REQUEST_TYPE)[number];

export const REQUEST_STATUS = ['pending', 'accepted', 'rejected'] as const;
export type RequestStatus = (typeof REQUEST_STATUS)[number];

export const BATCH_STATUS = ['preparing', 'running', 'deviation', 'completed'] as const;
export type BatchStatus = (typeof BATCH_STATUS)[number];

export const STEP_STATUS = ['todo', 'running', 'done', 'deviation'] as const;
export type StepStatus = (typeof STEP_STATUS)[number];

export const DEVIATION_STATUS = ['open', 'resolved'] as const;
export type DeviationStatus = (typeof DEVIATION_STATUS)[number];

/** 의뢰자 결과 리뷰 — "승인"이 아니라 리뷰다(CLAUDE.md 도메인 용어). */
export const CLIENT_REVIEW_STATUS = ['reviewed', 'revision_requested'] as const;
export type ClientReviewStatus = (typeof CLIENT_REVIEW_STATUS)[number];

export const USER_ROLE = ['client', 'manufacturer'] as const;
export type UserRole = (typeof USER_ROLE)[number];

/** 측정값 출처 — 모든 측정값에 기록한다(spec §10). */
export const MEASUREMENT_SOURCE = ['instrument', 'manual'] as const;
export type MeasurementSource = (typeof MEASUREMENT_SOURCE)[number];

/**
 * 시약 종류.
 * `weighed`는 레시피에 고정된 양을 단다.
 * `titrated`는 고정량이 없다 — 목표 pH에 도달할 때까지 넣으므로 투입량은 목표가 아니라 결과다.
 */
export const REAGENT_KIND = ['weighed', 'titrated'] as const;
export type ReagentKind = (typeof REAGENT_KIND)[number];

// ─── 표시용 라벨 ────────────────────────────────────────────────
// UI 문자열을 컴포넌트에 흩뿌리지 않는다. "승인"은 어디에도 쓰지 않는다.

export const REQUEST_TYPE_LABEL: Record<RequestType, string> = {
  new: '신규',
  resubmit: '재의뢰',
  remake: '재제조',
};

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  pending: '수락 대기',
  accepted: '수락',
  rejected: '반려',
};

export const BATCH_STATUS_LABEL: Record<BatchStatus, string> = {
  preparing: '준비중',
  running: '진행중',
  deviation: '편차발생',
  completed: '완료',
};

export const DEVIATION_STATUS_LABEL: Record<DeviationStatus, string> = {
  open: '미해결',
  resolved: '조치완료',
};

export const CLIENT_REVIEW_STATUS_LABEL: Record<ClientReviewStatus, string> = {
  reviewed: '리뷰 완료',
  revision_requested: '보완 요청',
};
