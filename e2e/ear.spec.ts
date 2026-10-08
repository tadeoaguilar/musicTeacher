import { expect, test, type Page } from '@playwright/test'

/** Open strings of a standard 4-string bass, as pitch classes (C = 0). */
const STRINGS = [
  ['E', 4],
  ['A', 9],
  ['D', 2],
  ['G', 7],
] as const
const NATURALS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/** A fret (0–5) where the asked-for natural note is, and one where it isn't. */
async function cellsFor(page: Page) {
  const name = (await page.getByRole('region', { name: 'Find the note' }).locator('p').first().textContent())!
  const target = NATURALS[name]
  expect(target, `asked note "${name}" should be natural on level 1`).toBeDefined()
  const cell = (pc: number, match: boolean) => {
    for (const [string, open] of STRINGS)
      for (let fret = 0; fret <= 5; fret++)
        if (((open + fret) % 12 === pc) === match) return `${string} string, fret ${fret}`
    throw new Error('no cell')
  }
  return { right: cell(target, true), wrong: cell(target, false) }
}

test('finds the note, then misses one, and keeps score', async ({ page }) => {
  await page.goto('/en/ear')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ear Training')
  const progress = page.getByRole('region', { name: 'Progress' })

  let cells = await cellsFor(page)
  await page.getByRole('button', { name: cells.right, exact: true }).click()
  await expect(page.getByRole('status')).toHaveText(/^(Correct!|Right note!)/)
  await expect(page.locator('[data-mark="target"]').first()).toBeVisible()
  await expect(progress).toContainText('1/1')

  await page.getByRole('button', { name: 'Next note' }).click()
  await expect(page.locator('[data-mark]')).toHaveCount(0)
  cells = await cellsFor(page)
  // Answer with the keyboard this time: the fret cells are real buttons.
  await page.getByRole('button', { name: cells.wrong, exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status')).toHaveText(/^Not quite: you tapped/)
  await expect(page.locator('[data-mark="wrong"]')).toHaveCount(1)
  await expect(progress).toContainText('1/2')
  await expect(progress).toContainText('Practice more')
})

test('hides the name for pure ear practice, keeps settings in the URL, and speaks Spanish', async ({
  page,
}) => {
  await page.goto('/es/ear?level=2&name=0')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Entrenamiento auditivo')
  await expect(page.getByText('?', { exact: true })).toBeVisible()
  await expect(page.getByText('Pulsa Escuchar y toca la nota que oíste (trastes 0–12).')).toBeVisible()

  await page.getByRole('radio', { name: /^3 ·/ }).click()
  await expect(page).toHaveURL(/level=3/)
  await expect(page).toHaveURL(/name=0/)
  await expect(page.getByRole('button', { name: 'cuerda Mi, traste 24' })).toBeVisible()
})

test('is reachable from the navigation', async ({ page }) => {
  await page.goto('/en/scales')
  await page.getByRole('link', { name: 'Ear training' }).click()
  await expect(page).toHaveURL(/\/en\/ear$/)
})
