import { describe, expect, it, vi } from 'vitest'
import { entitlementRow, parseGrant, safeEqual, syncEntitlement, webhookUserIds } from './revenuecat.ts'

const ID = '6f1c2a0e-9d7b-4c1e-8a7f-2b9d3e4f5a6b'
const OTHER = '0b9e7a52-3c4d-4e5f-8a9b-1c2d3e4f5a6b'

const subscriber = (entitlement: object | undefined, extra: object = {}) => ({
  subscriber: { entitlements: entitlement ? { pro: entitlement } : {}, subscriptions: {}, ...extra },
})

describe('entitlementRow', () => {
  it('is not Pro without the entitlement', () => {
    expect(entitlementRow(ID, subscriber(undefined))).toEqual({
      user_id: ID,
      pro: false,
      expires_at: null,
      store: null,
      product_id: null,
    })
    expect(entitlementRow(ID, null).pro).toBe(false)
  })

  it('mirrors a monthly subscription with its store', () => {
    const row = entitlementRow(
      ID,
      subscriber(
        { expires_date: '2026-11-19T00:00:00Z', product_identifier: 'pro_monthly:monthly' },
        { subscriptions: { 'pro_monthly:monthly': { store: 'play_store' } } },
      ),
    )
    expect(row).toEqual({
      user_id: ID,
      pro: true,
      expires_at: '2026-11-19T00:00:00Z',
      store: 'play_store',
      product_id: 'pro_monthly:monthly',
    })
  })

  it('counts the billing grace period', () => {
    const row = entitlementRow(
      ID,
      subscriber({
        expires_date: '2026-11-19T00:00:00Z',
        grace_period_expires_date: '2026-11-26T00:00:00Z',
        product_identifier: 'pro_monthly',
      }),
    )
    expect(row.expires_at).toBe('2026-11-26T00:00:00Z')
  })

  it('never expires for a lifetime purchase', () => {
    const row = entitlementRow(
      ID,
      subscriber(
        { expires_date: null, product_identifier: 'pro_lifetime' },
        { non_subscriptions: { pro_lifetime: [{ store: 'app_store' }, { store: 'stripe' }] } },
      ),
    )
    expect(row).toMatchObject({ pro: true, expires_at: null, store: 'stripe' })
  })

  it('keeps a lapsed subscription with its past expiry', () => {
    const row = entitlementRow(
      ID,
      subscriber({ expires_date: '2020-01-01T00:00:00Z', product_identifier: 'p' }),
    )
    expect(row).toMatchObject({ pro: true, expires_at: '2020-01-01T00:00:00Z' })
  })

  it("doesn't turn an unreadable expiry into lifetime", () => {
    const row = entitlementRow(ID, subscriber({ expires_date: 'soon', product_identifier: 'p' }))
    expect(row).toMatchObject({ pro: false, expires_at: null })
  })
})

describe('webhookUserIds', () => {
  it('collects our users from every field, once each', () => {
    const body = {
      event: {
        type: 'TRANSFER',
        app_user_id: ID.toUpperCase(),
        original_app_user_id: '$RCAnonymousID:abc',
        aliases: [ID, '$RCAnonymousID:abc'],
        transferred_from: [OTHER],
        transferred_to: [ID],
      },
    }
    expect(webhookUserIds(body)).toEqual([ID, OTHER])
  })

  it('ignores test events and junk', () => {
    expect(webhookUserIds({ event: { type: 'TEST', app_user_id: 'test-user' } })).toEqual([])
    expect(webhookUserIds(null)).toEqual([])
    expect(webhookUserIds({ event: { aliases: 'x' } })).toEqual([])
  })
})

describe('safeEqual', () => {
  it('compares whole strings', () => {
    expect(safeEqual('Bearer s3cret', 'Bearer s3cret')).toBe(true)
    expect(safeEqual('Bearer s3cret', 'Bearer s3crex')).toBe(false)
    expect(safeEqual('Bearer s3cret', 'Bearer s3cret!')).toBe(false)
    expect(safeEqual('', 'x')).toBe(false)
  })
})

describe('parseGrant', () => {
  it('accepts grants and revokes for a user id', () => {
    expect(parseGrant({ action: 'grant', userId: ID, duration: 'monthly' })).toEqual({
      action: 'grant',
      userId: ID,
      duration: 'monthly',
    })
    expect(parseGrant({ action: 'revoke', userId: ID.toUpperCase() })).toEqual({
      action: 'revoke',
      userId: ID,
    })
  })

  it('rejects anything else', () => {
    expect(parseGrant({ action: 'grant', userId: ID, duration: 'forever' })).toBeNull()
    expect(parseGrant({ action: 'grant', userId: 'me', duration: 'monthly' })).toBeNull()
    expect(parseGrant({ action: 'delete', userId: ID })).toBeNull()
    expect(parseGrant('x')).toBeNull()
  })
})

describe('syncEntitlement', () => {
  it('reads the subscriber with the secret key and stores the row', async () => {
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(subscriber({ expires_date: null, product_identifier: 'pro_lifetime' }))),
    )
    const upsert = vi.fn(async () => {})
    const row = await syncEntitlement(ID, { fetch, secretKey: 'sk_test', upsert })
    expect(fetch).toHaveBeenCalledWith(`https://api.revenuecat.com/v1/subscribers/${ID}`, {
      headers: { Authorization: 'Bearer sk_test' },
    })
    expect(upsert).toHaveBeenCalledWith(row)
    expect(row.pro).toBe(true)
  })

  it('fails (so RevenueCat retries) when RevenueCat does', async () => {
    const fetch = vi.fn(async () => new Response('', { status: 503 }))
    await expect(syncEntitlement(ID, { fetch, secretKey: 'k', upsert: async () => {} })).rejects.toThrow(
      '503',
    )
  })
})
