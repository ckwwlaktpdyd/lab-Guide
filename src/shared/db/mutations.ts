import { supabase } from './client';
import { isMock, mockClient, mockConsole } from './mock';
import type { CalibrationKind, InquiryDecision } from './constants';

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
export async function acceptRequest(requestId: string): Promise<{ id: string; lot_number: string }> {
  if (isMock) return mockConsole.acceptRequest(requestId);
  const { data, error } = await supabase
    .rpc('accept_request', { p_request_id: requestId })
    .returns<{ id: string; lot_number: string }>()
    .single();
  unwrap(error);
  return data!;
}

/** 반려 사유는 필수이고 의뢰자 코멘트 스레드로 전달된다. */
export async function rejectRequest(requestId: string, reason: string): Promise<void> {
  if (isMock) return mockConsole.rejectRequest(requestId, reason);
  const { error } = await supabase.rpc('reject_request', {
    p_request_id: requestId,
    p_reason: reason,
  });
  unwrap(error);
}

/** 단계 완료 시 배치 상태와 다음 단계도 함께 움직인다. */
export async function completeStep(stepId: string): Promise<void> {
  if (isMock) return mockConsole.completeStep(stepId);
  const { error } = await supabase.rpc('complete_step', { p_step_id: stepId });
  unwrap(error);
}

export async function registerDeviation(stepId: string, description: string): Promise<void> {
  if (isMock) return mockConsole.registerDeviation(stepId, description);
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
  if (isMock) return mockConsole.resolveDeviation(deviationId, cause, action);
  const { error } = await supabase.rpc('resolve_deviation', {
    p_deviation_id: deviationId,
    p_cause: cause,
    p_action: action,
  });
  unwrap(error);
}

// ─── 의뢰자 액션 ───────────────────────────────────────────────
// RLS가 "제조자 1차 검토 서명 전에는 의뢰자가 리뷰할 수 없다"를 강제한다.
// 여기서 다시 검사하지 않는다 — 실패하면 DB가 거부한 이유가 그대로 올라온다.

/** 리뷰 완료 · 서명. "승인"이 아니다. */
export async function signClientReview(resultId: string): Promise<void> {
  if (isMock) return mockClient.signClientReview(resultId);
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('로그인이 필요합니다');
  const { error } = await supabase
    .from('results')
    .update({
      client_review_status: 'reviewed',
      client_signed_by: u.user.id,
      client_signed_at: new Date().toISOString(),
    })
    .eq('id', resultId);
  unwrap(error);
}

/** 보완 요청 — 사유 필수(DB 제약 revision_needs_note). */
export async function requestRevision(resultId: string, note: string): Promise<void> {
  if (isMock) return mockClient.requestRevision(resultId, note);
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('로그인이 필요합니다');
  const { error } = await supabase
    .from('results')
    .update({
      client_review_status: 'revision_requested',
      client_signed_by: u.user.id,
      client_signed_at: new Date().toISOString(),
      revision_note: note,
    })
    .eq('id', resultId);
  unwrap(error);
}

/** 재제조 요청 — 완료된 의뢰에서도 열린다. 원본과 링크되고 사유가 필수다. */
export async function requestRemake(
  parentRequestId: string,
  reason: string,
  desiredAt: string,
): Promise<{ code: string }> {
  if (isMock) return mockClient.requestRemake(parentRequestId, reason, desiredAt);
  const { data, error } = await supabase
    .rpc('create_request', {
      p_parent_request_id: parentRequestId,
      p_request_type: 'remake',
      p_reason: reason,
      p_desired_completion_at: desiredAt,
    })
    .returns<{ code: string }>()
    .single();
  unwrap(error);
  return data!;
}

export async function addComment(requestId: string, body: string): Promise<void> {
  if (isMock) return mockClient.addComment(requestId, body);
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('로그인이 필요합니다');
  const { error } = await supabase
    .from('comments')
    .insert({ request_id: requestId, author_id: u.user.id, body });
  unwrap(error);
}

// ─── 준비 체크 · 재측량 · 확인 요청 (0007) ───────────────────────

export async function recordCalibration(instrumentId: string, kind: CalibrationKind): Promise<void> {
  if (isMock) return mockConsole.recordCalibration(instrumentId, kind);
  const { error } = await supabase.rpc('record_calibration', { p_instrument_id: instrumentId, p_kind: kind });
  unwrap(error);
}

export async function confirmSop(batchId: string): Promise<void> {
  if (isMock) return mockConsole.confirmSop(batchId);
  const { error } = await supabase.rpc('confirm_sop', { p_batch_id: batchId });
  unwrap(error);
}

/** 만료 로트는 화면에서도 막지만 함수도 거부한다. */
export async function selectBatchReagent(batchId: string, recipeReagentId: string, reagentLotId: string): Promise<void> {
  if (isMock) return mockConsole.selectBatchReagent(batchId, recipeReagentId, reagentLotId);
  const { error } = await supabase.rpc('select_batch_reagent', {
    p_batch_id: batchId, p_recipe_reagent_id: recipeReagentId, p_reagent_lot_id: reagentLotId,
  });
  unwrap(error);
}

export async function confirmLot(batchId: string): Promise<void> {
  if (isMock) return mockConsole.confirmLot(batchId);
  const { error } = await supabase.rpc('confirm_lot', { p_batch_id: batchId });
  unwrap(error);
}

/** 4단계가 다 끝났는지 서버가 다시 확인한다. */
export async function startProcess(batchId: string): Promise<void> {
  if (isMock) return mockConsole.startProcess(batchId);
  const { error } = await supabase.rpc('start_process', { p_batch_id: batchId });
  unwrap(error);
}

/** 재측량 — 덮어쓰지 않고 행을 추가한다. 한 단계 10회까지. */
export async function remeasure(stepId: string, label: string): Promise<void> {
  if (isMock) return mockConsole.remeasure(stepId, label);
  const { error } = await supabase.rpc('remeasure', { p_step_id: stepId, p_label: label });
  unwrap(error);
}

export async function overrideMeasurement(stepId: string, label: string, value: number, reason: string): Promise<void> {
  if (isMock) return mockConsole.overrideMeasurement(stepId, label, value, reason);
  const { error } = await supabase.rpc('override_measurement', {
    p_step_id: stepId, p_label: label, p_value: value, p_reason: reason,
  });
  unwrap(error);
}

/** 확인 요청. 보내는 순간 배치가 waiting_client로 멈춘다. */
export async function askClient(stepId: string, question: string): Promise<void> {
  if (isMock) return mockConsole.askClient(stepId, question);
  const { error } = await supabase.rpc('ask_client', { p_step_id: stepId, p_question: question });
  unwrap(error);
}

/** 의뢰자 답변. 진행이면 배치가 다시 움직인다. */
export async function answerInquiry(inquiryId: string, decision: InquiryDecision, answer?: string): Promise<void> {
  if (isMock) return mockClient.answerInquiry(inquiryId, decision, answer);
  const { error } = await supabase.rpc('answer_inquiry', {
    p_inquiry_id: inquiryId, p_decision: decision, ...(answer ? { p_answer: answer } : {}),
  });
  unwrap(error);
}
