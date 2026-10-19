# Bassically backend (Supabase)

The server side of Bassically Pro ([`docs/MONETIZATION.md`](../docs/MONETIZATION.md), Phase 2): accounts, the entitlement mirror, feature flags, Pro content and an audit log, all protected by row level security, plus three Edge Functions. The free app doesn't use any of it.

| Project                                    | Value                                            |
| ------------------------------------------ | ------------------------------------------------ |
| URL                                        | `https://dobthafewrdpeddpwgzu.supabase.co`       |
| Project ref                                | `dobthafewrdpeddpwgzu`                           |
| Publishable key (public, goes in the apps) | `sb_publishable_V26Q4MKJuIyjjqERgVgavw_4xPOz2O5` |

The **secret / service role key**, the database password, and the RevenueCat secrets never go in git or in the apps. They live in the Supabase dashboard and in Edge Function secrets.

## What's here

- `migrations/`: the schema. Every table has row level security:

  | Table           | Who reads                                                                      | Who writes                                           |
  | --------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------- |
  | `profiles`      | the user (own row)                                                             | created on sign-up by a trigger                      |
  | `admins`        | admins                                                                         | by hand in SQL                                       |
  | `entitlements`  | the user (own row), admins                                                     | Edge Functions only (service role)                   |
  | `feature_flags` | everyone                                                                       | admins                                               |
  | `pro_content`   | Pro users (published), everyone if a flag makes the feature free, admins (all) | admins                                               |
  | `audit_log`     | admins                                                                         | triggers (flags, content, admins) and Edge Functions |

  `has_pro()` uses the same rule as `isPro` in `src/access`: Pro, and no expiry or an expiry in the future.

- `functions/`:
  - `revenuecat-webhook`: RevenueCat calls it on every billing event. It checks the `Authorization` header, re-reads the subscriber from RevenueCat, and updates `entitlements`.
  - `delete-account`: the signed-in user deletes their account, including their RevenueCat customer. Google Play requires this.
  - `admin-grant`: admins give or take back free Pro through RevenueCat promotional entitlements.
  - `_shared/revenuecat.ts`: their logic, unit tested with Vitest (`npm test`).
- `tests/database/rls.test.sql`: pgTAP tests of the policies. CI runs them.

## Local development

Needs Docker running.

```sh
npx supabase db start      # Postgres with the migrations applied
npx supabase test db       # row level security tests
npx supabase db reset      # re-apply migrations from scratch

# The whole stack, to try the Edge Functions:
npx supabase start -x studio,imgproxy,logflare,vector,supavisor,realtime,storage-api,mailpit,postgres-meta
npx supabase functions serve --env-file <file with REVENUECAT_WEBHOOK_AUTH=…>
npx supabase stop
```

## Deploying to the real project (once, then after each migration or function change)

```sh
npx supabase login                                   # opens the browser
npx supabase link --project-ref dobthafewrdpeddpwgzu # asks for the database password
npx supabase db push                                 # applies new migrations
npx supabase functions deploy                        # all three functions
```

Then add yourself as an admin. Sign in once through the app, so your account exists, then run this in the dashboard's SQL editor:

```sql
insert into public.admins (user_id) select id from auth.users where email = '<your email>';
```

### Secrets, when RevenueCat is set up (Phase 4)

```sh
npx supabase secrets set REVENUECAT_SECRET_KEY=sk_…              # RevenueCat → API keys → secret key
npx supabase secrets set REVENUECAT_WEBHOOK_AUTH='Bearer <long random string>'
```

In RevenueCat → Integrations → Webhooks:

- URL: `https://dobthafewrdpeddpwgzu.supabase.co/functions/v1/revenuecat-webhook`
- Authorization header: the same `Bearer …` value.
