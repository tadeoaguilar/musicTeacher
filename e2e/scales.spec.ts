import { expect, test } from '@playwright/test'

test('shows A aeolian on the neck with roots and a single starting note', async ({ page }) => {
  await page.goto('/en/scales?key=A&scale=aeolian')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('A Aeolian')

  // 4-string, 24 frets: A appears at E5, E17, A0, A12, A24, D7, D19, G2, G14.
  await expect(page.locator('[data-root]')).toHaveCount(9)
  const start = page.locator('[data-start]')
  await expect(start).toHaveCount(1)
  await expect(start).toHaveAttribute('aria-label', /fret 5, starting note/)
})

test('keeps settings in the URL and switches to Spanish with solfège', async ({ page }) => {
  await page.goto('/en/scales?key=A&scale=aeolian')
  await page.getByRole('radio', { name: '5', exact: true }).first().click()
  await expect(page).toHaveURL(/tuning=5-standard/)

  await page.getByRole('link', { name: 'Español' }).click()
  await expect(page).toHaveURL(/\/es\/scales\?.*key=A/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('La Eólico')
  await expect(page.locator('[data-start]')).toHaveAttribute('aria-label', /^La, tónica/)
})

test('redirects the root URL to a localized scales page', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/(en|es)\/scales/)
})
