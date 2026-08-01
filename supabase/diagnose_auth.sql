-- 데모 계정 로그인이 500 "Database error querying schema"로 실패할 때 쓴다.
--
-- 원인: auth.users의 토큰 계열 컬럼이 NULL이면 GoTrue가 Go의 string으로 스캔하지 못해
--       사용자 조회 자체가 터진다. 이 컬럼들은 빈 문자열이어야 한다.
--
-- ① 진단 → ② 수리 순서로 각각 실행한다. seed.sql 전체를 다시 돌릴 필요 없다.

-- ─── ① 진단 ────────────────────────────────────────────────────
-- null_columns가 0이 아니면 그게 원인이다.

select
  email,
  (confirmation_token         is null)::int
  + (recovery_token           is null)::int
  + (email_change_token_new   is null)::int
  + (email_change             is null)::int
  + (email_change_token_current is null)::int
  + (phone_change             is null)::int
  + (phone_change_token       is null)::int
  + (reauthentication_token   is null)::int   as null_columns,
  (encrypted_password is not null)            as has_password,
  (email_confirmed_at is not null)            as confirmed,
  raw_app_meta_data ->> 'role'                as app_role,
  exists (select 1 from auth.identities i where i.user_id = u.id) as has_identity
from auth.users u
where email like '%@labguide.demo'
order by email;

-- 공개 데이터가 들어갔는지도 함께 본다. 0이면 seed.sql이 롤백된 것이다.
select
  (select count(*) from profiles)       as profiles,
  (select count(*) from buffer_recipes) as recipes,
  (select count(*) from requests)       as requests,
  (select count(*) from batches)        as batches,
  (select count(*) from deviations)     as deviations;


-- ─── ② 수리 ────────────────────────────────────────────────────
-- 위 진단에서 null_columns > 0 이면 이 블록을 실행한다.

update auth.users set
  confirmation_token          = coalesce(confirmation_token, ''),
  recovery_token              = coalesce(recovery_token, ''),
  email_change_token_new      = coalesce(email_change_token_new, ''),
  email_change                = coalesce(email_change, ''),
  email_change_token_current  = coalesce(email_change_token_current, ''),
  phone_change                = coalesce(phone_change, ''),
  phone_change_token          = coalesce(phone_change_token, ''),
  reauthentication_token      = coalesce(reauthentication_token, '')
where email like '%@labguide.demo';

-- identity가 없으면 로그인이 되지 않는다. 빠졌으면 여기서 채운다.
insert into auth.identities (id, user_id, provider_id, identity_data, provider,
                             last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.email like '%@labguide.demo'
  and not exists (select 1 from auth.identities i where i.user_id = u.id);

-- 확인 — null_columns가 전부 0이어야 한다.
select email,
       (confirmation_token is null or recovery_token is null
        or email_change_token_new is null or email_change is null
        or email_change_token_current is null or phone_change is null
        or phone_change_token is null or reauthentication_token is null) as still_broken
from auth.users where email like '%@labguide.demo' order by email;
