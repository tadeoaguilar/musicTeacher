// Admins give (or take back) free Pro: testers, students, friends. It goes through
// RevenueCat promotional entitlements, so it behaves like a purchase everywhere, then
// refreshes the mirror row and records who did it.
// Body: { "action": "grant", "userId": "<uuid>", "duration": "monthly" } or
//       { "action": "revoke", "userId": "<uuid>" }.

import { CORS, callerOf, env, json, serviceClient } from '../_shared/http.ts'
import { ENTITLEMENT, REVENUECAT_API, parseGrant, syncEntitlement } from '../_shared/revenuecat.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json(405, { error: 'method not allowed' })
  const admin = serviceClient()
  const caller = await callerOf(req, admin)
  if (!caller) return json(401, { error: 'unauthorized' })
  const { data: isAdmin } = await admin
    .from('admins')
    .select('user_id')
    .eq('user_id', caller.id)
    .maybeSingle()
  if (!isAdmin) return json(403, { error: 'forbidden' })

  const request = parseGrant(await req.json().catch(() => null))
  if (!request) return json(400, { error: 'invalid request' })
  const { data: target } = await admin.auth.admin.getUserById(request.userId)
  if (!target.user) return json(404, { error: 'no such user' })

  const secretKey = env('REVENUECAT_SECRET_KEY')
  const base = `${REVENUECAT_API}/subscribers/${request.userId}/entitlements/${ENTITLEMENT}`
  const response = await fetch(
    request.action === 'grant' ? `${base}/promotional` : `${base}/revoke_promotionals`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      body: request.action === 'grant' ? JSON.stringify({ duration: request.duration }) : undefined,
    },
  )
  if (!response.ok) return json(502, { error: `RevenueCat HTTP ${response.status}` })

  const row = await syncEntitlement(request.userId, {
    fetch,
    secretKey,
    upsert: async (r) => {
      const { error } = await admin.from('entitlements').upsert(r)
      if (error) throw error
    },
  })
  await admin.from('audit_log').insert({
    actor: caller.id,
    action: `${request.action} pro`,
    target: request.userId,
    details: request.action === 'grant' ? { duration: request.duration } : null,
  })
  return json(200, row)
})
