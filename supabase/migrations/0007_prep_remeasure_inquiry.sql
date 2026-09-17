-- 제조자 콘솔 UX 보강 — docs/console-ux-0917.md
--   A 제조 준비 체크 (0점·교정 → SOP → 시약 로트 → 제조 LOT)
--   B 재측량 루프 (덮어쓰지 않고 행 추가, 교정 이력에 링크)
--   C 공정 중 의뢰자 확인 요청 (배치가 멈추고 답을 기다린다)

-- ─── enum ──────────────────────────────────────────────────────
alter type batch_status add value if not exists 'waiting_client' before 'completed';
create type calibration_kind as enum ('zero', 'calibration');
create type inquiry_decision as enum ('proceed', 'hold');

-- ─── 레시피 시약을 행으로 ───────────────────────────────────────
-- recipe_steps.reagent에 "NaCl 4.00 / KCl 0.10 / …"로 뭉쳐 있으면 로트를 시약별로 고를 수 없다.
create table recipe_reagents (
  id        uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references buffer_recipes on delete cascade,
  seq       int  not null,
  name      text not null,
  amount    numeric,
  unit      text,
  kind      reagent_kind not null,
  unique (recipe_id, seq),
  constraint titrated_reagent_has_no_amount
    check (kind <> 'titrated' or amount is null)
);

-- 이 배치에서 각 시약에 고른 로트. 한 시약에 한 로트.
create table batch_reagents (
  id                uuid primary key default gen_random_uuid(),
  batch_id          uuid not null references batches on delete cascade,
  recipe_reagent_id uuid not null references recipe_reagents on delete restrict,
  reagent_lot_id    uuid not null references reagent_lots on delete restrict,
  confirmed_by      uuid not null references profiles on delete restrict,
  confirmed_at      timestamptz not null default now(),
  unique (batch_id, recipe_reagent_id)
);

-- ─── 교정 이력 ─────────────────────────────────────────────────
-- 기구 사용기록서의 디지털판. 누가·몇시에 했는지의 팩트.
create table instrument_calibrations (
  id            uuid primary key default gen_random_uuid(),
  instrument_id text not null references instruments on delete cascade,
  kind          calibration_kind not null,
  performed_by  uuid not null references profiles on delete restrict,
  performed_at  timestamptz not null default now(),
  note          text
);
create index on instrument_calibrations (instrument_id, performed_at desc);

-- ─── 측정값: 재측량 회차 + 교정 링크 ──────────────────────────────
alter table measurements
  add column attempt        int  not null default 1,
  add column calibration_id uuid references instrument_calibrations on delete set null;

comment on column measurements.attempt is
  '한 단계 안 재측량 회차. 덮어쓰지 않고 행을 추가한다 — 스티커를 떼지 않는 원칙.';

-- ─── 배치: 준비 체크 진척 ───────────────────────────────────────
alter table batches
  add column sop_confirmed_at  timestamptz,
  add column sop_confirmed_by  uuid references profiles on delete set null,
  add column lot_confirmed_at  timestamptz,
  add column lot_confirmed_by  uuid references profiles on delete set null,
  add column prep_completed_at timestamptz;

-- ─── 의뢰자 확인 요청 ──────────────────────────────────────────
create table inquiries (
  id              uuid primary key default gen_random_uuid(),
  batch_id        uuid not null references batches on delete cascade,
  process_step_id uuid references process_steps on delete set null,
  question        text not null,
  asked_by        uuid not null references profiles on delete restrict,
  asked_at        timestamptz not null default now(),
  decision        inquiry_decision,
  answer          text,
  answered_by     uuid references profiles on delete set null,
  answered_at     timestamptz,
  -- 멈춰달라면 이유가 있어야 한다.
  constraint hold_needs_answer
    check (decision is distinct from 'hold' or nullif(btrim(answer), '') is not null)
);
create index on inquiries (batch_id, asked_at desc);
create index on inquiries (batch_id) where decision is null;

-- ─── RLS ───────────────────────────────────────────────────────
alter table recipe_reagents         enable row level security;
alter table batch_reagents          enable row level security;
alter table instrument_calibrations enable row level security;
alter table inquiries               enable row level security;

create policy "레시피 시약 조회" on recipe_reagents for select using (auth.uid() is not null);
create policy "레시피 시약 관리" on recipe_reagents for all using (is_manufacturer()) with check (is_manufacturer());

create policy "본인 배치의 시약 로트 조회" on batch_reagents for select using (owns_batch(batch_id));
create policy "제조자는 시약 로트 관리" on batch_reagents for all using (is_manufacturer()) with check (is_manufacturer());

-- 교정 이력은 의뢰자도 읽는다 — 결과 패널에서 "이 값은 어느 교정 아래에서 찍혔나"를 보여준다.
create policy "교정 이력 조회" on instrument_calibrations for select using (auth.uid() is not null);
create policy "제조자는 교정 기록" on instrument_calibrations for all using (is_manufacturer()) with check (is_manufacturer());

create policy "본인 배치의 확인 요청 조회" on inquiries for select using (owns_batch(batch_id));
create policy "제조자는 전체 확인 요청 조회" on inquiries for select using (is_manufacturer());
create policy "제조자는 확인 요청 관리" on inquiries for all using (is_manufacturer()) with check (is_manufacturer());
-- 의뢰자는 본인 배치의 열린 요청에 답만 한다.
create policy "의뢰자 확인 요청 답변" on inquiries
  for update using (owns_batch(batch_id) and decision is null)
  with check (owns_batch(batch_id) and answered_by = auth.uid());

alter publication supabase_realtime add table inquiries;
alter publication supabase_realtime add table instrument_calibrations;

-- ─── 함수 ──────────────────────────────────────────────────────

create or replace function record_calibration(
  p_instrument_id text, p_kind calibration_kind, p_note text default null
) returns instrument_calibrations
  language plpgsql volatile security definer set search_path = public
  as $$
declare v_row instrument_calibrations;
begin
  if not is_manufacturer() then
    raise exception '제조자만 교정을 기록할 수 있습니다' using errcode = '42501';
  end if;
  insert into instrument_calibrations (instrument_id, kind, performed_by, note)
  values (p_instrument_id, p_kind, auth.uid(), p_note)
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function confirm_sop(p_batch_id uuid) returns void
  language plpgsql volatile security definer set search_path = public
  as $$
begin
  if not is_manufacturer() then
    raise exception '제조자만 확인할 수 있습니다' using errcode = '42501';
  end if;
  update batches set sop_confirmed_at = now(), sop_confirmed_by = auth.uid()
   where id = p_batch_id and status = 'preparing';
  if not found then
    raise exception '준비중인 배치가 아닙니다' using errcode = '22023';
  end if;
end;
$$;

-- 만료 로트는 화면에서도 막지만 함수도 거부한다. 우회 경로가 없어야 한다.
create or replace function select_batch_reagent(
  p_batch_id uuid, p_recipe_reagent_id uuid, p_reagent_lot_id uuid
) returns void
  language plpgsql volatile security definer set search_path = public
  as $$
declare v_lot reagent_lots; v_reagent recipe_reagents;
begin
  if not is_manufacturer() then
    raise exception '제조자만 시약을 고를 수 있습니다' using errcode = '42501';
  end if;
  select * into v_lot from reagent_lots where id = p_reagent_lot_id;
  select * into v_reagent from recipe_reagents where id = p_recipe_reagent_id;
  if v_lot.id is null or v_reagent.id is null then
    raise exception '시약 또는 로트를 찾을 수 없습니다' using errcode = 'P0002';
  end if;
  if v_lot.reagent <> v_reagent.name then
    raise exception '% 로트가 아닙니다 (%)', v_reagent.name, v_lot.reagent using errcode = '22023';
  end if;
  if v_lot.expires_on < current_date then
    raise exception '만료된 로트입니다 (% · 유효 %)', v_lot.lot_number, v_lot.expires_on using errcode = '22023';
  end if;
  insert into batch_reagents (batch_id, recipe_reagent_id, reagent_lot_id, confirmed_by)
  values (p_batch_id, p_recipe_reagent_id, p_reagent_lot_id, auth.uid())
  on conflict (batch_id, recipe_reagent_id)
    do update set reagent_lot_id = excluded.reagent_lot_id,
                  confirmed_by = excluded.confirmed_by, confirmed_at = now();
end;
$$;

create or replace function confirm_lot(p_batch_id uuid) returns void
  language plpgsql volatile security definer set search_path = public
  as $$
begin
  if not is_manufacturer() then
    raise exception '제조자만 확인할 수 있습니다' using errcode = '42501';
  end if;
  update batches set lot_confirmed_at = now(), lot_confirmed_by = auth.uid()
   where id = p_batch_id and status = 'preparing';
  if not found then
    raise exception '준비중인 배치가 아닙니다' using errcode = '22023';
  end if;
end;
$$;

-- 4단계가 다 끝났는지 서버가 다시 확인한다. 화면의 잠금은 안내일 뿐이다.
create or replace function start_process(p_batch_id uuid) returns void
  language plpgsql volatile security definer set search_path = public
  as $$
declare
  v_batch batches;
  v_missing int;
  v_ph_ok boolean;
  v_bal_ok boolean;
begin
  if not is_manufacturer() then
    raise exception '제조자만 공정을 시작할 수 있습니다' using errcode = '42501';
  end if;
  select * into v_batch from batches where id = p_batch_id for update;
  if v_batch.status <> 'preparing' then
    raise exception '준비중인 배치가 아닙니다' using errcode = '22023';
  end if;

  -- ① 저울 0점은 이 배치 생성 이후, pH미터 교정은 24시간 이내
  select exists (select 1 from instrument_calibrations
                  where instrument_id = 'BAL-204' and kind = 'zero'
                    and performed_at >= v_batch.created_at) into v_bal_ok;
  select exists (select 1 from instrument_calibrations
                  where instrument_id = 'pH-2000-A' and kind = 'calibration'
                    and performed_at >= now() - interval '24 hours') into v_ph_ok;
  if not (v_bal_ok and v_ph_ok) then
    raise exception '계측기 0점·교정이 끝나지 않았습니다' using errcode = '22023';
  end if;
  -- ② SOP
  if v_batch.sop_confirmed_at is null then
    raise exception 'SOP 확인이 끝나지 않았습니다' using errcode = '22023';
  end if;
  -- ③ 칭량 시약 전부 로트 선택
  select count(*) into v_missing
    from recipe_reagents rr
    join requests r on r.recipe_id = rr.recipe_id and r.id = v_batch.request_id
    left join batch_reagents br on br.recipe_reagent_id = rr.id and br.batch_id = p_batch_id
   where rr.kind = 'weighed' and br.id is null;
  if v_missing > 0 then
    raise exception '로트를 고르지 않은 시약이 %개 있습니다', v_missing using errcode = '22023';
  end if;
  -- ④ 제조 LOT
  if v_batch.lot_confirmed_at is null then
    raise exception '제조 LOT 확인이 끝나지 않았습니다' using errcode = '22023';
  end if;

  update batches set prep_completed_at = now(), status = 'running', started_at = now()
   where id = p_batch_id;
  update process_steps set status = 'running'
   where id = (select id from process_steps where batch_id = p_batch_id order by seq limit 1);
end;
$$;

-- 재측량. 계측기 연동은 스코프 밖이므로 마지막 값을 ±0.02 흔들어 새 행을 만든다.
-- 실제 연동 시 이 함수만 기기 값을 받는 것으로 바뀐다. 한 단계 10회를 넘기지 못한다.
create or replace function remeasure(p_step_id uuid, p_label text) returns measurements
  language plpgsql volatile security definer set search_path = public
  as $$
declare
  v_last measurements;
  v_n int;
  v_cal uuid;
  v_row measurements;
begin
  if not is_manufacturer() then
    raise exception '제조자만 측정할 수 있습니다' using errcode = '42501';
  end if;
  select * into v_last from measurements
   where process_step_id = p_step_id and label = p_label
   order by attempt desc limit 1;
  if v_last.id is null then
    raise exception '이 단계에 % 측정값이 없습니다', p_label using errcode = 'P0002';
  end if;
  select max(attempt) into v_n from measurements
   where process_step_id = p_step_id and label = p_label;
  if v_n >= 10 then
    raise exception '재측량 한도(10회)에 도달했습니다. 0점·교정을 다시 확인하세요' using errcode = '22023';
  end if;
  select id into v_cal from instrument_calibrations
   where instrument_id = v_last.instrument_id order by performed_at desc limit 1;

  insert into measurements (process_step_id, label, value, unit, source, instrument_id,
                            captured_at, captured_temp_c, attempt, calibration_id)
  values (p_step_id, p_label,
          round((v_last.value + (random() - 0.5) * 0.04)::numeric, 2),
          v_last.unit, 'instrument', v_last.instrument_id, now(), v_last.captured_temp_c,
          v_n + 1, v_cal)
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function override_measurement(
  p_step_id uuid, p_label text, p_value numeric, p_reason text
) returns measurements
  language plpgsql volatile security definer set search_path = public
  as $$
declare v_last measurements; v_n int; v_row measurements;
begin
  if not is_manufacturer() then
    raise exception '제조자만 입력할 수 있습니다' using errcode = '42501';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception '수동 입력 사유를 입력해야 합니다' using errcode = '22023';
  end if;
  select * into v_last from measurements
   where process_step_id = p_step_id and label = p_label order by attempt desc limit 1;
  select coalesce(max(attempt), 0) into v_n from measurements
   where process_step_id = p_step_id and label = p_label;
  insert into measurements (process_step_id, label, value, unit, source, instrument_id,
                            entered_by, override_reason, attempt)
  values (p_step_id, p_label, p_value, coalesce(v_last.unit, ''), 'manual',
          v_last.instrument_id, auth.uid(), p_reason, v_n + 1)
  returning * into v_row;
  return v_row;
end;
$$;

-- 확인 요청. 보내는 순간 배치가 멈춘다.
create or replace function ask_client(p_step_id uuid, p_question text) returns inquiries
  language plpgsql volatile security definer set search_path = public
  as $$
declare v_batch_id uuid; v_row inquiries;
begin
  if not is_manufacturer() then
    raise exception '제조자만 확인을 요청할 수 있습니다' using errcode = '42501';
  end if;
  if nullif(btrim(p_question), '') is null then
    raise exception '질문을 입력해야 합니다' using errcode = '22023';
  end if;
  select batch_id into v_batch_id from process_steps where id = p_step_id;
  if v_batch_id is null then
    raise exception '공정 단계를 찾을 수 없습니다' using errcode = 'P0002';
  end if;
  if exists (select 1 from inquiries where batch_id = v_batch_id and decision is null) then
    raise exception '답을 기다리는 요청이 이미 있습니다' using errcode = '22023';
  end if;
  insert into inquiries (batch_id, process_step_id, question, asked_by)
  values (v_batch_id, p_step_id, p_question, auth.uid())
  returning * into v_row;
  update batches set status = 'waiting_client' where id = v_batch_id;
  return v_row;
end;
$$;

-- 답변. 진행이면 배치가 다시 움직인다. 멈춰달라면 그대로 대기 — 제조자가 편차로 전환하거나 의뢰자가 재제조를 낸다.
create or replace function answer_inquiry(
  p_inquiry_id uuid, p_decision inquiry_decision, p_answer text default null
) returns void
  language plpgsql volatile security definer set search_path = public
  as $$
declare v_batch_id uuid;
begin
  update inquiries
     set decision = p_decision, answer = p_answer, answered_by = auth.uid(), answered_at = now()
   where id = p_inquiry_id and decision is null
     and (is_manufacturer() or owns_batch(batch_id))
  returning batch_id into v_batch_id;
  if v_batch_id is null then
    raise exception '답할 수 있는 요청이 아닙니다' using errcode = 'P0002';
  end if;
  if p_decision = 'proceed' then
    update batches set status = case when exists (select 1 from deviations
                                                   where batch_id = v_batch_id and status = 'open')
                                     then 'deviation' else 'running' end
     where id = v_batch_id and status = 'waiting_client';
  end if;
end;
$$;

grant execute on function record_calibration, confirm_sop, select_batch_reagent, confirm_lot,
                          start_process, remeasure, override_measurement, ask_client, answer_inquiry
  to authenticated;
