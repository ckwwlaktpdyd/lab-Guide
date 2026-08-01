-- Lab Guide — Row Level Security
-- spec-v2 §6 권한 매트릭스를 DB 레벨에서 강제한다.
--
-- 원칙
--   client       — 본인이 낸 의뢰와 거기서 파생된 것만 본다
--   manufacturer — 전체 배치를 보고 공정을 기록한다
--
-- 두 앱이 같은 Supabase 프로젝트를 쓰므로, 앱 코드가 아니라 여기가 유일한 방어선이다.

alter table profiles        enable row level security;
alter table instruments     enable row level security;
alter table reagent_lots    enable row level security;
alter table buffer_recipes  enable row level security;
alter table recipe_steps    enable row level security;
alter table requests        enable row level security;
alter table batches         enable row level security;
alter table process_steps   enable row level security;
alter table measurements    enable row level security;
alter table deviations      enable row level security;
alter table batch_summaries enable row level security;
alter table results         enable row level security;
alter table comments        enable row level security;

-- ─── 헬퍼 ──────────────────────────────────────────────────────
-- 정책 안에서 테이블을 다시 읽으면 정책이 또 걸려 재귀한다.
-- security definer로 RLS를 우회해 소유 관계만 확인한다.

create or replace function owns_request(req uuid) returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists (select 1 from requests r
                       where r.id = req and r.requester_id = auth.uid()) $$;

create or replace function owns_batch(b uuid) returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists (select 1 from batches bt
                       join requests r on r.id = bt.request_id
                       where bt.id = b and r.requester_id = auth.uid()) $$;

create or replace function owns_process_step(s uuid) returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists (select 1 from process_steps ps
                       where ps.id = s and owns_batch(ps.batch_id)) $$;

-- ─── 프로필 ────────────────────────────────────────────────────

create policy "본인 프로필 조회" on profiles
  for select using (id = auth.uid());
-- 제조자는 의뢰자 이름을 화면에 띄워야 한다.
create policy "제조자는 전체 프로필 조회" on profiles
  for select using (is_manufacturer());

-- ─── 마스터 데이터 ─────────────────────────────────────────────
-- 레시피·계측기·시약 로트는 로그인한 사용자면 모두 읽는다. 쓰기는 제조자만.

create policy "레시피 조회" on buffer_recipes
  for select using (auth.uid() is not null);
create policy "레시피 관리" on buffer_recipes
  for all using (is_manufacturer()) with check (is_manufacturer());

create policy "레시피 단계 조회" on recipe_steps
  for select using (auth.uid() is not null);
create policy "레시피 단계 관리" on recipe_steps
  for all using (is_manufacturer()) with check (is_manufacturer());

create policy "계측기 조회" on instruments
  for select using (auth.uid() is not null);
create policy "계측기 관리" on instruments
  for all using (is_manufacturer()) with check (is_manufacturer());

create policy "시약 로트 조회" on reagent_lots
  for select using (auth.uid() is not null);
create policy "시약 로트 관리" on reagent_lots
  for all using (is_manufacturer()) with check (is_manufacturer());

-- ─── 의뢰 ──────────────────────────────────────────────────────

create policy "본인 의뢰 조회" on requests
  for select using (requester_id = auth.uid());
create policy "제조자는 전체 의뢰 조회" on requests
  for select using (is_manufacturer());

-- 의뢰 생성은 의뢰자 본인만. 남의 이름으로 낼 수 없다.
create policy "의뢰 생성" on requests
  for insert with check (requester_id = auth.uid() and auth_role() = 'client');

-- 의뢰자는 아직 수락되지 않은 본인 의뢰만 수정한다.
create policy "대기중 본인 의뢰 수정" on requests
  for update using (requester_id = auth.uid() and status = 'pending')
  with check (requester_id = auth.uid());

-- 수락/반려는 제조자 몫.
create policy "제조자는 의뢰 처리" on requests
  for update using (is_manufacturer()) with check (is_manufacturer());

-- ─── 배치 ──────────────────────────────────────────────────────
-- 의뢰자는 본인 의뢰의 배치만 본다. 쓰기는 전혀 못 한다.

create policy "본인 의뢰의 배치 조회" on batches
  for select using (owns_request(request_id));
create policy "제조자는 전체 배치 조회" on batches
  for select using (is_manufacturer());
create policy "제조자는 배치 관리" on batches
  for all using (is_manufacturer()) with check (is_manufacturer());

create policy "본인 배치의 공정 조회" on process_steps
  for select using (owns_batch(batch_id));
create policy "제조자는 전체 공정 조회" on process_steps
  for select using (is_manufacturer());
create policy "제조자는 공정 기록" on process_steps
  for all using (is_manufacturer()) with check (is_manufacturer());

-- ─── 측정값 ────────────────────────────────────────────────────
-- 의뢰자도 출처 배지를 봐야 하므로 조회는 열되(투명성 톤), 기록은 제조자만.

create policy "본인 건의 측정값 조회" on measurements
  for select using (
    (process_step_id is not null and owns_process_step(process_step_id))
    or (result_id is not null and exists (
          select 1 from results rs where rs.id = result_id and owns_batch(rs.batch_id)))
  );
create policy "제조자는 전체 측정값 조회" on measurements
  for select using (is_manufacturer());
create policy "제조자는 측정값 기록" on measurements
  for all using (is_manufacturer()) with check (is_manufacturer());

-- ─── 편차 ──────────────────────────────────────────────────────
-- 의뢰자는 열람만. 등록·원인·조치는 제조자.

create policy "본인 배치의 편차 조회" on deviations
  for select using (owns_batch(batch_id));
create policy "제조자는 전체 편차 조회" on deviations
  for select using (is_manufacturer());
create policy "제조자는 편차 관리" on deviations
  for all using (is_manufacturer()) with check (is_manufacturer());

-- ─── 요약 ──────────────────────────────────────────────────────

create policy "본인 배치의 요약 조회" on batch_summaries
  for select using (owns_batch(batch_id));
create policy "제조자는 전체 요약 조회" on batch_summaries
  for select using (is_manufacturer());
create policy "제조자는 요약 작성" on batch_summaries
  for all using (is_manufacturer()) with check (is_manufacturer());

-- ─── 결과 ──────────────────────────────────────────────────────
-- 리뷰 체인이 갈리는 지점. 제조자는 결과 입력과 1차 검토(서명),
-- 의뢰자는 결과 리뷰(서명)만 한다.

create policy "본인 배치의 결과 조회" on results
  for select using (owns_batch(batch_id));
create policy "제조자는 전체 결과 조회" on results
  for select using (is_manufacturer());
create policy "제조자는 결과 입력·1차 검토" on results
  for all using (is_manufacturer()) with check (is_manufacturer());

-- 의뢰자는 본인 배치의 결과에 리뷰만 남긴다.
-- 제조자 서명 전에는 리뷰할 수 없다 — 워크플로우 순서를 DB가 강제한다.
create policy "의뢰자 결과 리뷰" on results
  for update using (owns_batch(batch_id) and manufacturer_signed_at is not null)
  with check (owns_batch(batch_id) and client_signed_by = auth.uid());

-- ─── 코멘트 ────────────────────────────────────────────────────

create policy "본인 의뢰의 코멘트 조회" on comments
  for select using (owns_request(request_id));
create policy "제조자는 전체 코멘트 조회" on comments
  for select using (is_manufacturer());
create policy "코멘트 작성" on comments
  for insert with check (
    author_id = auth.uid() and (is_manufacturer() or owns_request(request_id))
  );

-- ─── Realtime ──────────────────────────────────────────────────
-- 상태 변경이 상대 앱에 즉시 반영되어야 한다(리뷰 체인 시연의 핵심).
-- 구독도 위 정책을 그대로 통과한다.

alter publication supabase_realtime add table requests;
alter publication supabase_realtime add table batches;
alter publication supabase_realtime add table process_steps;
alter publication supabase_realtime add table deviations;
alter publication supabase_realtime add table results;
alter publication supabase_realtime add table comments;
