// RevenueCat → Supabase: pure helpers shared by the Edge Functions (tested with Vitest in
// revenuecat.test.ts). RevenueCat is the source of truth for purchases; we keep a mirror
// row per user in public.entitlements, which the database policies trust.

/** The one entitlement every Pro product grants (docs/MONETIZATION.md). */
export const ENTITLEMENT = 'pro'

export const REVENUECAT_API = 'https://api.revenuecat.com/v1'

export type EntitlementRow = {
  user_id: string
  pro: boolean
  /** ISO time; null never expires (lifetime). */
  expires_at: string | null
  store: string | null
  product_id: string | null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Our users are Supabase ids; RevenueCat's anonymous ids ($RCAnonymousID:…) aren't. */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value)
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

const time = (value: unknown) =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null

/**
 * The mirror row for a GET /v1/subscribers/{id} response. A lapsed entitlement stays `pro`
 * with an expiry in the past (has_pro() checks the time); the later of the expiry and any
 * billing grace period counts.
 */
export function entitlementRow(userId: string, response: unknown): EntitlementRow {
  const subscriber = record(record(response).subscriber)
  const entitlement = record(record(subscriber.entitlements)[ENTITLEMENT])
  if (Object.keys(entitlement).length === 0)
    return { user_id: userId, pro: false, expires_at: null, store: null, product_id: null }

  const product = typeof entitlement.product_identifier === 'string' ? entitlement.product_identifier : null
  const expiries = [time(entitlement.expires_date), time(entitlement.grace_period_expires_date)]
  const lifetime = entitlement.expires_date === null || entitlement.expires_date === undefined
  const latest = expiries
    .filter((t): t is string => t !== null)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0]
  // An expiry we can't read must not turn into "never expires".
  if (!lifetime && !latest)
    return { user_id: userId, pro: false, expires_at: null, store: null, product_id: product }
  const expires = lifetime ? null : latest!

  let store: string | null = null
  if (product) {
    const subscription = record(record(subscriber.subscriptions)[product])
    const purchases = record(subscriber.non_subscriptions)[product]
    const last = Array.isArray(purchases) ? record(purchases[purchases.length - 1]) : {}
    const found = subscription.store ?? last.store
    store = typeof found === 'string' ? found : null
  }
  return { user_id: userId, pro: true, expires_at: expires, store, product_id: product }
}

/** Every one of our users a webhook event concerns (TRANSFER events name both sides). */
export function webhookUserIds(body: unknown): string[] {
  const event = record(record(body).event)
  const ids = [
    event.app_user_id,
    event.original_app_user_id,
    ...[event.aliases, event.transferred_from, event.transferred_to].flatMap((list) =>
      Array.isArray(list) ? list : [],
    ),
  ]
  return [...new Set(ids.filter(isUuid).map((id) => id.toLowerCase()))]
}

/** Compares secrets in time independent of where they differ. */
export function safeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < length; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}

/** Promotional durations RevenueCat's v1 API accepts. */
export const PROMO_DURATIONS = [
  'daily',
  'three_day',
  'weekly',
  'monthly',
  'two_month',
  'three_month',
  'six_month',
  'yearly',
  'lifetime',
] as const
export type PromoDuration = (typeof PROMO_DURATIONS)[number]

export type GrantRequest =
  { action: 'grant'; userId: string; duration: PromoDuration } | { action: 'revoke'; userId: string }

/** Validates an admin-grant request body; null when it's not valid. */
export function parseGrant(body: unknown): GrantRequest | null {
  const { action, userId, duration } = record(body)
  if (!isUuid(userId)) return null
  if (action === 'revoke') return { action, userId: userId.toLowerCase() }
  if (action === 'grant' && PROMO_DURATIONS.includes(duration as PromoDuration))
    return { action, userId: userId.toLowerCase(), duration: duration as PromoDuration }
  return null
}

type Deps = {
  fetch: typeof fetch
  secretKey: string
  upsert: (row: EntitlementRow) => Promise<void>
}

/** Reads the subscriber from RevenueCat and stores the mirror row. */
export async function syncEntitlement(userId: string, { fetch, secretKey, upsert }: Deps) {
  const response = await fetch(`${REVENUECAT_API}/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  })
  if (!response.ok) throw new Error(`RevenueCat subscriber ${userId}: HTTP ${response.status}`)
  const row = entitlementRow(userId, await response.json())
  await upsert(row)
  return row
}
