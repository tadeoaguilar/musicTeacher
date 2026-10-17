import { create } from 'zustand'
import {
  NO_ENTITLEMENT,
  PRO_FEATURE_IDS,
  accessTo,
  parseFlags,
  rolloutBucket,
  type Access,
  type Entitlement,
  type FeatureId,
  type Flags,
} from '../../access/access'

/** Local flag overrides, as JSON (e.g. `{"scales.more":{"enabled":true}}`): set from dev tools to preview Pro UI. */
export const FLAGS_KEY = 'access.flags'
const INSTALL_KEY = 'access.install'

function readFlags(): Flags {
  try {
    const raw = localStorage.getItem(FLAGS_KEY)
    return raw ? parseFlags(JSON.parse(raw)) : {}
  } catch {
    return {}
  }
}

/** A random id for this browser, only used to pick a rollout bucket; it never leaves the device. */
function installId(): string {
  try {
    let id = localStorage.getItem(INSTALL_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(INSTALL_KEY, id)
    }
    return id
  } catch {
    return ''
  }
}

type AccessState = {
  entitlement: Entitlement
  flags: Flags
  bucket: number
  paywallOpen: boolean
  openPaywall: () => void
  closePaywall: () => void
}

/**
 * Who can use what. Until billing and remote flags exist (docs/MONETIZATION.md), everyone is
 * free and the flags come from local overrides only.
 */
export const useAccessStore = create<AccessState>((set) => ({
  entitlement: NO_ENTITLEMENT,
  flags: readFlags(),
  bucket: rolloutBucket(installId()),
  paywallOpen: false,
  openPaywall: () => set({ paywallOpen: true }),
  closePaywall: () => set({ paywallOpen: false }),
}))

export function useAccess(id: FeatureId): Access {
  return useAccessStore(({ entitlement, flags, bucket }) =>
    accessTo(id, { entitlement, flags, bucket, now: Date.now() }),
  )
}

/** The Pro features that aren't hidden: what the paywall lists. */
export function visibleProFeatures({ entitlement, flags, bucket }: AccessState): FeatureId[] {
  const now = Date.now()
  return PRO_FEATURE_IDS.filter((id) => accessTo(id, { entitlement, flags, bucket, now }) !== 'hidden')
}
