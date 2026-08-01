-- 수동 측정값의 사유 필수 조건을 바로잡는다.
--
-- 문제: 0001에서 source='manual'이면 무조건 override_reason을 요구했다.
-- 그런데 CLAUDE.md가 사유를 요구하는 건 "수동 **덮어쓰기**"다.
-- 부피처럼 애초에 계측기가 잡지 않는 값은 원래부터 수동이고, 덮어쓴 게 아니므로
-- 사유를 물을 대상이 아니다. 기존 제약대로면 "부피 500 mL"를 넣을 때도
-- 억지 사유를 지어내야 한다.
--
-- 해결: instrument_id가 있는데 source='manual'이면 = 계측기 값을 사람이 덮어쓴 것.
--       이때만 사유를 요구한다. entered_by는 수동이면 항상 필요하다(감사 추적).

alter table measurements drop constraint manual_source_complete;

alter table measurements
  add constraint manual_needs_author
    check (source <> 'manual' or entered_by is not null);

alter table measurements
  add constraint override_needs_reason
    check (
      source <> 'manual'
      or instrument_id is null
      or nullif(btrim(override_reason), '') is not null
    );

comment on constraint override_needs_reason on measurements is
  '계측기 값을 수동으로 덮어쓸 때만 사유 필수 — 감사 추적(CLAUDE.md).';
