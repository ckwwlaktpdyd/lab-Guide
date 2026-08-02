-- resolve_deviation의 입력 검증을 함수 안으로 옮긴다.
--
-- 0004에서는 빈 원인·조치를 테이블 제약(resolved_needs_action)이 막고 있었다.
-- 막히기는 하지만 클라이언트에 돌아오는 건 23514 제약 위반과 실패한 행 전체 덤프다.
-- 화면에 그대로 띄울 수 없고, 띄우면 조작자가 무엇을 고쳐야 할지 알 수 없다.
--
-- reject_request·register_deviation은 이미 함수 안에서 검증하고 있었다. 여기만 빠져 있었다.
-- 테이블 제약은 그대로 둔다 — 함수를 우회한 경로에서도 막혀야 하므로 둘 다 필요하다.

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
  if nullif(btrim(p_cause), '') is null then
    raise exception '원인을 입력해야 합니다' using errcode = '22023';
  end if;
  if nullif(btrim(p_action), '') is null then
    raise exception '조치 내용을 입력해야 합니다' using errcode = '22023';
  end if;

  update deviations
     set cause = p_cause, corrective_action = p_action,
         status = 'resolved', resolved_at = now()
   where id = p_deviation_id
  returning batch_id into v_batch_id;

  if v_batch_id is null then
    raise exception '편차를 찾을 수 없습니다' using errcode = 'P0002';
  end if;

  -- 마지막 미해결 편차가 닫힐 때만 배치를 진행중으로 되돌린다.
  if not exists (select 1 from deviations where batch_id = v_batch_id and status = 'open') then
    update batches set status = 'running' where id = v_batch_id and status = 'deviation';
    update process_steps set status = 'running'
     where batch_id = v_batch_id and status = 'deviation';
  end if;
end;
$$;
