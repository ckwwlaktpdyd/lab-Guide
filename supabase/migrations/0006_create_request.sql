-- 의뢰 생성 함수 — 신규·재의뢰·재제조를 한 곳에서.
--
-- 의뢰자가 직접 INSERT해도 되지만, REQ 번호 발번과 재제조 규칙(원본 링크·레시피 상속·사유 필수)을
-- 클라이언트마다 다시 짜게 두면 어긋난다. 발번은 LOT처럼 함수가 한다.

create or replace function next_request_code() returns text
  language sql volatile security definer set search_path = public
  as $$
  select 'REQ-' || lpad((coalesce(max(substring(code from 'REQ-(\d+)')::int), 0) + 1)::text, 3, '0')
  from requests
  $$;

create or replace function create_request(
  p_request_type         request_type,
  p_desired_completion_at timestamptz,
  p_recipe_id            uuid default null,
  p_volume_ml            numeric default null,
  p_parent_request_id    uuid default null,
  p_reason               text default null
) returns requests
  language plpgsql volatile security definer set search_path = public
  as $$
declare
  v_parent requests;
  v_recipe uuid := p_recipe_id;
  v_volume numeric := p_volume_ml;
  v_req    requests;
begin
  if auth_role() <> 'client' then
    raise exception '의뢰자만 의뢰를 만들 수 있습니다' using errcode = '42501';
  end if;
  if p_desired_completion_at <= now() then
    raise exception '희망 완료 일시는 지금 이후여야 합니다' using errcode = '22023';
  end if;

  if p_request_type in ('remake', 'resubmit') then
    if p_parent_request_id is null then
      raise exception '원본 의뢰가 필요합니다' using errcode = '22023';
    end if;
    if nullif(btrim(p_reason), '') is null then
      raise exception '사유를 입력해야 합니다' using errcode = '22023';
    end if;

    -- 원본이 본인 것인지 확인한다. security definer라 RLS가 안 걸리므로 직접 본다.
    select * into v_parent from requests
     where id = p_parent_request_id and requester_id = auth.uid();
    if not found then
      raise exception '원본 의뢰를 찾을 수 없습니다' using errcode = 'P0002';
    end if;

    -- 재제조는 "동일 조건으로 새 배치" — 레시피·부피를 원본에서 상속한다.
    v_recipe := coalesce(v_recipe, v_parent.recipe_id);
    v_volume := coalesce(v_volume, v_parent.volume_ml);
  end if;

  if v_recipe is null or v_volume is null then
    raise exception '레시피와 부피가 필요합니다' using errcode = '22023';
  end if;

  insert into requests (code, requester_id, recipe_id, request_type, status,
                        parent_request_id, volume_ml, desired_completion_at, reason)
  values (next_request_code(), auth.uid(), v_recipe, p_request_type, 'pending',
          p_parent_request_id, v_volume, p_desired_completion_at, p_reason)
  returning * into v_req;

  return v_req;
end;
$$;

grant execute on function create_request, next_request_code to authenticated;
