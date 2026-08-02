-- 워크플로우 함수
--
-- 수락 = 배치 생성이다(spec §9). 그런데 이건 쓰기 네 개가 한 덩어리다.
--   ① 의뢰 상태를 accepted로  ② LOT 발번  ③ 배치 생성  ④ 레시피 단계를 공정으로 펼치기
-- 클라이언트에서 네 번 호출하면 중간에 끊겼을 때 배치 없는 수락이나 단계 없는 배치가 남는다.
-- 하나의 함수로 묶어 원자적으로 처리한다.

-- LOT-YYMM-nn. 같은 달 안에서 순번이 이어진다.
create or replace function next_lot_number() returns text
  language sql volatile security definer set search_path = public
  as $$
  select 'LOT-' || to_char(now(), 'YYMM') || '-' ||
         lpad((coalesce(max(substring(lot_number from 'LOT-\d{4}-(\d+)')::int), 0) + 1)::text, 2, '0')
  from batches
  where lot_number like 'LOT-' || to_char(now(), 'YYMM') || '-%'
  $$;

create or replace function accept_request(p_request_id uuid)
  returns batches
  language plpgsql volatile security definer set search_path = public
  as $$
declare
  v_request requests;
  v_batch   batches;
begin
  if not is_manufacturer() then
    raise exception '제조자만 의뢰를 수락할 수 있습니다' using errcode = '42501';
  end if;

  select * into v_request from requests where id = p_request_id for update;
  if not found then
    raise exception '의뢰를 찾을 수 없습니다' using errcode = 'P0002';
  end if;
  if v_request.status <> 'pending' then
    raise exception '이미 처리된 의뢰입니다 (현재 %)', v_request.status using errcode = '22023';
  end if;

  update requests set status = 'accepted' where id = p_request_id;

  insert into batches (lot_number, request_id, manufacturer_id, status)
  values (next_lot_number(), p_request_id, auth.uid(), 'preparing')
  returning * into v_batch;

  -- 레시피 단계를 그대로 공정 단계로 펼친다.
  insert into process_steps (batch_id, recipe_step_id, seq, status)
  select v_batch.id, rs.id, rs.seq, 'todo'
  from recipe_steps rs
  where rs.recipe_id = v_request.recipe_id;

  return v_batch;
end;
$$;

comment on function accept_request is
  '수락 = 배치 생성. 별도 "배치 만들기" 단계가 없다(spec §9).';

-- 반려는 사유가 필수이고, 그 사유가 의뢰자 코멘트 스레드로 전달된다(spec §9).
create or replace function reject_request(p_request_id uuid, p_reason text)
  returns void
  language plpgsql volatile security definer set search_path = public
  as $$
begin
  if not is_manufacturer() then
    raise exception '제조자만 의뢰를 반려할 수 있습니다' using errcode = '42501';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception '반려 사유를 입력해야 합니다' using errcode = '22023';
  end if;

  update requests
     set status = 'rejected', rejection_reason = p_reason
   where id = p_request_id and status = 'pending';

  if not found then
    raise exception '대기중인 의뢰가 아닙니다' using errcode = '22023';
  end if;

  insert into comments (request_id, author_id, body)
  values (p_request_id, auth.uid(), '반려되었습니다 — ' || p_reason);
end;
$$;

-- 단계 완료 시 배치 상태도 함께 움직인다.
-- 첫 단계를 완료하면 준비중 → 진행중, 마지막 단계를 완료하면 → 완료.
create or replace function complete_step(p_step_id uuid)
  returns void
  language plpgsql volatile security definer set search_path = public
  as $$
declare
  v_batch_id uuid;
  v_remaining int;
begin
  if not is_manufacturer() then
    raise exception '제조자만 공정을 기록할 수 있습니다' using errcode = '42501';
  end if;

  update process_steps
     set status = 'done', completed_at = now(), updated_by = auth.uid()
   where id = p_step_id
  returning batch_id into v_batch_id;

  if v_batch_id is null then
    raise exception '공정 단계를 찾을 수 없습니다' using errcode = 'P0002';
  end if;

  select count(*) into v_remaining
    from process_steps where batch_id = v_batch_id and status <> 'done';

  if v_remaining = 0 then
    update batches set status = 'completed', ended_at = now() where id = v_batch_id;
  else
    -- 미해결 편차가 있으면 편차 상태를 유지한다.
    update batches b set status = 'running', started_at = coalesce(b.started_at, now())
     where b.id = v_batch_id
       and not exists (select 1 from deviations d
                        where d.batch_id = v_batch_id and d.status = 'open');
    -- 다음 단계를 진행중으로.
    update process_steps set status = 'running'
     where id = (select id from process_steps
                  where batch_id = v_batch_id and status = 'todo'
                  order by seq limit 1);
  end if;
end;
$$;

-- 편차 등록은 공정 흐름 안에서 일어난다. 배치와 해당 단계가 함께 편차 상태가 된다.
create or replace function register_deviation(
  p_step_id uuid, p_description text
) returns deviations
  language plpgsql volatile security definer set search_path = public
  as $$
declare
  v_batch_id uuid;
  v_dev deviations;
begin
  if not is_manufacturer() then
    raise exception '제조자만 편차를 등록할 수 있습니다' using errcode = '42501';
  end if;
  if nullif(btrim(p_description), '') is null then
    raise exception '편차 내용을 입력해야 합니다' using errcode = '22023';
  end if;

  select batch_id into v_batch_id from process_steps where id = p_step_id;
  if v_batch_id is null then
    raise exception '공정 단계를 찾을 수 없습니다' using errcode = 'P0002';
  end if;

  insert into deviations (code, batch_id, process_step_id, description, created_by)
  values (
    'DEV-' || lpad((coalesce((select max(substring(code from 'DEV-(\d+)')::int) from deviations), 0) + 1)::text, 2, '0'),
    v_batch_id, p_step_id, p_description, auth.uid()
  )
  returning * into v_dev;

  update process_steps set status = 'deviation', updated_by = auth.uid() where id = p_step_id;
  update batches set status = 'deviation' where id = v_batch_id;

  return v_dev;
end;
$$;

-- 조치 완료. 마지막 미해결 편차가 닫히면 배치는 다시 진행중으로 돌아간다.
create or replace function resolve_deviation(
  p_deviation_id uuid, p_cause text, p_action text
) returns void
  language plpgsql volatile security definer set search_path = public
  as $$
declare
  v_batch_id uuid;
begin
  if not is_manufacturer() then
    raise exception '제조자만 편차를 조치할 수 있습니다' using errcode = '42501';
  end if;

  update deviations
     set cause = p_cause, corrective_action = p_action,
         status = 'resolved', resolved_at = now()
   where id = p_deviation_id
  returning batch_id into v_batch_id;

  if v_batch_id is null then
    raise exception '편차를 찾을 수 없습니다' using errcode = 'P0002';
  end if;

  if not exists (select 1 from deviations where batch_id = v_batch_id and status = 'open') then
    update batches set status = 'running' where id = v_batch_id and status = 'deviation';
    update process_steps set status = 'running'
     where batch_id = v_batch_id and status = 'deviation';
  end if;
end;
$$;

grant execute on function accept_request, reject_request, complete_step,
                          register_deviation, resolve_deviation, next_lot_number
  to authenticated;
