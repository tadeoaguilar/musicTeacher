import { expect, test, type Page } from '@playwright/test'

/** Fretboard note markers are buttons labelled "G, root, E string, fret 3". */
const markerNotes = async (page: Page) => {
  const labels = await page
    .locator('svg [role="button"]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''))
  return new Set(labels.map((l) => l.split(',')[0]))
}

test('shows G7 and marks only its chord tones', async ({ page }) => {
  await page.goto('/en/arpeggios?key=G&chord=dom7')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('G7')
  await expect(page.getByText('Dominant 7th. Major triad plus the flat 7th')).toBeVisible()
  expect(await markerNotes(page)).toEqual(new Set(['G', 'B', 'D', 'F']))
  // Lowest G is the E string, fret 3.
  await expect(page.locator('[data-start]')).toHaveAttribute('aria-label', /fret 3, starting note/)
})

test('keeps chord settings in the URL and switches to Spanish', async ({ page }) => {
  await page.goto('/en/arpeggios?key=G&chord=dom7')
  await page.getByLabel('Chord').selectOption('m7b5')
  await page.getByRole('radio', { name: '2', exact: true }).click()
  await expect(page).toHaveURL(/chord=m7b5/)
  await expect(page).toHaveURL(/oct=2/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Gm7♭5')
  await expect(page.getByText('Two-octave fingering')).toBeVisible()

  await page.getByRole('link', { name: 'Español' }).click()
  await expect(page).toHaveURL(/\/es\/arpeggios\?.*chord=m7b5/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Solm7♭5')
  expect(await markerNotes(page)).toEqual(new Set(['Sol', 'Si♭', 'Re♭', 'Fa']))
})

test('is reachable from the navigation', async ({ page }) => {
  await page.goto('/en/scales')
  await page.getByRole('link', { name: 'Arpeggios' }).click()
  await expect(page).toHaveURL(/\/en\/arpeggios\?key=C&chord=maj/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('C')
})
