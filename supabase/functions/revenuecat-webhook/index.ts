// RevenueCat calls this on every purchase, renewal, cancellation, expiry, refund and
// transfer. It re-reads the subscriber from RevenueCat (never trusting the event body for
// access) and updates public.entitlements. Errors return 500 so RevenueCat retries.
// Secrets: REVENUECAT_WEBHOOK_AUTH (the Authorization header set in RevenueCat),
// REVENUECAT_SECRET_KEY (RevenueCat secret API key).

import { env, json, serviceClient } from '../_shared/http.ts'
import { safeEqual, syncEntitlement, webhookUserIds } from '../_shared/revenuecat.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method not allowed' })
  if (!safeEqual(req.headers.get('Authorization') ?? '', env('REVENUECAT_WEBHOOK_AUTH')))
    return json(401, { error: 'unauthorized' })

  const body = await req.json().catch(() => null)
  const admin = serviceClient()
  const synced: string[] = []
  try {
    for (const id of webhookUserIds(body)) {
      // Only ids of real accounts; anything else isn't ours to store.
      const { data } = await admin.auth.admin.getUserById(id)
      if (!data.user) continue
      await syncEntitlement(id, {
        fetch,
        secretKey: env('REVENUECAT_SECRET_KEY'),
        upsert: async (row) => {
          const { error } = await admin.from('entitlements').upsert(row)
          if (error) throw error
        },
      })
      synced.push(id)
    }
    const event = body?.event ?? {}
    await admin.from('audit_log').insert({
      action: `revenuecat ${String(event.type ?? 'unknown').toLowerCase()}`,
      target: synced.join(',') || null,
      details: { event_id: event.id ?? null },
    })
  } catch (error) {
    console.error(error)
    return json(500, { error: 'sync failed' })
  }
  return json(200, { synced })
})
