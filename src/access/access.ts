// What's free, what's Pro, and whether a feature is open, locked or hidden for someone.
// Pure: the apps supply the entitlement (from billing), the flags (from the server, or a local
// override) and a rollout bucket. Ported to Kotlin (android/core access/Access.kt).

export const TIERS = ['free', 'pro'] as const
export type Tier = (typeof TIERS)[number]

type FeatureDef = {
  tier: Tier
  /** Off unless a flag turns it on: for features that aren't released yet. */
  hidden?: boolean
}

/**
 * Every feature that can be gated. What exists today is free and stays free; the Pro
 * entries are planned (docs/MONETIZATION.md) and stay hidden until their flag is on.
 */
const FEATURES = {
  scales: { tier: 'free' },
  arpeggios: { tier: 'free' },
  metronome: { tier: 'free' },
  tuner: { tier: 'free' },
  'ear.findNote': { tier: 'free' },
  'ear.intervals': { tier: 'free' },
  'scales.more': { tier: 'pro', hidden: true },
  'rhythm.programs': { tier: 'pro', hidden: true },
} as const satisfies Record<string, FeatureDef>

export type FeatureId = keyof typeof FEATURES
export const FEATURE_IDS = Object.keys(FEATURES) as FeatureId[]

export function isFeatureId(value: unknown): value is FeatureId {
  return typeof value === 'string' && Object.hasOwn(FEATURES, value)
}

export function tierOf(id: FeatureId): Tier {
  return FEATURES[id].tier
}

/** Pro features, in catalog order: what the paywall lists. */
export const PRO_FEATURE_IDS = FEATURE_IDS.filter((id) => tierOf(id) === 'pro')

/** What billing says about a user. `expiresAt` in ms since the epoch; null never expires. */
export type Entitlement = { pro: boolean; expiresAt: number | null }

export const NO_ENTITLEMENT: Entitlement = { pro: false, expiresAt: null }

export function isPro(entitlement: Entitlement, now: number): boolean {
  return entitlement.pro && (entitlement.expiresAt === null || now < entitlement.expiresAt)
}

/** A remote switch for one feature. Missing fields keep the catalog's behavior. */
export type FeatureFlag = {
  /** false hides the feature; true shows a feature the catalog hides. */
  enabled?: boolean
  /** Opens a Pro feature to everyone, e.g. for a promotion. */
  free?: boolean
  /** Share of users (0–100, by rollout bucket) who see it. */
  rollout?: number
  /** Lowest Android versionCode that supports it. */
  minVersion?: number
}

export type Flags = Partial<Record<FeatureId, FeatureFlag>>

/** Keeps the valid flags from untrusted JSON (server rows, local overrides); drops the rest. */
export function parseFlags(value: unknown): Flags {
  const flags: Flags = {}
  if (!isRecord(value)) return flags
  for (const [id, raw] of Object.entries(value)) {
    if (!isFeatureId(id) || !isRecord(raw)) continue
    const flag: FeatureFlag = {}
    if (typeof raw.enabled === 'boolean') flag.enabled = raw.enabled
    if (typeof raw.free === 'boolean') flag.free = raw.free
    if (typeof raw.rollout === 'number' && Number.isFinite(raw.rollout))
      flag.rollout = Math.min(100, Math.max(0, Math.round(raw.rollout)))
    if (typeof raw.minVersion === 'number' && Number.isInteger(raw.minVersion))
      flag.minVersion = raw.minVersion
    flags[id] = flag
  }
  return flags
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A stable 0–99 bucket for gradual rollouts (FNV-1a over UTF-16 code units). */
export function rolloutBucket(key: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash % 100
}

export type Access = 'open' | 'locked' | 'hidden'

export type AccessContext = {
  entitlement: Entitlement
  flags: Flags
  /** From `rolloutBucket`. */
  bucket: number
  now: number
  /** Android versionCode; undefined on the web, which is always the latest build. */
  version?: number
}

/**
 * Open (usable), locked (shown with a Pro badge, opens the paywall) or hidden. Flags decide
 * visibility first, then the tier and entitlement decide whether it's usable.
 */
export function accessTo(id: FeatureId, ctx: AccessContext): Access {
  const def: FeatureDef = FEATURES[id]
  const flag = ctx.flags[id] ?? {}
  const enabled = flag.enabled ?? !def.hidden
  if (!enabled) return 'hidden'
  if (flag.rollout !== undefined && ctx.bucket >= flag.rollout) return 'hidden'
  if (flag.minVersion !== undefined && ctx.version !== undefined && ctx.version < flag.minVersion)
    return 'hidden'
  if (def.tier === 'free' || flag.free) return 'open'
  return isPro(ctx.entitlement, ctx.now) ? 'open' : 'locked'
}
