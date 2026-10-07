import { expect, test } from '@playwright/test'

test('starts in 6/8 and lights the beats in time', async ({ page }) => {
  await page.goto('/en/metronome?ts=6/8&bpm=200')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Metronome')
  // 6/8 pulses in two dotted quarters.
  await expect(page.getByRole('button', { name: /^Beat \d/ })).toHaveCount(2)

  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
  await expect(page.locator('button[class*="_on_"]')).toHaveCount(1)
  await expect(page.getByText(/^Bar \d/)).toBeVisible()
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible()
})

test('shows a pattern in notation and keeps settings in the URL', async ({ page }) => {
  await page.goto('/en/metronome?ts=4/4')
  await page.getByLabel('Rhythm pattern').selectOption('motown')
  await expect(page).toHaveURL(/pat=motown/)
  // Motown: dotted quarter, eighth, quarter, quarter.
  const staff = page.getByRole('img', { name: /Motown in 4\/4/ })
  await expect(staff.locator('[data-note]')).toHaveCount(4)
  await expect(staff.locator('[data-rest]')).toHaveCount(0)

  // Changing the meter drops patterns that don't fit it.
  await page.getByRole('radio', { name: '3/4' }).click()
  await expect(page).toHaveURL(/ts=3%2F4/)
  await expect(page).not.toHaveURL(/pat=/)
})

test('cycles beat accents and taps the tempo', async ({ page }) => {
  await page.goto('/en/metronome')
  const beat2 = page.getByRole('button', { name: /^Beat 2/ })
  await beat2.click()
  await expect(beat2).toHaveAccessibleName('Beat 2: silent')
  await expect(page).toHaveURL(/acc=ASNN/)

  const tap = page.getByRole('button', { name: 'Tap tempo' })
  for (let i = 0; i < 4; i++) {
    await tap.click()
    await page.waitForTimeout(500)
  }
  // Taps ~500 ms apart (plus click time, slower on CI) → a bit under 120 BPM.
  await expect(page).not.toHaveURL(/bpm=80\b/)
  const bpm = Number(new URL(page.url()).searchParams.get('bpm'))
  expect(bpm).toBeGreaterThan(60)
  expect(bpm).toBeLessThanOrEqual(120)
})

test('is translated to Spanish', async ({ page }) => {
  await page.goto('/es/metronome')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Metrónomo')
  await expect(page.getByRole('link', { name: 'Metrónomo' })).toBeVisible()
})
