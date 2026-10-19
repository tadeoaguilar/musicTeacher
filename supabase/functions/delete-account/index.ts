// Deletes the signed-in user's account (required by Google Play): their RevenueCat customer
// (if billing is set up) and their Supabase user, which cascades to profile and entitlement.
// Active store subscriptions must still be cancelled in Google Play or the web billing portal.

import { CORS, callerOf, json, serviceClient } from '../_shared/http.ts'
import { REVENUECAT_API } from '../_shared/revenuecat.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json(405, { error: 'method not allowed' })
  const admin = serviceClient()
  const user = await callerOf(req, admin)
  if (!user) return json(401, { error: 'unauthorized' })

  const secretKey = Deno.env.get('REVENUECAT_SECRET_KEY')
  if (secretKey) {
    const response = await fetch(`${REVENUECAT_API}/subscribers/${encodeURIComponent(user.id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${secretKey}` },
    })
    if (!response.ok && response.status !== 404) return json(502, { error: 'billing deletion failed' })
  }
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return json(500, { error: 'deletion failed' })
  await admin.from('audit_log').insert({ action: 'delete account', target: user.id })
  return json(200, { deleted: true })
})
