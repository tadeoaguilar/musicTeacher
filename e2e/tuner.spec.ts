import { expect, test, type Page } from '@playwright/test'

/**
 * Replaces the microphone with a bass-like tone (weak fundamental, loud
 * harmonics) built from oscillators. Everything after getUserMedia, from the
 * analyser to pitch detection, is the app's real code. (Chromium's own fake
 * microphone waits for OS mic permission on macOS, so it can't run everywhere.)
 */
async function fakeMicrophone(page: Page, hz: number, volume = 0.25) {
  await page.addInitScript(
    ([hz, volume]) => {
      navigator.mediaDevices.getUserMedia = async () => {
        const context = new AudioContext()
        await context.resume()
        const out = context.createMediaStreamDestination()
        ;[0.3, 1, 0.6, 0.3].forEach((amp, h) => {
          const osc = new OscillatorNode(context, { frequency: hz * (h + 1) })
          const gain = new GainNode(context, { gain: amp * volume })
          osc.connect(gain).connect(out)
          osc.start()
        })
        return out.stream
      }
    },
    [hz, volume],
  )
}

/** A1 played 20 cents flat. */
const FLAT_A = 55 * 2 ** (-20 / 1200)

test('hears a flat A string and lights it up', async ({ page }) => {
  await fakeMicrophone(page, FLAT_A)
  await page.goto('/en/tuner')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tuner')
  await expect(page.getByRole('img', { name: 'Press Start, then play a string' })).toBeVisible()

  await page.getByRole('button', { name: 'Start tuner' }).click()
  const meter = page.getByRole('img', { name: /^A1, \d+ cents flat$/ })
  await expect(meter).toBeVisible()
  const cents = Number((await meter.getAttribute('aria-label'))!.match(/(\d+) cents/)![1])
  expect(cents).toBeGreaterThanOrEqual(15)
  expect(cents).toBeLessThanOrEqual(25)
  await expect(page.getByRole('button', { name: 'Play A1' })).toHaveAttribute('data-active', 'true')
  await expect(page.getByRole('button', { name: 'Play E1' })).not.toHaveAttribute('data-active')

  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByRole('button', { name: 'Start tuner' })).toBeVisible()
})

test('keeps tuning and A4 in the URL and speaks Spanish', async ({ page }) => {
  await fakeMicrophone(page, FLAT_A)
  await page.goto('/es/tuner?tuning=5-standard&a4=432')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Afinador')
  await expect(page.getByRole('button', { name: /^Tocar / })).toHaveCount(5)
  await expect(page.getByText('432 Hz')).toBeVisible()

  await page.getByRole('button', { name: 'Iniciar afinador' }).click()
  // At A4 = 432 Hz an A1 is 54 Hz, so the same note that is flat at 440 reads ~12 cents sharp.
  await expect(page.getByRole('img', { name: /^La1, 1[0-4] cents alto$/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tocar La1' })).toHaveAttribute('data-active', 'true')
  await expect(page).toHaveURL(/tuning=5-standard/)
  await expect(page).toHaveURL(/a4=432/)
})

test('hears a quiet G string, like an unplugged bass on a laptop mic', async ({ page }) => {
  // About −55 dBFS: far below what the first version of the tuner could hear.
  await fakeMicrophone(page, 98, 0.0015)
  await page.goto('/en/tuner')
  await page.getByRole('button', { name: 'Start tuner' }).click()
  await expect(page.getByRole('meter', { name: 'Input level' })).toBeVisible()
  await expect(page.getByRole('img', { name: /^G2, / })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play G2' })).toHaveAttribute('data-active', 'true')
})
