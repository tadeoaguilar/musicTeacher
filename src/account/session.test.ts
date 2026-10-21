import { describe, expect, it } from 'vitest'
import { SESSION_KEY, entitlementFromRow, linkErrorIn, mightHaveSession } from './session'

const store = (items: Record<string, string>) => ({ getItem: (key: string) => items[key] ?? null })

describe('mightHaveSession', () => {
  it('finds a stored session or a sign-in link', () => {
    expect(mightHaveSession(store({}), '')).toBe(false)
    expect(mightHaveSession(store({ [SESSION_KEY]: '{}' }), '')).toBe(true)
    expect(mightHaveSession(store({}), '#access_token=abc&type=magiclink')).toBe(true)
    expect(mightHaveSession(undefined, '#other=1')).toBe(false)
  })

  it('treats unreadable storage as signed out', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
    }
    expect(mightHaveSession(broken, '')).toBe(false)
  })
})

describe('linkErrorIn', () => {
  it('reads the error a failed link brings back', () => {
    expect(linkErrorIn('#error=access_denied&error_code=otp_expired&error_description=x')).toBe('otp_expired')
    expect(linkErrorIn('#error=server_error')).toBe('server_error')
    expect(linkErrorIn('#access_token=abc')).toBeNull()
    expect(linkErrorIn('')).toBeNull()
  })
})

describe('entitlementFromRow', () => {
  it('maps the server row', () => {
    expect(entitlementFromRow(null)).toEqual({ pro: false, expiresAt: null })
    expect(entitlementFromRow({ pro: false, expires_at: null })).toEqual({ pro: false, expiresAt: null })
    expect(entitlementFromRow({ pro: true, expires_at: null })).toEqual({ pro: true, expiresAt: null })
    expect(entitlementFromRow({ pro: true, expires_at: '2026-11-19T00:00:00Z' })).toEqual({
      pro: true,
      expiresAt: Date.UTC(2026, 10, 19),
    })
    expect(entitlementFromRow({ pro: true, expires_at: 'soon' })).toEqual({ pro: false, expiresAt: null })
  })
})
