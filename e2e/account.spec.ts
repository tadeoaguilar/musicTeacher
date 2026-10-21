import { expect, test, type Page } from '@playwright/test'

// Every Supabase call is intercepted: these tests never reach the real project or send email.
const SUPABASE = 'https://dobthafewrdpeddpwgzu.supabase.co'

function fakeJwt(): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const exp = Math.floor(Date.now() / 1000) + 3600
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: 'u1', exp, role: 'authenticated' })}.sig`
}

async function signIn(page: Page) {
  const session = {
    access_token: fakeJwt(),
    refresh_token: 'refresh',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: 'u1',
      aud: 'authenticated',
      email: 'player@example.com',
      app_metadata: {},
      user_metadata: {},
    },
  }
  await page.addInitScript((value) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('account.session', value)
      sessionStorage.setItem('seeded', '1')
    }
  }, JSON.stringify(session))
  await page.route(`${SUPABASE}/rest/v1/entitlements*`, (route) =>
    route.fulfill({ json: { pro: false, expires_at: null } }),
  )
}

test('free visitors never contact the backend', async ({ page }) => {
  const calls: string[] = []
  page.on('request', (request) => {
    if (request.url().startsWith(SUPABASE)) calls.push(request.url())
  })
  await page.goto('/en/scales')
  await page.getByRole('link', { name: 'Account' }).click()
  await expect(page.getByRole('heading', { name: 'Account', level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Email me a sign-in link' })).toBeVisible()
  expect(calls).toEqual([])
})

test('emails a sign-in link that comes back to the account page', async ({ page }) => {
  let sent: { email?: string; redirect?: string | null } = {}
  await page.route(`${SUPABASE}/auth/v1/otp*`, async (route) => {
    const request = route.request()
    sent = {
      email: request.postDataJSON().email,
      redirect: new URL(request.url()).searchParams.get('redirect_to'),
    }
    await route.fulfill({ json: {} })
  })
  await page.goto('/en/account')
  await page.getByLabel('Email').fill(' player@example.com ')
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click()
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()
  await expect(page.getByText('We sent a sign-in link to player@example.com.')).toBeVisible()
  expect(sent).toEqual({ email: 'player@example.com', redirect: 'http://localhost:4173/en/account' })
})

test('says when sending fails, in Spanish too', async ({ page }) => {
  await page.route(`${SUPABASE}/auth/v1/otp*`, (route) =>
    route.fulfill({ status: 429, json: { code: 'over_email_send_rate_limit', msg: 'rate limit' } }),
  )
  await page.goto('/es/account')
  await page.getByLabel('Correo electrónico').fill('player@example.com')
  await page.getByRole('button', { name: 'Envíame un enlace para entrar' }).click()
  await expect(page.getByRole('alert')).toHaveText(/Se enviaron demasiados enlaces/)
})

test('an expired link asks for a new one', async ({ page }) => {
  await page.goto('/en/account#error=access_denied&error_code=otp_expired&error_description=expired')
  await expect(page.getByRole('alert')).toHaveText(/expired or was already used/)
  await expect(page).toHaveURL(/\/en\/account$/)
})

test('a signed-in player can sign out', async ({ page }) => {
  await signIn(page)
  await page.route(`${SUPABASE}/auth/v1/logout*`, (route) => route.fulfill({ status: 204 }))
  await page.goto('/en/account')
  await expect(page.getByText('Signed in as player@example.com.')).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('button', { name: 'Email me a sign-in link' })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('account.session'))).toBeNull()
})

test('a signed-in player can delete their account', async ({ page }) => {
  await signIn(page)
  let deleted = false
  await page.route(`${SUPABASE}/functions/v1/delete-account`, async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204 })
    deleted = route.request().headers().authorization?.startsWith('Bearer ') ?? false
    await route.fulfill({ json: { deleted: true } })
  })
  await page.goto('/en/account')
  const section = page.getByRole('region', { name: 'Delete account' })
  await section.getByRole('button', { name: 'Delete account…' }).click()
  await section.getByRole('button', { name: 'Cancel' }).click()
  await section.getByRole('button', { name: 'Delete account…' }).click()
  await section.getByRole('button', { name: 'Delete my account permanently' }).click()
  await expect(page.getByRole('status')).toHaveText('Your account was deleted.')
  expect(deleted).toBe(true)
})
