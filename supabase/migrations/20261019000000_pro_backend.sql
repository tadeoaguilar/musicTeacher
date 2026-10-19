-- Bassically Pro backend (docs/MONETIZATION.md, Phase 2): profiles, admins, entitlements,
-- feature flags, Pro content and an audit log. Row level security is on for every table:
-- clients (anon or signed-in) only see what the policies allow; entitlements are written
-- only by Edge Functions with the service role.

-- Helpers ---------------------------------------------------------------------------------

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Profiles: one row per account, created on sign-up -----------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke insert, update, delete on public.profiles from anon, authenticated;

create policy "Users read their own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admins: added by hand in SQL (insert into public.admins values ('<user id>')) ---------

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke insert, update, delete on public.admins from anon, authenticated;

/** True when the signed-in user is an admin. Security definer so policies can call it. */
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()))
$$;

create policy "Admins read admins" on public.admins
  for select to authenticated using ((select public.is_admin()));

-- Entitlements: a mirror of RevenueCat, kept by the revenuecat-webhook function ----------

create table public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  pro boolean not null default false,
  -- null: never expires (lifetime). Past: lapsed.
  expires_at timestamptz,
  -- RevenueCat's store (play_store, stripe, rc_billing, promotional) and product.
  store text,
  product_id text,
  updated_at timestamptz not null default now()
);
alter table public.entitlements enable row level security;
revoke insert, update, delete on public.entitlements from anon, authenticated;

create trigger entitlements_updated_at before update on public.entitlements
  for each row execute function public.set_updated_at();

create policy "Users read their own entitlement; admins read all" on public.entitlements
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

/** True when the signed-in user has an active Pro entitlement (same rule as isPro in src/access). */
create function public.has_pro() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.entitlements e
    where e.user_id = (select auth.uid()) and e.pro and (e.expires_at is null or e.expires_at > now())
  )
$$;

-- Feature flags: the remote switches of src/access (FeatureFlag) -------------------------

create table public.feature_flags (
  feature_id text primary key check (feature_id ~ '^[a-z][a-zA-Z]*(\.[a-z][a-zA-Z]*)*$'),
  enabled boolean,
  free boolean,
  rollout integer check (rollout between 0 and 100),
  min_version integer check (min_version >= 0),
  updated_at timestamptz not null default now()
);
alter table public.feature_flags enable row level security;

create trigger feature_flags_updated_at before update on public.feature_flags
  for each row execute function public.set_updated_at();

create policy "Everyone reads flags" on public.feature_flags
  for select to anon, authenticated using (true);
create policy "Admins write flags" on public.feature_flags
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Pro content: premium scales, rhythm exercises… served only to Pro users ---------------

create table public.pro_content (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]*$'),
  -- The src/access feature it belongs to, e.g. scales.more.
  feature_id text not null,
  kind text not null check (kind in ('scale', 'rhythm')),
  data jsonb not null,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.pro_content enable row level security;

create trigger pro_content_updated_at before update on public.pro_content
  for each row execute function public.set_updated_at();

/** True when a flag currently makes this feature free for everyone. */
create function public.is_free_feature(feature text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.feature_flags f
    where f.feature_id = feature and f.free and coalesce(f.enabled, true)
  )
$$;

create policy "Pro users read published content; everyone when the feature is free" on public.pro_content
  for select to anon, authenticated
  using (published and ((select public.has_pro()) or public.is_free_feature(feature_id)));
create policy "Admins read and write all content" on public.pro_content
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Audit log: every change to flags, content and admins, plus Edge Function actions ------

create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  -- The signed-in user who did it; null for the service role (webhooks).
  actor uuid,
  action text not null,
  target text,
  details jsonb
);
alter table public.audit_log enable row level security;
revoke insert, update, delete on public.audit_log from anon, authenticated;

create policy "Admins read the audit log" on public.audit_log
  for select to authenticated using ((select public.is_admin()));

create function public.audit_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  row jsonb := to_jsonb(coalesce(new, old));
begin
  insert into public.audit_log (actor, action, target, details)
  values (
    auth.uid(),
    lower(tg_op) || ' ' || tg_table_name,
    case tg_table_name
      when 'feature_flags' then row ->> 'feature_id'
      when 'pro_content' then row ->> 'id'
      else row ->> 'user_id'
    end,
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger feature_flags_audit after insert or update or delete on public.feature_flags
  for each row execute function public.audit_change();
create trigger pro_content_audit after insert or update or delete on public.pro_content
  for each row execute function public.audit_change();
create trigger admins_audit after insert or update or delete on public.admins
  for each row execute function public.audit_change();

-- Internal functions aren't part of the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.audit_change() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
