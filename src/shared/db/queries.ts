import { supabase } from './client';
import { isMock, mockClient, mockConsole } from './mock';
import type {
  BatchStatus,
  CalibrationKind,
  ClientReviewStatus,
  DeviationStatus,
  InquiryDecision,
  MeasurementSource,
  ReagentKind,
  RequestStatus,
  RequestType,
  StepStatus,
} from './constants';
import type { RecipeTargetParams } from './types';

/**
 * 조회 헬퍼.
 *
 * 결과 타입은 `.returns<T>()`로 직접 붙인다. `types.ts`가 손으로 쓴 것이라
 * Relationships가 비어 있어 supabase-js의 조인 추론이 동작하지 않기 때문이다.
 * `supabase gen types`로 재생성한 뒤에는 `.returns<>()`를 걷어내도 된다.
 *
 * 접근 범위는 여기서 거르지 않는다 — RLS가 이미 거른다.
 * 의뢰자가 이 함수를 호출하면 본인 것만 돌아온다.
 */

interface Named {
  name: string;
  org: string;
}

export interface RequestListItem {
  id: string;
  code: string;
  request_type: RequestType;
  status: RequestStatus;
  volume_ml: number;
  desired_completion_at: string;
  reason: string | null;
  created_at: string;
  requester: Named;
  recipe: { name: string; target_params: RecipeTargetParams };
  /**
   * batches가 배열이 아니라 객체다 — batches.request_id가 unique라
   * PostgREST가 to-one 관계로 판단한다(수락 = 배치 생성이므로 1:1).
   */
  parent: { code: string; batches: { lot_number: string } | null } | null;
}

const REQUEST_FIELDS = `
  id, code, request_type, status, volume_ml, desired_completion_at, reason, created_at,
  requester:requester_id ( name, org ),
  recipe:recipe_id ( name, target_params ),
  parent:parent_request_id ( code, batches ( lot_number ) )
`;

export async function fetchRequest(id: string): Promise<RequestListItem> {
  if (isMock) return mockConsole.fetchRequest(id);
  const { data, error } = await supabase
    .from('requests')
    .select(REQUEST_FIELDS)
    .eq('id', id)
    .single<RequestListItem>();
  if (error) throw error;
  return data;
}

/** 의뢰함 — 수락 대기 건. 재제조가 위로 오도록 정렬한다. */
export async function fetchPendingRequests(): Promise<RequestListItem[]> {
  if (isMock) return mockConsole.fetchPendingRequests();
  const { data, error } = await supabase
    .from('requests')
    .select(REQUEST_FIELDS)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .returns<RequestListItem[]>();
  if (error) throw error;
  return data;
}

export interface BatchListItem {
  id: string;
  lot_number: string;
  status: BatchStatus;
  started_at: string | null;
  requests: {
    code: string;
    volume_ml: number;
    desired_completion_at: string;
    profiles: Named;
    buffer_recipes: { name: string; target_params: RecipeTargetParams };
  };
}

const BATCH_FIELDS = `
  id, lot_number, status, started_at,
  requests!inner (
    code, volume_ml, desired_completion_at,
    profiles!requests_requester_id_fkey ( name, org ),
    buffer_recipes ( name, target_params )
  )
`;

export async function fetchBatch(id: string): Promise<BatchListItem> {
  if (isMock) return mockConsole.fetchBatch(id);
  const { data, error } = await supabase
    .from('batches')
    .select(BATCH_FIELDS)
    .eq('id', id)
    .single<BatchListItem>();
  if (error) throw error;
  return data;
}

export async function fetchBatches(): Promise<BatchListItem[]> {
  if (isMock) return mockConsole.fetchBatches();
  const { data, error } = await supabase
    .from('batches')
    .select(BATCH_FIELDS)
    .order('lot_number', { ascending: false })
    .returns<BatchListItem[]>();
  if (error) throw error;
  return data;
}

export interface StepMeasurement {
  id: string;
  label: string;
  value: number;
  unit: string;
  source: MeasurementSource;
  instrument_id: string | null;
  captured_at: string | null;
  captured_temp_c: number | null;
  override_reason: string | null;
  /** 재측량 회차 */
  attempt: number;
  calibration_id: string | null;
}

export interface BatchStep {
  id: string;
  seq: number;
  status: StepStatus;
  completed_at: string | null;
  note: string | null;
  recipe_steps: {
    name: string;
    kind: ReagentKind | null;
    reagent: string | null;
    target_amount: number | null;
    target_unit: string | null;
    note: string | null;
  };
  measurements: StepMeasurement[];
}

export async function fetchBatchSteps(batchId: string): Promise<BatchStep[]> {
  if (isMock) return mockConsole.fetchBatchSteps(batchId);
  const { data, error } = await supabase
    .from('process_steps')
    .select(
      `
      id, seq, status, completed_at, note,
      recipe_steps ( name, kind, reagent, target_amount, target_unit, note ),
      measurements ( id, label, value, unit, source, instrument_id, captured_at,
                     captured_temp_c, override_reason, attempt, calibration_id )
    `,
    )
    .eq('batch_id', batchId)
    .order('seq')
    .order('attempt', { referencedTable: 'measurements' })
    .returns<BatchStep[]>();
  if (error) throw error;
  return data;
}

export interface BatchDeviation {
  id: string;
  code: string;
  description: string;
  cause: string | null;
  corrective_action: string | null;
  status: DeviationStatus;
  created_at: string;
  resolved_at: string | null;
  process_steps: { seq: number; recipe_steps: { name: string } } | null;
}

export async function fetchBatchDeviations(batchId: string): Promise<BatchDeviation[]> {
  if (isMock) return mockConsole.fetchBatchDeviations(batchId);
  const { data, error } = await supabase
    .from('deviations')
    .select(
      `id, code, description, cause, corrective_action, status, created_at, resolved_at,
       process_steps ( seq, recipe_steps ( name ) )`,
    )
    .eq('batch_id', batchId)
    .order('created_at')
    .returns<BatchDeviation[]>();
  if (error) throw error;
  return data;
}

/** 대시보드 KPI · 레일 배지. head 요청이라 행을 받지 않는다. */
export async function fetchCounts() {
  if (isMock) return mockConsole.fetchCounts();
  const [pending, active, openDeviations] = await Promise.all([
    supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase
      .from('batches')
      .select('id', { count: 'exact', head: true })
      .in('status', ['running', 'deviation']),
    supabase.from('deviations').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ]);
  return {
    pendingRequests: pending.count ?? 0,
    activeBatches: active.count ?? 0,
    openDeviations: openDeviations.count ?? 0,
  };
}

export interface ResultMeasurement {
  label: string;
  value: number;
  unit: string;
  instrument_id: string | null;
  captured_at: string | null;
}

/**
 * 재제조 판단용 원본 배치 결과.
 * 어떤 값이 어긋났는지 봐야 수락 여부를 정할 수 있다 — 콘솔에서만 대조 표시한다(spec §9).
 */
export async function fetchResultMeasurementsByLot(
  lotNumber: string,
): Promise<ResultMeasurement[]> {
  if (isMock) return mockConsole.fetchResultMeasurementsByLot(lotNumber);
  const { data, error } = await supabase
    .from('results')
    .select(
      `measurements ( label, value, unit, instrument_id, captured_at ),
       batches!inner ( lot_number )`,
    )
    .eq('batches.lot_number', lotNumber)
    .returns<{ measurements: ResultMeasurement[] }[]>();
  if (error) throw error;
  return data[0]?.measurements ?? [];
}

// ─── 의뢰자 포털 ───────────────────────────────────────────────
// 접근 범위는 RLS가 거른다. 의뢰자가 호출하면 본인 의뢰만 돌아온다.

export interface MyRequest {
  id: string;
  code: string;
  request_type: RequestType;
  status: RequestStatus;
  volume_ml: number;
  desired_completion_at: string;
  rejection_reason: string | null;
  created_at: string;
  recipe: { name: string; target_params: RecipeTargetParams };
  /** 1:1 — batches.request_id가 unique라 객체로 온다 */
  batch: {
    id: string;
    lot_number: string;
    status: BatchStatus;
    process_steps: { status: StepStatus }[];
    deviations: { status: DeviationStatus }[];
    /** 답을 기다리는 제조자 확인 요청 — 조치 필요 */
    inquiries: { decision: InquiryDecision | null }[];
    result: {
      manufacturer_signed_at: string | null;
      client_review_status: ClientReviewStatus | null;
    } | null;
  } | null;
}

export async function fetchMyRequests(): Promise<MyRequest[]> {
  if (isMock) return mockClient.fetchMyRequests();
  const { data, error } = await supabase
    .from('requests')
    .select(
      `
      id, code, request_type, status, volume_ml, desired_completion_at, rejection_reason, created_at,
      recipe:recipe_id ( name, target_params ),
      batch:batches (
        id, lot_number, status,
        process_steps ( status ),
        deviations ( status ),
        inquiries ( decision ),
        result:results ( manufacturer_signed_at, client_review_status )
      )
    `,
    )
    .order('created_at', { ascending: false })
    .returns<MyRequest[]>();
  if (error) throw error;
  return data;
}

export interface RequestDetailData {
  id: string;
  code: string;
  request_type: RequestType;
  status: RequestStatus;
  volume_ml: number;
  desired_completion_at: string;
  reason: string | null;
  rejection_reason: string | null;
  created_at: string;
  recipe: { name: string; target_params: RecipeTargetParams };
  parent: { code: string } | null;
  batch: {
    id: string;
    lot_number: string;
    status: BatchStatus;
    started_at: string | null;
    ended_at: string | null;
    created_at: string;
    process_steps: {
      id: string;
      seq: number;
      status: StepStatus;
      completed_at: string | null;
      recipe_steps: { name: string };
      deviations: {
        id: string;
        code: string;
        description: string;
        cause: string | null;
        corrective_action: string | null;
        status: DeviationStatus;
        created_at: string;
        resolved_at: string | null;
      }[];
    }[];
    batch_summaries: { content: string; confirmed_at: string | null } | null;
    inquiries: {
      id: string;
      process_step_id: string | null;
      question: string;
      asked_at: string;
      decision: InquiryDecision | null;
      answer: string | null;
      answered_at: string | null;
    }[];
    result: {
      id: string;
      manufacturer_signed_at: string | null;
      manufacturer_signed_by: { name: string } | null;
      client_review_status: ClientReviewStatus | null;
      client_signed_at: string | null;
      revision_note: string | null;
      measurements: ResultMeasurement[];
    } | null;
  } | null;
  comments: { id: string; body: string; created_at: string; author: { name: string; role: string } }[];
}

export async function fetchRequestDetail(id: string): Promise<RequestDetailData> {
  if (isMock) return mockClient.fetchRequestDetail(id);
  const { data, error } = await supabase
    .from('requests')
    .select(
      `
      id, code, request_type, status, volume_ml, desired_completion_at, reason, rejection_reason, created_at,
      recipe:recipe_id ( name, target_params ),
      parent:parent_request_id ( code ),
      batch:batches (
        id, lot_number, status, started_at, ended_at, created_at,
        process_steps (
          id, seq, status, completed_at,
          recipe_steps ( name ),
          deviations ( id, code, description, cause, corrective_action, status, created_at, resolved_at )
        ),
        batch_summaries ( content, confirmed_at ),
        inquiries ( id, process_step_id, question, asked_at, decision, answer, answered_at ),
        result:results (
          id, manufacturer_signed_at, client_review_status, client_signed_at, revision_note,
          manufacturer_signed_by:profiles!results_manufacturer_signed_by_fkey ( name ),
          measurements ( label, value, unit, instrument_id, captured_at )
        )
      ),
      comments ( id, body, created_at, author:author_id ( name, role ) )
    `,
    )
    .eq('id', id)
    .order('seq', { referencedTable: 'batches.process_steps' })
    .order('created_at', { referencedTable: 'comments' })
    .single<RequestDetailData>();
  if (error) throw error;
  return data;
}

// ─── 준비 체크 · 확인 요청 ────────────────────────────────────────

export interface PrepInstrument {
  id: string;
  kind: string;
  /** 마지막 교정 기록. 없으면 null */
  last: { kind: CalibrationKind; performed_at: string; performed_by: { name: string } } | null;
}

export interface PrepReagent {
  reagent: { id: string; seq: number; name: string; amount: number | null; unit: string | null; kind: ReagentKind };
  /** 같은 시약명의 로트 후보. 만료 여부는 화면이 expires_on으로 판정한다 */
  lots: { id: string; lot_number: string; expires_on: string; note: string | null }[];
  chosen: { reagent_lot_id: string; confirmed_at: string } | null;
}

export interface BatchPrep {
  batch: {
    id: string;
    lot_number: string;
    status: BatchStatus;
    created_at: string;
    sop_confirmed_at: string | null;
    lot_confirmed_at: string | null;
    prep_completed_at: string | null;
  };
  instruments: PrepInstrument[];
  reagents: PrepReagent[];
  /** SOP 확인 화면에 띄울 레시피 단계·주의사항 */
  steps: { seq: number; name: string; note: string | null }[];
}

export async function fetchBatchPrep(batchId: string): Promise<BatchPrep> {
  if (isMock) return mockConsole.fetchBatchPrep(batchId);

  const { data: batch, error: e1 } = await supabase
    .from('batches')
    .select(
      `id, lot_number, status, created_at, sop_confirmed_at, lot_confirmed_at, prep_completed_at,
       requests!inner ( recipe_id )`,
    )
    .eq('id', batchId)
    .single<BatchPrep['batch'] & { requests: { recipe_id: string } }>();
  if (e1) throw e1;

  const [inst, cal, rr, lots, br, rs] = await Promise.all([
    supabase.from('instruments').select('id, kind').order('id'),
    supabase
      .from('instrument_calibrations')
      .select('instrument_id, kind, performed_at, performed_by:profiles!instrument_calibrations_performed_by_fkey ( name )')
      .order('performed_at', { ascending: false })
      .returns<{ instrument_id: string; kind: CalibrationKind; performed_at: string; performed_by: { name: string } }[]>(),
    supabase.from('recipe_reagents').select('id, seq, name, amount, unit, kind').eq('recipe_id', batch.requests.recipe_id).order('seq'),
    supabase.from('reagent_lots').select('id, reagent, lot_number, expires_on, note').order('expires_on', { ascending: false }),
    supabase.from('batch_reagents').select('recipe_reagent_id, reagent_lot_id, confirmed_at').eq('batch_id', batchId),
    supabase.from('recipe_steps').select('seq, name, note').eq('recipe_id', batch.requests.recipe_id).order('seq'),
  ]);
  for (const r of [inst, cal, rr, lots, br, rs]) if (r.error) throw r.error;

  const lastBy = new Map<string, NonNullable<PrepInstrument['last']>>();
  for (const c of cal.data ?? []) if (!lastBy.has(c.instrument_id)) lastBy.set(c.instrument_id, c);

  return {
    batch,
    instruments: (inst.data ?? []).map((i) => ({ id: i.id, kind: i.kind, last: lastBy.get(i.id) ?? null })),
    reagents: (rr.data ?? []).map((r) => ({
      reagent: r,
      lots: (lots.data ?? []).filter((l) => l.reagent === r.name),
      chosen: (br.data ?? []).find((b) => b.recipe_reagent_id === r.id) ?? null,
    })),
    steps: rs.data ?? [],
  };
}

export interface BatchInquiry {
  id: string;
  question: string;
  asked_at: string;
  decision: InquiryDecision | null;
  answer: string | null;
  answered_at: string | null;
  process_steps: { seq: number; recipe_steps: { name: string } } | null;
}

export async function fetchBatchInquiries(batchId: string): Promise<BatchInquiry[]> {
  if (isMock) return mockConsole.fetchBatchInquiries(batchId);
  const { data, error } = await supabase
    .from('inquiries')
    .select(`id, question, asked_at, decision, answer, answered_at,
             process_steps ( seq, recipe_steps ( name ) )`)
    .eq('batch_id', batchId)
    .order('asked_at', { ascending: false })
    .returns<BatchInquiry[]>();
  if (error) throw error;
  return data;
}
