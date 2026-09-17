import type { ClientReviewStatus, RequestStatus } from './constants';

/**
 * 의뢰자가 보는 상태 — 상호 배타적 4개 (docs/feedback-0914.md §1).
 * 한 의뢰는 정확히 한 상태에만 속한다. "조치 필요"는 상태가 아니라 뷰다.
 */
export const CLIENT_STAGE = ['pending', 'in_progress', 'review', 'done'] as const;
export type ClientStage = (typeof CLIENT_STAGE)[number];

export const CLIENT_STAGE_LABEL: Record<ClientStage, string> = {
  pending: '수락 대기',
  in_progress: '진행 중',
  review: '리뷰 필요',
  done: '완료',
};

/** 상태 판정에 필요한 최소 필드 */
export interface StageInput {
  status: RequestStatus;
  result: {
    manufacturer_signed_at: string | null;
    client_review_status: ClientReviewStatus | null;
  } | null;
}

export function clientStage(r: StageInput): ClientStage {
  if (r.status === 'pending' || r.status === 'rejected') return 'pending';
  if (r.result?.client_review_status === 'reviewed') return 'done';
  if (r.result?.manufacturer_signed_at && r.result.client_review_status !== 'revision_requested')
    return 'review';
  return 'in_progress';
}

/**
 * 조치 필요 = 리뷰 필요 + 반려. 상태를 바꾸지 않고 걸러낼 뿐이다.
 * 이 건들은 자기 상태 목록에도 그대로 있다.
 */
export function needsAction(r: StageInput): boolean {
  return clientStage(r) === 'review' || r.status === 'rejected';
}

/** 타임라인·스테퍼용 — 5단계 중 몇 번째인지 */
export const CLIENT_STEPS = ['의뢰', '수락', '공정', '검토', '완료'] as const;

export function stageIndex(r: StageInput & { batchDone?: boolean }): number {
  const s = clientStage(r);
  if (s === 'pending') return 0;
  if (s === 'done') return 5;
  if (s === 'review') return 3;
  return r.batchDone ? 3 : 2;
}
