// Renders the Google Play store graphics: `node scripts/play-graphics.mjs`.
// Writes docs/play-store/icon-512.png and feature-graphic-{en,es}.png with the headless
// Chromium that Playwright installs for the e2e tests.

import { chromium } from '@playwright/test'

const OUT = 'docs/play-store'

/** The app icon's neck (public/favicon.svg, the launcher icon), at any size. */
const neck = (size) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}">
    <rect x="2" y="8" width="20" height="8" rx="2" fill="#6e4226"/>
    <path d="M7 8v8M12 8v8M17 8v8" stroke="#cfd3d8"/>
    <circle cx="9.5" cy="12" r="2.6" fill="#e8590c"/>
  </svg>`

const page = (body, width, height) => `<!doctype html><html><head><style>
  html, body { margin: 0; width: ${width}px; height: ${height}px; overflow: hidden; }
  body { font-family: -apple-system, 'Helvetica Neue', Roboto, sans-serif; }
</style></head><body>${body}</body></html>`

const icon = page(
  `<div style="width:512px;height:512px;background:#f5f3ee;display:grid;place-items:center">${neck(400)}</div>`,
  512,
  512,
)

const TAGLINES = {
  en: 'Scales, arpeggios, ear training, metronome and tuner for bass',
  es: 'Escalas, arpegios, oído, metrónomo y afinador para bajo',
}

const feature = (lang) =>
  page(
    `<div style="width:1024px;height:500px;box-sizing:border-box;padding:0 72px;display:flex;align-items:center;gap:48px;
       background:linear-gradient(90deg,#1f3a5f,#16253b);color:#fff">
      <div style="flex:none;width:260px;height:260px;border-radius:56px;background:#f5f3ee;display:grid;place-items:center;
        box-shadow:0 12px 40px rgb(0 0 0 / 0.35)">${neck(220)}</div>
      <div>
        <div style="font-size:84px;font-weight:800;letter-spacing:-0.02em;line-height:1">Bassically</div>
        <div style="margin-top:20px;font-size:32px;line-height:1.3;color:#ffd8a8">${TAGLINES[lang]}</div>
      </div>
    </div>`,
    1024,
    500,
  )

const browser = await chromium.launch()
const tab = await browser.newPage({ deviceScaleFactor: 1 })
for (const [name, html, width, height] of [
  ['icon-512', icon, 512, 512],
  ['feature-graphic-en', feature('en'), 1024, 500],
  ['feature-graphic-es', feature('es'), 1024, 500],
]) {
  await tab.setViewportSize({ width, height })
  await tab.setContent(html)
  // Play wants opaque PNGs; the pages above have solid backgrounds.
  await tab.screenshot({ path: `${OUT}/${name}.png`, omitBackground: false })
  console.log(`✓ ${OUT}/${name}.png`)
}
await browser.close()
