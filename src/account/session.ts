import type { Entitlement } from '../access/access'

/** Where supabase-js keeps the session in localStorage; fixed so `mightHaveSession` can find it. */
export const SESSION_KEY = 'account.session'

/**
 * Whether this browser may be signed in: a stored session, or a sign-in link's tokens in the URL.
 * Free visitors who never sign in don't load the Supabase client or contact the backend.
 */
export function mightHaveSession(storage: Pick<Storage, 'getItem'> | undefined, hash: string): boolean {
  if (/[#&]access_token=/.test(hash)) return true
  try {
    return storage?.getItem(SESSION_KEY) != null
  } catch {
    return false
  }
}

/** A sign-in link that failed (expired, already used) comes back with an error in the URL hash. */
export function linkErrorIn(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  return params.get('error_code') ?? params.get('error')
}

/** A row of `public.entitlements` (written by the RevenueCat webhook) as an access entitlement. */
export function entitlementFromRow(row: { pro: boolean; expires_at: string | null } | null): Entitlement {
  if (!row?.pro) return { pro: false, expiresAt: null }
  if (row.expires_at === null) return { pro: true, expiresAt: null }
  const expiresAt = Date.parse(row.expires_at)
  return Number.isNaN(expiresAt) ? { pro: false, expiresAt: null } : { pro: true, expiresAt }
}
