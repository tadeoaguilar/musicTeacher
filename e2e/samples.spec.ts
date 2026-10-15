import { expect, test } from '@playwright/test'

// Tests can't hear the bass, so check that playback fetches and decodes the recorded samples.
test('plays scales with the recorded bass samples', async ({ page }) => {
  const problems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' || message.text().includes('samples unavailable'))
      problems.push(message.text())
  })
  const samples: string[] = []
  page.on('response', (response) => {
    if (response.url().endsWith('.mp3') && response.ok()) samples.push(response.url())
  })

  await page.goto('/en/scales?key=E&scale=major')
  await page.getByRole('button', { name: 'Play scale' }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()

  await expect.poll(() => samples.length).toBeGreaterThanOrEqual(10)
  await page.getByRole('button', { name: 'Stop' }).click()
  expect(problems).toEqual([])
})
