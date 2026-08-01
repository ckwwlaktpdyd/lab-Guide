-- Lab Guide — 시드 데이터
-- 원본: docs/seed-data.md  ·  기준 시각: 2026-07-20 (월) 14:35
--
-- 실행 순서: 0001_schema.sql → 0002_rls.sql → 이 파일
-- 재실행 가능하도록 앞에서 기존 데이터를 지운다.

begin;

-- ─── 초기화 ────────────────────────────────────────────────────
truncate comments, results, batch_summaries, deviations, measurements,
         process_steps, batches, requests, recipe_steps, buffer_recipes,
         reagent_lots, instruments restart identity cascade;

delete from auth.users where email like '%@labguide.demo';

-- ─── 데모 계정 ─────────────────────────────────────────────────
-- RLS가 역할을 JWT의 app_metadata.role에서 읽는다(0002_rls.sql의 auth_role()).
-- profiles를 참조하면 정책이 자기 테이블을 다시 조회해 재귀하므로 이렇게 짰다.
-- 따라서 계정 생성 시 raw_app_meta_data에 role을 반드시 심어야 한다.
--
-- 비밀번호도 함께 심는다. spec은 매직링크지만, 포트폴리오 리뷰어가 메일함 없이
-- 바로 로그인해볼 수 있어야 한다. 매직링크만 쓸 거면 encrypted_password 줄을 지우면 된다.
--   데모 비밀번호: labguide2026

-- ⚠️ 토큰 계열 컬럼을 NULL로 두면 안 된다.
-- GoTrue가 이 값들을 Go의 string으로 읽는데 NULL은 스캔에 실패한다.
-- 그러면 로그인 시 500 "Database error querying schema"가 난다. 빈 문자열이어야 한다.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-000000000001',
   'authenticated', 'authenticated', 'client1@labguide.demo',
   crypt('labguide2026', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"],"role":"client"}', '{"name":"김의뢰"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-000000000002',
   'authenticated', 'authenticated', 'client2@labguide.demo',
   crypt('labguide2026', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"],"role":"client"}', '{"name":"이연구"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-000000000003',
   'authenticated', 'authenticated', 'client3@labguide.demo',
   crypt('labguide2026', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"],"role":"client"}', '{"name":"박실험"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-000000000001',
   'authenticated', 'authenticated', 'maker@labguide.demo',
   crypt('labguide2026', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"],"role":"manufacturer"}', '{"name":"최제조"}', now(), now(), '', '', '', '', '', '', '', '');

-- identities가 없으면 로그인이 되지 않는다.
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u where u.email like '%@labguide.demo';

insert into profiles (id, name, role, org) values
  ('11111111-1111-4111-8111-000000000001', '김의뢰', 'client',       'QC 2팀'),
  ('11111111-1111-4111-8111-000000000002', '이연구', 'client',       'R&D팀'),
  ('11111111-1111-4111-8111-000000000003', '박실험', 'client',       '분자생물 1팀'),
  ('22222222-2222-4222-8222-000000000001', '최제조', 'manufacturer', '제1실습실');

-- ─── 계측기 ────────────────────────────────────────────────────
insert into instruments (id, kind, provides) values
  ('pH-2000-A', 'pH 미터 (ATC 내장)', array['ph','temperature']),
  ('COND-500',  '전도도계',           array['conductivity']),
  ('BAL-204',   '전자저울 (±0.1 mg)', array['mass']);

-- ─── 시약 로트 ─────────────────────────────────────────────────
insert into reagent_lots (reagent, lot_number, expires_on, note) values
  ('NaCl',            'NACL-2607', '2027-08-31', null),
  ('NaCl',            'NACL-2506', '2026-07-18', 'DEV-03 시나리오용 — 의도적 만료'),
  ('KCl',             'KCL-2611',  '2026-11-30', null),
  ('Na2HPO4',         'NAHP-2703', '2027-03-30', null),
  ('KH2PO4',          'KHP-2701',  '2027-01-15', null),
  ('Tris base',       'TRIS-2707', '2027-07-15', null),
  ('빙초산',           'AA-2705',   '2027-05-30', null),
  ('Na2EDTA·2H2O',    'EDTA-2612', '2026-12-31', '분말'),
  ('HEPES',           'HEP-2704',  '2027-04-30', null),
  ('진한 HCl',         'HCL-2709',  '2027-09-30', '적정 시약 — 투입량은 결과로 기록'),
  ('5 M NaOH',        'NAOH-2702', '2027-02-28', '적정 시약 — 투입량은 결과로 기록');

-- ─── 레시피 ────────────────────────────────────────────────────
insert into buffer_recipes (name, target_params) values
  ('PBS 1X',      '{"ph":7.40,"ph_tolerance":0.05,"volume_ml":500,"conductivity_ms_cm":15.0}'),
  ('Tris-HCl 1M', '{"ph":8.00,"ph_min":7.95,"ph_max":8.05,"volume_ml":1000}'),
  ('TAE 50X',     '{"ph":8.30,"volume_ml":1000,"conductivity_min":11.0,"conductivity_max":12.5}'),
  ('HEPES 1M',    '{"ph":7.50,"ph_tolerance":0.05,"volume_ml":500}');

-- kind가 null이면 시약을 다루지 않는 단계.
-- titrated는 target_amount를 가질 수 없다(DB 제약이 막는다).
insert into recipe_steps (recipe_id, seq, name, kind, reagent, target_amount, target_unit, note)
select r.id, v.seq, v.name, v.kind::reagent_kind, v.reagent, v.amount, v.unit, v.note
from buffer_recipes r
join (values
  ('PBS 1X', 1, '시약 칭량',  'weighed', 'NaCl 4.00 / KCl 0.10 / Na2HPO4 0.72 / KH2PO4 0.12', null::numeric, 'g', '500 mL 기준'),
  ('PBS 1X', 2, '용해',       null,      null, null, null, null),
  ('PBS 1X', 3, 'pH 조정',    'titrated','1 M HCl / 1 M NaOH', null, 'mL', '인산염 조합만으로 7.4 부근. 벗어날 때만 미세 조정'),
  ('PBS 1X', 4, '여과',       null,      null, null, null, '멸균 여과'),
  ('PBS 1X', 5, 'QC 측정',    null,      null, null, null, null),

  ('Tris-HCl 1M', 1, '시약 칭량',        'weighed', 'Tris base', 121.14, 'g', null),
  ('Tris-HCl 1M', 2, '용해',             null,      null, null, null, null),
  ('Tris-HCl 1M', 3, '온도 평형(25 °C)', null,      null, null, null,
     'Tris는 -0.028 pH/°C. 온도 평형 전 pH 측정은 무의미하다'),
  ('Tris-HCl 1M', 4, 'pH 조정',          'titrated','진한 HCl', null, 'mL',
     'pH 8.00 도달까지 적정. 참고 40–45 mL — 검수 기준 아님'),
  ('Tris-HCl 1M', 5, 'QC 측정',          null,      null, null, null, null),

  ('TAE 50X', 1, '시약 칭량',  'weighed', 'Tris base 242.0 g / 빙초산 57.1 mL', null, null, null),
  ('TAE 50X', 2, '용해',       null,      null, null, null, null),
  ('TAE 50X', 3, 'EDTA 첨가',  'weighed', 'Na2EDTA·2H2O', 18.61, 'g',
     '분말은 pH 8 근처가 되기 전 잘 녹지 않는다. Tris를 먼저 녹인 뒤 넣는다'),
  ('TAE 50X', 4, 'pH 확인',    null,      null, null, null, '적정이 아니라 확인 단계'),
  ('TAE 50X', 5, '정용',       null,      null, null, null, null),
  ('TAE 50X', 6, 'QC 측정',    null,      null, null, null, null),

  ('HEPES 1M', 1, '시약 칭량', 'weighed', 'HEPES', 119.15, 'g', '500 mL 기준'),
  ('HEPES 1M', 2, '용해',      null,      null, null, null, null),
  ('HEPES 1M', 3, 'pH 조정',   'titrated','5 M NaOH', null, 'mL', 'pH 7.50 도달까지 적정. 참고 20–25 mL'),
  ('HEPES 1M', 4, '여과',      null,      null, null, null, null),
  ('HEPES 1M', 5, 'QC 측정',   null,      null, null, null, null)
) as v(recipe, seq, name, kind, reagent, amount, unit, note) on v.recipe = r.name;

-- ─── 의뢰 ──────────────────────────────────────────────────────
-- 배치는 반드시 의뢰에서 나온다(수락 = 배치 생성). 6월 이력 배치도 원 의뢰가 필요해
-- REQ-031~033을 함께 넣는다. docs/seed-data.md §6에서 "—"로 비워뒀던 부분이다.

insert into requests (code, requester_id, recipe_id, request_type, status,
                      volume_ml, desired_completion_at, created_at)
select v.code, p.id, r.id, 'new', v.status::request_status,
       v.volume, v.desired::timestamptz, v.created::timestamptz
from (values
  ('REQ-031', '이연구', 'PBS 1X',      'accepted',  500,  '2026-06-24 13:00+09', '2026-06-23 10:20+09'),
  ('REQ-032', '박실험', 'HEPES 1M',    'accepted',  500,  '2026-06-26 11:00+09', '2026-06-25 09:40+09'),
  ('REQ-033', '김의뢰', 'TAE 50X',     'accepted', 1000,  '2026-06-30 15:00+09', '2026-06-29 14:05+09'),
  ('REQ-039', '김의뢰', 'TAE 50X',     'accepted', 1000,  '2026-07-18 13:00+09', '2026-07-17 10:05+09'),
  ('REQ-041', '김의뢰', 'Tris-HCl 1M', 'accepted', 1000,  '2026-07-21 10:00+09', '2026-07-19 08:40+09'),
  ('REQ-042', '김의뢰', 'PBS 1X',      'accepted',  500,  '2026-07-21 16:00+09', '2026-07-20 09:12+09'),
  ('REQ-043', '박실험', 'TAE 50X',     'accepted', 1000,  '2026-07-21 09:00+09', '2026-07-20 10:30+09'),
  ('REQ-044', '이연구', 'Tris-HCl 1M', 'pending',   500,  '2026-07-22 09:00+09', '2026-07-19 16:05+09'),
  ('REQ-045', '박실험', 'PBS 1X',      'pending',  1000,  '2026-07-22 14:00+09', '2026-07-20 13:35+09')
) as v(code, requester, recipe, status, volume, desired, created)
join profiles p        on p.name = v.requester
join buffer_recipes r  on r.name = v.recipe;

-- 재제조 — 완료된 REQ-039에서 파생된다. 사유가 필수다.
insert into requests (code, requester_id, recipe_id, request_type, status, parent_request_id,
                      volume_ml, desired_completion_at, reason, created_at)
select 'REQ-046', p.id, r.id, 'remake', 'pending', parent.id,
       1000, '2026-07-23 10:00+09',
       '전기영동 진행 중 밴드 번짐 발생. 버퍼 전도도 이상 의심됩니다.',
       '2026-07-20 14:10+09'
from profiles p, buffer_recipes r, requests parent
where p.name = '김의뢰' and r.name = 'TAE 50X' and parent.code = 'REQ-039';

-- ─── 배치 ──────────────────────────────────────────────────────
insert into batches (lot_number, request_id, manufacturer_id, status, started_at, ended_at)
select v.lot, req.id, m.id, v.status::batch_status, v.started::timestamptz, v.ended::timestamptz
from (values
  ('LOT-2606-08', 'REQ-031', 'completed', '2026-06-24 09:10+09', '2026-06-24 11:40+09'),
  ('LOT-2606-09', 'REQ-032', 'completed', '2026-06-26 09:00+09', '2026-06-26 10:50+09'),
  ('LOT-2606-10', 'REQ-033', 'completed', '2026-06-30 10:00+09', '2026-06-30 13:20+09'),
  ('LOT-2607-01', 'REQ-039', 'completed', '2026-07-18 09:30+09', '2026-07-18 11:30+09'),
  ('LOT-2607-02', 'REQ-041', 'deviation', '2026-07-19 14:20+09', null),
  ('LOT-2607-03', 'REQ-042', 'running',   '2026-07-20 14:02+09', null),
  ('LOT-2607-04', 'REQ-043', 'preparing', null, null)
) as v(lot, req_code, status, started, ended)
join requests req on req.code = v.req_code
cross join lateral (select id from profiles where name = '최제조') m;

-- 공정 단계는 레시피에서 그대로 펼친다.
insert into process_steps (batch_id, recipe_step_id, seq, status, updated_by)
select b.id, rs.id, rs.seq, 'todo', null
from batches b
join requests req on req.id = b.request_id
join recipe_steps rs on rs.recipe_id = req.recipe_id;

-- 완료된 배치는 전 단계 done.
update process_steps ps set status = 'done',
       completed_at = b.started_at + (ps.seq * interval '22 minutes'),
       updated_by = (select id from profiles where name = '최제조')
from batches b
where b.id = ps.batch_id and b.status = 'completed';

-- LOT-2607-03 — 공정 3/5 진행중. 콘솔 시안의 주인공.
update process_steps ps set status = v.st::step_status, completed_at = v.done::timestamptz,
       updated_by = (select id from profiles where name = '최제조')
from (values (1,'done','2026-07-20 14:02+09'), (2,'done','2026-07-20 14:15+09'),
             (3,'running',null), (4,'todo',null), (5,'todo',null)) as v(seq, st, done)
where ps.seq = v.seq and ps.batch_id = (select id from batches where lot_number = 'LOT-2607-03');

-- LOT-2607-02 — 4단계 pH 조정에서 편차.
update process_steps ps set status = v.st::step_status, completed_at = v.done::timestamptz,
       updated_by = (select id from profiles where name = '최제조')
from (values (1,'done','2026-07-19 14:20+09'), (2,'done','2026-07-19 14:38+09'),
             (3,'done','2026-07-19 14:55+09'), (4,'deviation',null), (5,'todo',null)) as v(seq, st, done)
where ps.seq = v.seq and ps.batch_id = (select id from batches where lot_number = 'LOT-2607-02');

-- 칭량 단계에 사용 시약 로트를 붙인다. DEV-03은 만료 로트를 대체한 건이다.
update process_steps ps set reagent_lot_id = (select id from reagent_lots where lot_number = 'NACL-2607')
where ps.seq = 1 and ps.batch_id in (select id from batches where lot_number in ('LOT-2607-03','LOT-2606-08'));

-- ─── 측정값 ────────────────────────────────────────────────────
-- 자동 수집은 읽기 전용 + 출처 배지. pH에는 측정 온도가 함께 남는다.

insert into measurements (process_step_id, label, value, unit, source, instrument_id, captured_at, captured_temp_c)
select ps.id, v.label, v.val, v.unit, 'instrument', v.inst, v.at::timestamptz, v.temp
from (values
  ('LOT-2607-03', 3, 'pH',   7.41, '',    'pH-2000-A', '2026-07-20 14:31+09', 22.4),
  ('LOT-2607-03', 3, '온도', 22.4, '°C',  'pH-2000-A', '2026-07-20 14:31+09', null),
  ('LOT-2607-02', 4, 'pH',   8.12, '',    'pH-2000-A', '2026-07-19 15:10+09', 25.0)
) as v(lot, seq, label, val, unit, inst, at, temp)
join batches b on b.lot_number = v.lot
join process_steps ps on ps.batch_id = b.id and ps.seq = v.seq;

-- ─── 편차 ──────────────────────────────────────────────────────
insert into deviations (code, batch_id, process_step_id, description, cause, corrective_action,
                        status, created_by, created_at, resolved_at)
select v.code, b.id, ps.id, v.descr, v.cause, v.action, v.status::deviation_status,
       m.id, v.created::timestamptz, v.resolved::timestamptz
from (values
  ('DEV-01', 'LOT-2607-02', 4, '측정 pH 8.12 — 허용 7.95–8.05 상한 이탈',
   null, null, 'open', '2026-07-19 15:10+09', null),
  ('DEV-03', 'LOT-2606-10', 1, 'NaCl 로트 NACL-2506 유효기간 만료(2026-07-18) 확인',
   '시약 재고 회전 누락', '대체 로트 NACL-2607 사용. 규격 일치 확인 후 진행',
   'resolved', '2026-06-30 10:12+09', '2026-06-30 10:35+09'),
  ('DEV-04', 'LOT-2606-09', 2, '버퍼 동결로 용해 지연',
   '냉장 보관 온도 이탈', 'Heating Bath 37 °C 10분 가열 후 재시도',
   'resolved', '2026-06-26 09:22+09', '2026-06-26 09:45+09')
) as v(code, lot, seq, descr, cause, action, status, created, resolved)
join batches b on b.lot_number = v.lot
join process_steps ps on ps.batch_id = b.id and ps.seq = v.seq
cross join lateral (select id from profiles where name = '최제조') m;

-- ─── 배치 요약 · 결과 ──────────────────────────────────────────
insert into batch_summaries (batch_id, content, confirmed_by, confirmed_at)
select b.id, 'TAE 50X 1 L 제조 완료. 전 공정 6단계 편차 없이 진행. 멸균 여과 후 실온 보관.',
       m.id, '2026-07-18 11:35+09'
from batches b cross join lateral (select id from profiles where name = '최제조') m
where b.lot_number = 'LOT-2607-01';

-- LOT-2607-01 — 1차 검토와 결과 리뷰까지 끝났다. 그 뒤 실험에서 전도도 문제가 드러나
-- REQ-046 재제조로 이어진다. 편차 없이 완결된 배치라 Deviation을 달지 않는다.
insert into results (batch_id, manufacturer_signed_by, manufacturer_signed_at,
                     client_review_status, client_signed_by, client_signed_at)
select b.id, m.id, '2026-07-18 11:40+09', 'reviewed', c.id, '2026-07-18 14:05+09'
from batches b
cross join lateral (select id from profiles where name = '최제조') m
cross join lateral (select id from profiles where name = '김의뢰') c
where b.lot_number = 'LOT-2607-01';

insert into measurements (result_id, label, value, unit, source, instrument_id, captured_at, entered_by)
select rs.id, v.label, v.val, v.unit, v.src::measurement_source, v.inst, v.at::timestamptz,
       case when v.src = 'manual' then (select id from profiles where name = '최제조') end
from (values
  ('pH',     8.28, '',       'instrument', 'pH-2000-A', '2026-07-18 11:18+09'),
  ('전도도', 9.40, 'mS/cm',  'instrument', 'COND-500',  '2026-07-18 11:20+09'),
  ('부피',   1000, 'mL',     'manual',     null,        null)
) as v(label, val, unit, src, inst, at)
join batches b on b.lot_number = 'LOT-2607-01'
join results rs on rs.batch_id = b.id;

-- ─── 코멘트 ────────────────────────────────────────────────────
insert into comments (request_id, author_id, body, created_at)
select r.id, p.id, v.body, v.at::timestamptz
from (values
  ('REQ-042', '김의뢰', '지난번보다 pH 허용범위 좁게 부탁드립니다', '2026-07-20 09:14+09'),
  ('REQ-042', '최제조', '반영했습니다. ±0.05 이내로 관리했어요',    '2026-07-20 09:50+09')
) as v(code, author, body, at)
join requests r on r.code = v.code
join profiles p on p.name = v.author;

commit;
