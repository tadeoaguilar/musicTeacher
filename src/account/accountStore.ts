import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { create } from 'zustand'
import { NO_ENTITLEMENT } from '../access/access'
import { useAccessStore } from '../features/pro/accessStore'
import { entitlementFromRow, linkErrorIn, mightHaveSession } from './session'
import { loadSupabase } from './supabase'

export type AccountStatus = 'unknown' | 'loading' | 'signedOut' | 'signedIn'
export type SendResult = 'sent' | 'rateLimited' | 'failed'

type AccountState = {
  status: AccountStatus
  email: string | null
  /** Set when a sign-in link brought back an error (expired or already used). */
  linkError: string | null
  /** True after this browser deleted its account, to confirm it. */
  deleted: boolean
  /** Restores a session if there may be one; otherwise stays offline. Safe to call more than once. */
  start: () => void
  /** Emails a sign-in link that opens `redirectTo`. Creates the account on first use. */
  sendLink: (email: string, redirectTo: string) => Promise<SendResult>
  signOut: () => Promise<void>
  /** Deletes the account on the server (the `delete-account` Edge Function), then signs out here. */
  deleteAccount: () => Promise<boolean>
}

let connection: Promise<SupabaseClient> | undefined

/** Loads the client once and follows its session (initial, signed in, signed out, other tabs). */
function connect(): Promise<SupabaseClient> {
  connection ??= loadSupabase().then((supabase) => {
    supabase.auth.onAuthStateChange((_event, session) => {
      // Supabase asks not to call it from inside this callback, so the follow-up waits a tick.
      setTimeout(() => void applySession(supabase, session), 0)
    })
    return supabase
  })
  return connection
}

async function applySession(supabase: SupabaseClient, session: Session | null) {
  if (!session) {
    useAccountStore.setState({ status: 'signedOut', email: null })
    useAccessStore.setState({ entitlement: NO_ENTITLEMENT })
    return
  }
  useAccountStore.setState({
    status: 'signedIn',
    email: session.user.email ?? null,
    linkError: null,
    deleted: false,
  })
  const { data } = await supabase
    .from('entitlements')
    .select('pro, expires_at')
    .eq('user_id', session.user.id)
    .maybeSingle()
  useAccessStore.setState({ entitlement: entitlementFromRow(data) })
}

function storage(): Storage | undefined {
  try {
    return localStorage
  } catch {
    return undefined
  }
}

/** The signed-in account, if any. Accounts are optional: everything free works signed out. */
export const useAccountStore = create<AccountState>((set, get) => ({
  status: 'unknown',
  email: null,
  linkError: null,
  deleted: false,

  start: () => {
    if (get().status !== 'unknown') return
    const { hash, pathname, search } = window.location
    const linkError = linkErrorIn(hash)
    if (linkError) history.replaceState(history.state, '', pathname + search)
    if (!mightHaveSession(storage(), hash)) {
      set({ status: 'signedOut', linkError })
      return
    }
    set({ status: 'loading', linkError })
    connect().catch(() => set({ status: 'signedOut' }))
  },

  sendLink: async (email, redirectTo) => {
    try {
      const supabase = await connect()
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
      if (!error) return 'sent'
      return error.status === 429 ? 'rateLimited' : 'failed'
    } catch {
      return 'failed'
    }
  },

  signOut: async () => {
    const supabase = await connect()
    await supabase.auth.signOut()
  },

  deleteAccount: async () => {
    try {
      const supabase = await connect()
      const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' })
      if (error) return false
      set({ deleted: true })
      // The server session is already gone with the user, so only the local one is cleared.
      await supabase.auth.signOut({ scope: 'local' })
      return true
    } catch {
      return false
    }
  },
}))
