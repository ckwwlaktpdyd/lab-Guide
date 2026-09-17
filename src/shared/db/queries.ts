import { supabase } from './client';
import type {
  BatchStatus,
  ClientReviewStatus,
  DeviationStatus,
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

/** 의뢰함 — 수락 대기 건. 재제조가 위로 오도록 정렬한다. */
export async function fetchPendingRequests(): Promise<RequestListItem[]> {
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

export async function fetchBatches(): Promise<BatchListItem[]> {
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
  const { data, error } = await supabase
    .from('process_steps')
    .select(
      `
      id, seq, status, completed_at, note,
      recipe_steps ( name, kind, reagent, target_amount, target_unit, note ),
      measurements ( id, label, value, unit, source, instrument_id, captured_at,
                     captured_temp_c, override_reason )
    `,
    )
    .eq('batch_id', batchId)
    .order('seq')
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
    result: {
      manufacturer_signed_at: string | null;
      client_review_status: ClientReviewStatus | null;
    } | null;
  } | null;
}

export async function fetchMyRequests(): Promise<MyRequest[]> {
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
