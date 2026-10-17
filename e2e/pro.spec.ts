import { expect, test } from '@playwright/test'

test('Pro features stay hidden unless a flag shows them', async ({ page }) => {
  await page.goto('/en/scales')
  await expect(page.getByRole('heading', { name: 'C Major', level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Learn more' })).toHaveCount(0)
})

test('a flagged Pro feature shows a teaser that opens the paywall', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'access.flags',
      JSON.stringify({ 'scales.more': { enabled: true }, 'rhythm.programs': { enabled: true } }),
    ),
  )
  await page.goto('/en/scales')
  const teaser = page.getByRole('region', { name: 'More scales' })
  await expect(teaser.getByText('Pro')).toBeVisible()
  await teaser.getByRole('button', { name: 'Learn more' }).click()

  const paywall = page.getByRole('dialog', { name: 'Bassically Pro' })
  await expect(paywall).toBeVisible()
  await expect(paywall.getByText('Rhythm programs')).toBeVisible()
  await expect(paywall.getByText('Bassically Pro is coming soon.')).toBeVisible()
  await paywall.getByRole('button', { name: 'Close' }).click()
  await expect(paywall).toHaveCount(0)

  await page.goto('/es/metronome')
  await page
    .getByRole('region', { name: 'Programas de ritmo' })
    .getByRole('button', { name: 'Saber más' })
    .click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
