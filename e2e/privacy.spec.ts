import { expect, test } from '@playwright/test'

test('the privacy policy is linked from every page, in both languages', async ({ page }) => {
  await page.goto('/en/scales')
  await page.getByRole('link', { name: 'Privacy' }).click()
  await expect(page).toHaveURL(/\/en\/privacy$/)
  await expect(page.getByRole('heading', { name: 'Privacy policy', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Microphone' })).toBeVisible()

  await page.goto('/es/privacy')
  await expect(page.getByRole('heading', { name: 'Política de privacidad', level: 1 })).toBeVisible()
})
