-- Row level security for the Pro backend: who can read and write what.
-- Run with `npx supabase test db` (needs the local database: `npx supabase db start`).
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- Four accounts: free, pro, expired pro, admin.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000f', 'free@example.com'),
  ('00000000-0000-0000-0000-00000000000a', 'pro@example.com'),
  ('00000000-0000-0000-0000-00000000000e', 'expired@example.com'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@example.com');
insert into public.entitlements (user_id, pro, expires_at, store) values
  ('00000000-0000-0000-0000-00000000000a', true, now() + interval '30 days', 'play_store'),
  ('00000000-0000-0000-0000-00000000000e', true, now() - interval '1 day', 'stripe');
insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000ad');
insert into public.pro_content (id, feature_id, kind, data, published) values
  ('harmonic-minor', 'scales.more', 'scale', '{"semitones":[0,2,3,5,7,8,11]}', true),
  ('bebop-draft', 'scales.more', 'scale', '{}', false),
  ('funk-1', 'rhythm.programs', 'rhythm', '{}', true);
insert into public.feature_flags (feature_id, enabled) values ('scales.more', true);

create function pg_temp.sign_in(uid text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true)
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role":"anon"}', true)
$$;

select is((select count(*) from public.profiles), 4::bigint, 'sign-up creates a profile');

-- Free user
select pg_temp.sign_in('00000000-0000-0000-0000-00000000000f');
select is((select count(*) from public.pro_content), 0::bigint, 'a free user reads no Pro content');
select is((select count(*) from public.entitlements), 0::bigint, 'a free user reads no entitlements');
select is((select count(*) from public.profiles), 1::bigint, 'a user reads only their own profile');
select is((select count(*) from public.feature_flags), 1::bigint, 'a signed-in user reads the flags');
select ok(not public.has_pro(), 'has_pro is false for a free user');
select throws_ok(
  $$ insert into public.entitlements (user_id, pro) values ('00000000-0000-0000-0000-00000000000f', true) $$,
  '42501', null, 'a user can''t grant themselves Pro');
select throws_ok(
  $$ insert into public.feature_flags (feature_id, free) values ('rhythm.programs', true) $$,
  '42501', null, 'a non-admin can''t write flags');
select is((select count(*) from public.audit_log), 0::bigint, 'a non-admin reads no audit log');
select is((select count(*) from public.admins), 0::bigint, 'a non-admin reads no admins');
select throws_ok(
  $$ insert into public.admins (user_id) values ('00000000-0000-0000-0000-00000000000f') $$,
  '42501', null, 'a user can''t make themselves admin');

-- Pro user
select pg_temp.sign_in('00000000-0000-0000-0000-00000000000a');
select ok(public.has_pro(), 'has_pro is true for an active Pro user');
select results_eq(
  'select id from public.pro_content order by id',
  array['funk-1', 'harmonic-minor'],
  'a Pro user reads published content, not drafts');
select is((select count(*) from public.entitlements), 1::bigint, 'a Pro user reads only their own entitlement');
select throws_ok(
  $$ update public.entitlements set expires_at = null $$,
  '42501', null, 'a Pro user can''t change their entitlement');

-- Expired Pro user
select pg_temp.sign_in('00000000-0000-0000-0000-00000000000e');
select ok(not public.has_pro(), 'has_pro is false once the entitlement expires');
select is((select count(*) from public.pro_content), 0::bigint, 'an expired user reads no Pro content');

-- Anonymous visitor
select pg_temp.sign_out();
select is((select count(*) from public.feature_flags), 1::bigint, 'anonymous visitors read the flags');
select is((select count(*) from public.pro_content), 0::bigint, 'anonymous visitors read no Pro content');

-- Admin
select pg_temp.sign_in('00000000-0000-0000-0000-0000000000ad');
select is((select count(*) from public.pro_content), 3::bigint, 'an admin reads all content, drafts included');
select is((select count(*) from public.entitlements), 2::bigint, 'an admin reads all entitlements');
insert into public.feature_flags (feature_id, enabled, free) values ('rhythm.programs', true, true);
select is(
  (select actor::text || ' ' || action || ' ' || target from public.audit_log where target = 'rhythm.programs'),
  '00000000-0000-0000-0000-0000000000ad insert feature_flags rhythm.programs',
  'admin changes are audited with who did them');

-- A free flag opens that feature's content to everyone.
select pg_temp.sign_in('00000000-0000-0000-0000-00000000000f');
select results_eq(
  'select id from public.pro_content', array['funk-1'],
  'a free flag opens that feature''s content to free users');
select pg_temp.sign_out();
select results_eq(
  'select id from public.pro_content', array['funk-1'],
  'and to anonymous visitors');

select * from finish();
rollback;
