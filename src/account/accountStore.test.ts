import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAccessStore } from '../features/pro/accessStore'
import { SESSION_KEY } from './session'

type Listener = (event: string, session: unknown) => void

const fake = vi.hoisted(() => {
  const state = { listener: null as Listener | null }
  const client = {
    auth: {
      onAuthStateChange: vi.fn((cb: Listener) => {
        state.listener = cb
      }),
      signInWithOtp: vi.fn(),
      signOut: vi.fn(),
    },
    functions: { invoke: vi.fn() },
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { pro: true, expires_at: null } }) }),
      }),
    })),
  }
  return { state, client }
})

vi.mock('./supabase', () => ({ loadSupabase: vi.fn(async () => fake.client) }))

const { loadSupabase } = await import('./supabase')
const { useAccountStore } = await import('./accountStore')

const session = { user: { id: 'u1', email: 'player@example.com' } }
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('account store', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.replaceState(null, '', '/en/account')
    useAccountStore.setState({ status: 'unknown', email: null, linkError: null, deleted: false })
    vi.clearAllMocks()
  })

  it('stays offline for visitors who never signed in', () => {
    useAccountStore.getState().start()
    expect(useAccountStore.getState().status).toBe('signedOut')
    expect(loadSupabase).not.toHaveBeenCalled()
  })

  it('shows a failed sign-in link and clears it from the URL', () => {
    window.history.replaceState(null, '', '/en/account#error=access_denied&error_code=otp_expired')
    useAccountStore.getState().start()
    expect(useAccountStore.getState().linkError).toBe('otp_expired')
    expect(window.location.hash).toBe('')
  })

  it('restores a stored session and loads the entitlement', async () => {
    localStorage.setItem(SESSION_KEY, '{}')
    useAccountStore.getState().start()
    expect(useAccountStore.getState().status).toBe('loading')
    await tick()
    fake.state.listener?.('INITIAL_SESSION', session)
    await tick()
    await tick()
    expect(useAccountStore.getState()).toMatchObject({ status: 'signedIn', email: 'player@example.com' })
    expect(useAccessStore.getState().entitlement).toEqual({ pro: true, expiresAt: null })

    fake.state.listener?.('SIGNED_OUT', null)
    await tick()
    expect(useAccountStore.getState().status).toBe('signedOut')
    expect(useAccessStore.getState().entitlement).toEqual({ pro: false, expiresAt: null })
  })

  it('sends a sign-in link and reports rate limits', async () => {
    fake.client.auth.signInWithOtp.mockResolvedValueOnce({ error: null })
    expect(await useAccountStore.getState().sendLink('a@b.co', 'http://x/en/account')).toBe('sent')
    expect(fake.client.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'a@b.co',
      options: { emailRedirectTo: 'http://x/en/account' },
    })
    fake.client.auth.signInWithOtp.mockResolvedValueOnce({ error: { status: 429 } })
    expect(await useAccountStore.getState().sendLink('a@b.co', 'http://x')).toBe('rateLimited')
    fake.client.auth.signInWithOtp.mockResolvedValueOnce({ error: { status: 400 } })
    expect(await useAccountStore.getState().sendLink('a@b.co', 'http://x')).toBe('failed')
  })

  it('deletes the account on the server, then signs out locally', async () => {
    fake.client.functions.invoke.mockResolvedValueOnce({ error: null })
    expect(await useAccountStore.getState().deleteAccount()).toBe(true)
    expect(fake.client.functions.invoke).toHaveBeenCalledWith('delete-account', { method: 'POST' })
    expect(fake.client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(useAccountStore.getState().deleted).toBe(true)

    fake.client.functions.invoke.mockResolvedValueOnce({ error: new Error('500') })
    expect(await useAccountStore.getState().deleteAccount()).toBe(false)
  })
})
