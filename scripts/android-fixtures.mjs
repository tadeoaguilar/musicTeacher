// Writes the Android parity fixtures: `npm run android:fixtures`. CI regenerates them and fails if
// they changed, so the TypeScript logic can't change without the Kotlin port being checked against it.

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { runnerImport } from 'vite'

const OUTPUT = 'android/core/src/test/resources/fixtures'

const { module } = await runnerImport('./scripts/android-fixtures.ts')
mkdirSync(OUTPUT, { recursive: true })
for (const [name, data] of Object.entries(module.fixtures())) {
  writeFileSync(join(OUTPUT, `${name}.json`), JSON.stringify(data) + '\n')
  console.log(`✓ ${name}.json`)
}
