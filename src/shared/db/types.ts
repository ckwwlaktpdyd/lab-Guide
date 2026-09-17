/**
 * DB 타입.
 *
 * 지금은 `supabase/migrations/*.sql`을 보고 손으로 맞춘 것이다.
 * 프로젝트를 연결한 뒤에는 아래 명령으로 **재생성해서 이 파일을 덮어쓴다.**
 *
 *   npx supabase gen types typescript --project-id <ref> > src/shared/db/types.ts
 *
 * 그때까지는 마이그레이션을 고칠 때 이 파일도 함께 고쳐야 한다.
 *
 * ⚠️ 여기의 행 타입은 반드시 `interface`가 아니라 `type`이어야 한다.
 * supabase-js의 GenericTable이 `Row: Record<string, unknown>`을 요구하는데,
 * interface는 암묵적 인덱스 시그니처를 갖지 않아 대입되지 않는다. 그러면 스키마 전체가
 * GenericSchema 판정에 실패하고 `.rpc()` 인자 타입이 undefined로 무너진다.
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

export type Profile = {
  id: string;
  name: string;
  role: UserRole;
  org: string;
  created_at: string;
};

export type Instrument = {
  id: string;
  kind: string;
  provides: string[];
  created_at: string;
};

export type ReagentLot = {
  id: string;
  reagent: string;
  lot_number: string;
  expires_on: string;
  note: string | null;
};

export type RecipeTargetParams = {
  ph?: number;
  ph_tolerance?: number;
  ph_min?: number;
  ph_max?: number;
  volume_ml?: number;
  conductivity_ms_cm?: number;
  conductivity_min?: number;
  conductivity_max?: number;
};

export type BufferRecipe = {
  id: string;
  name: string;
  target_params: RecipeTargetParams;
  created_at: string;
};

export type RecipeStep = {
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
};

export type Request = {
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
};

export type Batch = {
  id: string;
  lot_number: string;
  request_id: string;
  manufacturer_id: string;
  status: BatchStatus;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
};

export type ProcessStep = {
  id: string;
  batch_id: string;
  recipe_step_id: string;
  seq: number;
  status: StepStatus;
  reagent_lot_id: string | null;
  note: string | null;
  updated_by: string | null;
  completed_at: string | null;
};

/** spec §10 공통 구조. 공정 단계와 최종 결과 양쪽에 붙는다. */
export type Measurement = {
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
};

export type Deviation = {
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
};

export type BatchSummary = {
  id: string;
  batch_id: string;
  content: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
};

export type Result = {
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
};

export type Comment = {
  id: string;
  request_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

/** 서버가 채우는 컬럼은 insert 시 생략할 수 있다. */
type Generated = 'id' | 'created_at';
type Insert<T, K extends keyof T = never> = Omit<T, Extract<Generated | K, keyof T>> &
  Partial<Pick<T, Extract<Generated | K, keyof T>>>;

type Table<Row, Ins = Insert<Row>> = {
  Row: Row;
  Insert: Ins;
  Update: Partial<Ins>;
  Relationships: [];
};

export type Database = {
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
    Views: { [_ in never]: never };
    Functions: {
      accept_request: { Args: { p_request_id: string }; Returns: Batch };
      reject_request: { Args: { p_request_id: string; p_reason: string }; Returns: undefined };
      complete_step: { Args: { p_step_id: string }; Returns: undefined };
      register_deviation: {
        Args: { p_step_id: string; p_description: string };
        Returns: Deviation;
      };
      resolve_deviation: {
        Args: { p_deviation_id: string; p_cause: string; p_action: string };
        Returns: undefined;
      };
      next_lot_number: { Args: Record<string, never>; Returns: string };
      create_request: {
        Args: {
          p_request_type: RequestType;
          p_desired_completion_at: string;
          p_recipe_id?: string;
          p_volume_ml?: number;
          p_parent_request_id?: string;
          p_reason?: string;
        };
        Returns: Request;
      };
    };
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
    CompositeTypes: { [_ in never]: never };
  };
};
