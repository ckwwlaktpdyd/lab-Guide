import { supabase } from './client';

/**
 * 쓰기 동작.
 *
 * 여러 테이블이 함께 움직이는 것은 전부 DB 함수로 넘긴다
 * (supabase/migrations/0004_workflow_functions.sql).
 * 클라이언트에서 순서대로 호출하면 중간에 끊겼을 때 어중간한 상태가 남는다 —
 * 배치 없는 수락, 단계 없는 배치 같은 것들.
 */

function unwrap(error: { message: string; hint?: string | null } | null): void {
  if (error) throw new Error(error.hint ? `${error.message} (${error.hint})` : error.message);
}

/** 수락 = 배치 생성. LOT 발번과 공정 단계 펼치기까지 한 번에 일어난다. */
export async function acceptRequest(requestId: string): Promise<{ lot_number: string }> {
  const { data, error } = await supabase
    .rpc('accept_request', { p_request_id: requestId })
    .returns<{ lot_number: string }>()
    .single();
  unwrap(error);
  return data!;
}

/** 반려 사유는 필수이고 의뢰자 코멘트 스레드로 전달된다. */
export async function rejectRequest(requestId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('reject_request', {
    p_request_id: requestId,
    p_reason: reason,
  });
  unwrap(error);
}

/** 단계 완료 시 배치 상태와 다음 단계도 함께 움직인다. */
export async function completeStep(stepId: string): Promise<void> {
  const { error } = await supabase.rpc('complete_step', { p_step_id: stepId });
  unwrap(error);
}

export async function registerDeviation(stepId: string, description: string): Promise<void> {
  const { error } = await supabase.rpc('register_deviation', {
    p_step_id: stepId,
    p_description: description,
  });
  unwrap(error);
}

export async function resolveDeviation(
  deviationId: string,
  cause: string,
  action: string,
): Promise<void> {
  const { error } = await supabase.rpc('resolve_deviation', {
    p_deviation_id: deviationId,
    p_cause: cause,
    p_action: action,
  });
  unwrap(error);
}
