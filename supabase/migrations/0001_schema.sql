-- Lab Guide — 스키마
-- spec-v2 §10 데이터 모델 + docs/seed-data.md의 도메인 확정분

-- ─── enum ──────────────────────────────────────────────────────
-- src/shared/db/constants.ts와 1:1 대응. 한쪽만 고치지 말 것.

create type user_role            as enum ('client', 'manufacturer');
create type request_type         as enum ('new', 'resubmit', 'remake');
create type request_status       as enum ('pending', 'accepted', 'rejected');
create type batch_status         as enum ('preparing', 'running', 'deviation', 'completed');
create type step_status          as enum ('todo', 'running', 'done', 'deviation');
create type deviation_status     as enum ('open', 'resolved');
create type client_review_status as enum ('reviewed', 'revision_requested');
create type measurement_source   as enum ('instrument', 'manual');
create type reagent_kind         as enum ('weighed', 'titrated');

-- ─── 사용자 ────────────────────────────────────────────────────

create table profiles (
  id         uuid primary key references auth.users on delete cascade,
  name       text      not null,
  role       user_role not null,
  org        text      not null,
  created_at timestamptz not null default now()
);

comment on table profiles is 'auth.users 확장. role로 두 앱의 접근 범위가 갈린다.';

-- 정책에서 자기 role을 참조할 때 profiles를 다시 읽으면 재귀가 생긴다.
-- JWT에 role을 심어두고 그걸 읽는다.
create or replace function auth_role() returns user_role
  language sql stable
  as $$ select (auth.jwt() -> 'app_metadata' ->> 'role')::user_role $$;

create or replace function is_manufacturer() returns boolean
  language sql stable
  as $$ select coalesce(auth_role() = 'manufacturer', false) $$;

-- ─── 계측기 · 시약 ─────────────────────────────────────────────

create table instruments (
  id         text primary key,           -- 'pH-2000-A'
  kind       text not null,              -- 'pH 미터' / '전도도계' / '전자저울'
  provides   text[] not null,            -- ['ph','temperature']
  created_at timestamptz not null default now()
);

create table reagent_lots (
  id         uuid primary key default gen_random_uuid(),
  reagent    text not null,              -- 'NaCl'
  lot_number text not null unique,       -- 'NACL-2607'
  expires_on date not null,
  note       text
);

comment on column reagent_lots.expires_on is
  '칭량 단계에서 만료 여부를 확인한다. 만료 로트 사용 시 편차 등록 대상.';

-- ─── 레시피 ────────────────────────────────────────────────────

create table buffer_recipes (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,           -- 'PBS 1X'
  target_params jsonb not null,          -- { ph: 7.40, ph_tolerance: 0.05, volume_ml: 500, ... }
  created_at    timestamptz not null default now()
);

create table recipe_steps (
  id        uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references buffer_recipes on delete cascade,
  seq       int  not null,
  name      text not null,               -- 'pH 조정'
  -- 이 단계에서 다루는 시약의 성격. null이면 시약을 다루지 않는 단계(여과·QC 측정 등).
  kind      reagent_kind,
  reagent   text,
  -- 칭량 시약만 고정량을 갖는다. 적정 시약은 null — 투입량은 목표가 아니라 결과다.
  target_amount numeric,
  target_unit   text,
  note          text,
  unique (recipe_id, seq),
  -- 적정 시약에 고정량을 박아두는 실수를 DB가 막는다.
  constraint titrated_has_no_target
    check (kind is distinct from 'titrated' or target_amount is null)
);

comment on constraint titrated_has_no_target on recipe_steps is
  'HCl·NaOH는 목표 pH에 도달할 때까지 넣으므로 레시피에 용량을 고정할 수 없다.';

-- ─── 의뢰 ──────────────────────────────────────────────────────

create table requests (
  id                   uuid primary key default gen_random_uuid(),
  code                 text not null unique,        -- 'REQ-042'
  requester_id         uuid not null references profiles on delete restrict,
  recipe_id            uuid not null references buffer_recipes on delete restrict,
  request_type         request_type   not null default 'new',
  status               request_status not null default 'pending',
  -- 재제조·재의뢰가 원본을 가리킨다. 완료된 의뢰에서도 파생될 수 있다(spec §7).
  parent_request_id    uuid references requests on delete set null,
  volume_ml            numeric not null,
  desired_completion_at timestamptz not null,       -- 날짜 + 시각
  -- 재제조 사유는 필수. 반려 사유도 여기 남는다.
  reason               text,
  rejection_reason     text,
  created_at           timestamptz not null default now(),

  constraint remake_needs_parent
    check (request_type <> 'remake' or parent_request_id is not null),
  constraint remake_needs_reason
    check (request_type <> 'remake' or nullif(btrim(reason), '') is not null),
  constraint rejected_needs_reason
    check (status <> 'rejected' or nullif(btrim(rejection_reason), '') is not null)
);

comment on constraint remake_needs_reason on requests is
  '재제조 요청은 사유 입력이 필수다(CLAUDE.md).';

-- ─── 배치 ──────────────────────────────────────────────────────

create table batches (
  id            uuid primary key default gen_random_uuid(),
  lot_number    text not null unique,     -- 'LOT-2607-03'
  -- 수락 = 배치 생성. 별도 "배치 만들기" 단계가 없다(spec §9).
  request_id    uuid not null unique references requests on delete restrict,
  manufacturer_id uuid not null references profiles on delete restrict,
  status        batch_status not null default 'preparing',
  started_at    timestamptz,
  ended_at      timestamptz,
  created_at    timestamptz not null default now()
);

create table process_steps (
  id            uuid primary key default gen_random_uuid(),
  batch_id      uuid not null references batches on delete cascade,
  recipe_step_id uuid not null references recipe_steps on delete restrict,
  seq           int  not null,
  status        step_status not null default 'todo',
  reagent_lot_id uuid references reagent_lots on delete set null,
  note          text,
  updated_by    uuid references profiles on delete set null,
  completed_at  timestamptz,
  unique (batch_id, seq)
);

-- ─── 측정값 ────────────────────────────────────────────────────
-- spec §10의 공통 구조. 공정 단계와 최종 결과 양쪽에서 쓴다.

create table measurements (
  id              uuid primary key default gen_random_uuid(),
  process_step_id uuid references process_steps on delete cascade,
  result_id       uuid,                   -- results 생성 후 FK 추가
  label           text    not null,       -- 'pH' / '전도도' / '부피'
  value           numeric not null,
  unit            text    not null,
  source          measurement_source not null,

  -- source = 'instrument'
  instrument_id   text references instruments on delete set null,
  captured_at     timestamptz,
  -- pH는 온도에 좌우된다. Tris 계열은 -0.028 pH/°C.
  captured_temp_c numeric,

  -- source = 'manual' — QC 감사 추적
  entered_by      uuid references profiles on delete set null,
  override_reason text,

  created_at      timestamptz not null default now(),

  constraint belongs_to_one_parent
    check (num_nonnulls(process_step_id, result_id) = 1),
  constraint instrument_source_complete
    check (source <> 'instrument' or (instrument_id is not null and captured_at is not null)),
  -- 수동 입력은 사유가 반드시 남는다.
  constraint manual_source_complete
    check (source <> 'manual' or (entered_by is not null
           and nullif(btrim(override_reason), '') is not null))
);

comment on constraint manual_source_complete on measurements is
  '수동 덮어쓰기는 사유 입력 필수 — 감사 추적(CLAUDE.md).';

-- ─── 편차 ──────────────────────────────────────────────────────

create table deviations (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,   -- 'DEV-01'
  batch_id          uuid not null references batches on delete cascade,
  process_step_id   uuid references process_steps on delete set null,
  description       text not null,
  cause             text,
  corrective_action text,
  status            deviation_status not null default 'open',
  created_by        uuid not null references profiles on delete restrict,
  created_at        timestamptz not null default now(),
  resolved_at       timestamptz,

  constraint resolved_needs_action
    check (status <> 'resolved' or (nullif(btrim(cause), '') is not null
           and nullif(btrim(corrective_action), '') is not null
           and resolved_at is not null))
);

-- ─── 배치 요약 · 결과 ──────────────────────────────────────────

create table batch_summaries (
  id           uuid primary key default gen_random_uuid(),
  batch_id     uuid not null unique references batches on delete cascade,
  content      text not null,
  confirmed_by uuid references profiles on delete set null,
  confirmed_at timestamptz
);

create table results (
  id       uuid primary key default gen_random_uuid(),
  batch_id uuid not null unique references batches on delete cascade,

  -- 제조자 1차 검토(서명). "승인"이 아니다.
  manufacturer_signed_by uuid references profiles on delete set null,
  manufacturer_signed_at timestamptz,

  -- 의뢰자 결과 리뷰(서명)
  client_review_status client_review_status,
  client_signed_by     uuid references profiles on delete set null,
  client_signed_at     timestamptz,
  revision_note        text,

  created_at timestamptz not null default now(),

  constraint revision_needs_note
    check (client_review_status is distinct from 'revision_requested'
           or nullif(btrim(revision_note), '') is not null)
);

alter table measurements
  add constraint measurements_result_id_fkey
  foreign key (result_id) references results on delete cascade;

-- ─── 코멘트 ────────────────────────────────────────────────────
-- 의뢰 단위 스레드. 반려 사유가 여기로 전달된다(spec §9).

create table comments (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests on delete cascade,
  author_id  uuid not null references profiles on delete restrict,
  body       text not null,
  created_at timestamptz not null default now()
);

-- ─── 인덱스 ────────────────────────────────────────────────────

create index on requests (requester_id, created_at desc);
create index on requests (status) where status = 'pending';
create index on requests (parent_request_id);
create index on batches (status);
create index on process_steps (batch_id, seq);
create index on measurements (process_step_id);
create index on measurements (result_id);
create index on deviations (batch_id);
create index on deviations (status) where status = 'open';
create index on comments (request_id, created_at);
