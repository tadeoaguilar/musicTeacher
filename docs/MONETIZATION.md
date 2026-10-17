# Bassically Pro: plan for free + paid features

> **Status (2026-10-17):** plan agreed; Phase 0 (this document). Next: the user's setup (Play payments profile, Stripe, RevenueCat, Supabase, prices, first Pro pack) and Phase 1, feature management. Read this before adding accounts, billing or paid content.

## Context

Bassically is a React web app plus a native Android app (Kotlin, Compose, Oboe) with the same five sections: Scales, Arpeggios, Metronome, Tuner and Ear Training. Today:

- **Everything is free.**
- **There's no backend.** The web is static on Vercel; the Android app has no network code and no `INTERNET` permission.
- **There are no accounts.** Settings live in the URL (web) or SharedPreferences (Android), and the Play Data safety form says "no data collected".

The user wants to:

- **Keep what exists free for everyone.**
- **Charge for new features:** more scales, rhythm exercises and more.

**Decisions (user, 2026-10-17):**

- **Platforms:** Android and web, with one account. Buy once and it's unlocked on both.
- **Pricing:** a "Bassically Pro" subscription, monthly and yearly, plus a lifetime one-time unlock.
- **Backend:** managed services. Supabase for login, database and admin data; RevenueCat for billing and entitlements.
- **Timing:** the Android app launches free now (the Play release carries on as planned); Pro ships later as an update.

**Outcome:**

- Optional accounts.
- Billing on Google Play and on the web.
- Feature management: what's free and what's Pro, plus remote on/off switches.
- Content protected on the server.
- An admin portal.

All of it built in phases on both platforms, like the Android plan.

## Architecture

```
                 ┌──────────── RevenueCat (entitlement "pro") ───────────┐
 Android app ──Play Billing──►│ products: pro_monthly, pro_yearly, pro_lifetime│◄──Web Billing (Stripe)── Web app
     │                         └───────────────┬─────────────────────────────┘          │
     │                                 webhook  ▼                                          │
     └──── Supabase Auth (Google / email) ──► Supabase: Postgres + RLS + Edge Functions ◄──┘
                                               ▲
                                   Admin portal (separate small web app, admins only)
```

- **Identity:**
  - Supabase Auth, with Google sign-in on both platforms (Credential Manager on Android) and an email magic link on the web.
  - The Supabase user id is the RevenueCat `appUserID`, so a purchase follows the account across platforms.
- **Billing:** RevenueCat wraps Google Play Billing (required by Google inside the Android app) and RevenueCat Web Billing (Stripe) on the website.
  - One entitlement, `pro`, granted by any of the three products.
  - RevenueCat handles receipts, renewals, grace periods, trials, refunds and the revenue dashboard.
- **Entitlement mirror:**
  - A RevenueCat webhook goes to a Supabase Edge Function, which keeps `entitlements(user_id, pro, expires_at, source)` up to date.
  - The database is what the server trusts. The SDKs give the apps a fast local answer.
- **Feature management:**
  - A feature catalog in code: each feature id with its tier (`free` or `pro`) and the content it unlocks.
  - Remote flags in Supabase (`feature_flags`: enabled, rollout %, minimum app version) can turn a feature on or off, or make a Pro feature temporarily free, without a release.
  - The decision is one pure function, `canUse(feature, entitlement, flags)`, ported to Kotlin with parity fixtures (same pattern as `theory/`).
- **Security of paid content:**
  - Anything shipped in the web bundle can be unlocked by anyone with dev tools. So **premium content is data served by Supabase** (scale formulas, rhythm exercises, lessons, as JSON in tables or Storage), readable only through Row Level Security when `entitlements.pro` is active.
  - The free content stays in the code as today.
  - The music logic (`resolveNoteSet`, `barPlan`…) stays in the client and works on the downloaded data.
  - Android caches the downloaded Pro content and the entitlement for offline practice, with a grace period of a few days.
- **Offline and free use:** no account is needed for free features. The apps work offline exactly as today, and nothing calls the network until the user opens a Pro feature or signs in.

## What changes in the existing code

**Web (`src/`):**

- New `src/access/` (pure): the feature catalog, `canUse`, entitlement and flag types, with unit tests and fixtures for Kotlin.
- New `src/account/`: Supabase client, session store (Zustand), sign-in and sign-out, and account deletion.
- New `src/billing/`: RevenueCat `purchases-js`, lazy-loaded like Tone.js so the free app's bundle doesn't grow.
- New `src/content/`: loads premium content, caches it, and merges it with the built-in catalogs. `SCALE_IDS` (`src/theory/scales.ts`) and the patterns in `src/rhythm/patterns.ts` become "built-in + downloaded".
- **UI:**
  - an account button in `src/app/Layout.tsx`;
  - `Paywall` and `ProBadge` components;
  - locked options shown with a badge in the existing fields (e.g. `KeyField`/`NeckFields` dropdowns), opening the paywall.
- **New routes in `src/app/router.tsx`:** `/:lang/pro` (pricing), `/:lang/account`, `/:lang/terms`. Strings go in `en.json` and `es.json`.
- **URL settings:** a shared link to a Pro scale, opened by a free user, shows the paywall and falls back to the defaults. Param names stay the same.
- **Hosting:** Vercel's Hobby plan doesn't allow commercial use. Either move to Vercel Pro (about $20/mo) or to Cloudflare Pages, which `public/_redirects` already supports.

**Android (`android/`):**

- Add the `INTERNET` permission and the dependencies: `supabase-kt`, RevenueCat `purchases`, Credential Manager.
- Account, Pro and Paywall screens, reached from the top bar.
- The `canUse` port goes in `:core`, with fixture tests.
- Premium content download and cache.
- A billing client following Play's rules: the app uses Play Billing only, with no links to the web checkout. Purchases made on the web still unlock the app, which Play allows.
- **Release changes:**
  - bump `versionCode`;
  - Data safety form: now collects email, user id and purchase history, for account management;
  - the store listing says "In-app purchases".

**Repo:**

- New `supabase/` folder: SQL migrations (tables, RLS policies), Edge Functions and seed data, with RLS tests in CI.
- New `admin/` app (Vite + React), deployed separately so admin code is never in the public bundle.

## Admin portal (`admin/`)

Admins are listed in an `admins` table and checked by RLS and in the Edge Functions. The browser never holds the service-role key.

| Area          | What                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Users         | Search by email; account details, sign-up date, entitlement and source (Play, Web, lifetime, promo)                          |
| Grant access  | Free Pro for testers, students and friends (RevenueCat promotional entitlement through an Edge Function), with an expiry     |
| Feature flags | Turn features on and off, set the rollout percentage, set the minimum app version                                            |
| Content       | Upload, edit and publish premium content (scales, rhythm exercises), with a draft/published state                            |
| Revenue       | Key numbers (active subscribers, MRR) plus links to the RevenueCat, Play Console and Stripe dashboards; refunds happen there |
| Audit log     | Every admin action recorded (who, what, when)                                                                                |

## Security management

- RLS on every table:
  - users read only their own rows;
  - premium content needs an active entitlement;
  - admin tables are for admins only.
- Secrets (Supabase service role, RevenueCat secret, webhook token) live only in Edge Function settings, never in git or the clients. The keys shipped in the clients (Supabase anon key, RevenueCat public keys) are designed to be public.
- The webhook checks the RevenueCat authorization header. Entitlements are only ever written server-side.
- **Account deletion, required by Google Play:** in the app, plus a web page for it. It removes the profile and data; RevenueCat customer deletion goes through its API.
- Optional later: Play Integrity / App Check, and rate limits on the Edge Functions.
- The legal pages are updated and added:
  - privacy policy: accounts, email and purchases;
  - Terms of Service and the subscription terms;
  - refund policy.

## Phases (each a `feature/…` branch → PR → CI → you test → merge)

0. **Plan in the repo and your setup** (in parallel). This document, linked from the roadmap and `CLAUDE.md`. Your part:
   - the Google Play payments profile (merchant account, bank, tax info);
   - a Stripe account;
   - RevenueCat and Supabase projects;
   - prices;
   - which features are Pro first.
1. **Feature management, no money yet:**
   - `src/access` and its Kotlin port;
   - the catalog with everything free;
   - Pro badge and paywall UI behind a local flag.
2. **Backend:** `supabase/`, with the schema, RLS, Edge Functions (RevenueCat webhook, grant, delete account) and CI tests.
3. **Accounts, web and Android:**
   - sign in and out;
   - account page;
   - account deletion.
4. **Billing:**
   - RevenueCat products and the `pro` entitlement;
   - paywall, restore purchases and an optional free trial on both platforms;
   - tested with Play license testers and Stripe test mode.
5. **First Pro content:**
   - server-delivered premium content with caching and offline grace;
   - one starter pack, e.g. extra scales (harmonic and melodic minor modes, blues, bebop) and a set of rhythm exercises.
6. **Admin portal:** `admin/` with users, grant access, flags, content and the audit log.
7. **Compliance and launch:**
   - privacy policy, terms, Data safety and listing updates;
   - hosting plan change;
   - release Pro as an Android update and on the web.

**Ideas for Pro features after launch** (each built on both platforms):

- more scales and modes, and diatonic arpeggios;
- rhythm programs: graded exercises with progress and the speed and gap trainers built in;
- Ear Training exercise 3 and harder levels;
- practice history synced across devices;
- the planned Grooves and Lessons sections.

## Costs (rough, small scale)

| Item        | Cost                                                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Google Play | 15% of subscriptions; 15% on the first $1M/year for one-time purchases (enrolment needed)                                             |
| Stripe      | About 2.9% + 30¢ per web payment. You collect and pay sales tax and VAT yourself; Stripe Tax helps, or use a merchant of record later |
| RevenueCat  | Free up to $2.5k monthly revenue, then 1%                                                                                             |
| Supabase    | Free tier to start; Pro $25/mo when needed                                                                                            |
| Hosting     | Vercel Pro about $20/mo, or Cloudflare Pages free                                                                                     |

## Verification

- **Unit tests:** `src/access` (Vitest) and its Kotlin port (`./gradlew :core:test`, with parity fixtures).
- **RLS tests:** run against a local Supabase (`supabase start`) in CI. Checked:
  - a free user can't read Pro content;
  - a Pro user can;
  - only admins reach admin data.
- **e2e:** Playwright tests with a fake session and entitlement:
  - the paywall shows for a free user;
  - Pro content loads for a Pro user;
  - a shared Pro link falls back for a free user.
- **Purchases on the phone:** a Play license tester buys monthly, cancels, restores, and gets a refund; the entitlement updates in the app, in Supabase and in the admin portal. The same in Stripe test mode on the web, then signing in on Android unlocks Pro there too.
- **Offline:** Pro content stays usable in airplane mode during the grace period.
- **Admin portal:** a non-admin account is refused. Granting promo access unlocks Pro on the phone within a minute.

## Open questions (not blocking Phase 0–1)

- Your country and whether you'll sell as an individual or a business. This affects tax, payouts and the Play merchant profile.
- Prices: monthly, yearly, lifetime, and whether to offer a free trial (e.g. 7 days).
- The first Pro pack: what exactly is in it.
- Discounts for students or teachers (promo codes in Play and Stripe coupons).
