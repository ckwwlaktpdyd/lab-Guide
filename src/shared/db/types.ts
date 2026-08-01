/**
 * DB 타입.
 *
 * 지금은 `supabase/migrations/*.sql`을 보고 손으로 맞춘 것이다.
 * 프로젝트를 연결한 뒤에는 아래 명령으로 **재생성해서 이 파일을 덮어쓴다.**
 *
 *   npx supabase gen types typescript --project-id <ref> > src/shared/db/types.ts
 *
 * 그때까지는 마이그레이션을 고칠 때 이 파일도 함께 고쳐야 한다.
 */

import type {
  BatchStatus,
  ClientReviewStatus,
  DeviationStatus,
  MeasurementSource,
  ReagentKind,
  RequestStatus,
  RequestType,
  StepStatus,
  UserRole,
} from './constants';

export interface Profile {
  id: string;
  name: string;
  role: UserRole;
  org: string;
  created_at: string;
}

export interface Instrument {
  id: string;
  kind: string;
  provides: string[];
  created_at: string;
}

export interface ReagentLot {
  id: string;
  reagent: string;
  lot_number: string;
  expires_on: string;
  note: string | null;
}

export interface RecipeTargetParams {
  ph?: number;
  ph_tolerance?: number;
  ph_min?: number;
  ph_max?: number;
  volume_ml?: number;
  conductivity_ms_cm?: number;
  conductivity_min?: number;
  conductivity_max?: number;
}

export interface BufferRecipe {
  id: string;
  name: string;
  target_params: RecipeTargetParams;
  created_at: string;
}

export interface RecipeStep {
  id: string;
  recipe_id: string;
  seq: number;
  name: string;
  /** null이면 시약을 다루지 않는 단계(여과·QC 측정 등) */
  kind: ReagentKind | null;
  reagent: string | null;
  /** 칭량 시약만 값을 갖는다. 적정 시약은 항상 null — DB 제약으로 강제됨 */
  target_amount: number | null;
  target_unit: string | null;
  note: string | null;
}

export interface Request {
  id: string;
  code: string;
  requester_id: string;
  recipe_id: string;
  request_type: RequestType;
  status: RequestStatus;
  parent_request_id: string | null;
  volume_ml: number;
  desired_completion_at: string;
  reason: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface Batch {
  id: string;
  lot_number: string;
  request_id: string;
  manufacturer_id: string;
  status: BatchStatus;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface ProcessStep {
  id: string;
  batch_id: string;
  recipe_step_id: string;
  seq: number;
  status: StepStatus;
  reagent_lot_id: string | null;
  note: string | null;
  updated_by: string | null;
  completed_at: string | null;
}

/** spec §10 공통 구조. 공정 단계와 최종 결과 양쪽에 붙는다. */
export interface Measurement {
  id: string;
  process_step_id: string | null;
  result_id: string | null;
  label: string;
  value: number;
  unit: string;
  source: MeasurementSource;
  instrument_id: string | null;
  captured_at: string | null;
  /** pH는 온도에 좌우된다. Tris 계열은 -0.028 pH/°C */
  captured_temp_c: number | null;
  entered_by: string | null;
  /** source='manual'이면 필수 — 감사 추적 */
  override_reason: string | null;
  created_at: string;
}

export interface Deviation {
  id: string;
  code: string;
  batch_id: string;
  process_step_id: string | null;
  description: string;
  cause: string | null;
  corrective_action: string | null;
  status: DeviationStatus;
  created_by: string;
  created_at: string;
  resolved_at: string | null;
}

export interface BatchSummary {
  id: string;
  batch_id: string;
  content: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
}

export interface Result {
  id: string;
  batch_id: string;
  /** 제조자 1차 검토(서명) */
  manufacturer_signed_by: string | null;
  manufacturer_signed_at: string | null;
  /** 의뢰자 결과 리뷰(서명) */
  client_review_status: ClientReviewStatus | null;
  client_signed_by: string | null;
  client_signed_at: string | null;
  revision_note: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  request_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

/** 서버가 채우는 컬럼은 insert 시 생략할 수 있다. */
type Generated = 'id' | 'created_at';
type Insert<T, K extends keyof T = never> = Omit<T, Extract<Generated | K, keyof T>> &
  Partial<Pick<T, Extract<Generated | K, keyof T>>>;

interface Table<Row, Ins = Insert<Row>> {
  Row: Row;
  Insert: Ins;
  Update: Partial<Ins>;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile, Insert<Profile, 'created_at'>>;
      instruments: Table<Instrument, Insert<Instrument, 'created_at'>>;
      reagent_lots: Table<ReagentLot>;
      buffer_recipes: Table<BufferRecipe>;
      recipe_steps: Table<RecipeStep>;
      requests: Table<Request>;
      batches: Table<Batch>;
      process_steps: Table<ProcessStep>;
      measurements: Table<Measurement>;
      deviations: Table<Deviation>;
      batch_summaries: Table<BatchSummary>;
      results: Table<Result>;
      comments: Table<Comment>;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      user_role: UserRole;
      request_type: RequestType;
      request_status: RequestStatus;
      batch_status: BatchStatus;
      step_status: StepStatus;
      deviation_status: DeviationStatus;
      client_review_status: ClientReviewStatus;
      measurement_source: MeasurementSource;
      reagent_kind: ReagentKind;
    };
    CompositeTypes: Record<never, never>;
  };
}
