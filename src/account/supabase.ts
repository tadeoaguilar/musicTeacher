import type { SupabaseClient } from '@supabase/supabase-js'
import { SESSION_KEY } from './session'

// Public by design (row level security protects the data): see supabase/README.md.
export const SUPABASE_URL = 'https://dobthafewrdpeddpwgzu.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_V26Q4MKJuIyjjqERgVgavw_4xPOz2O5'

let client: Promise<SupabaseClient> | undefined

/** The Supabase client, lazy-loaded like Tone.js so the free app's bundle doesn't grow. */
export function loadSupabase(): Promise<SupabaseClient> {
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_KEY, {
      // Implicit flow: the emailed link carries the session, so it works in any browser.
      auth: { flowType: 'implicit', detectSessionInUrl: true, persistSession: true, storageKey: SESSION_KEY },
    }),
  )
  return client
}
