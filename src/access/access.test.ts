import { describe, expect, it } from 'vitest'
import {
  FEATURE_IDS,
  NO_ENTITLEMENT,
  PRO_FEATURE_IDS,
  accessTo,
  isPro,
  parseFlags,
  rolloutBucket,
  tierOf,
  type AccessContext,
} from './access'

const NOW = Date.UTC(2026, 9, 17)
const free: AccessContext = { entitlement: NO_ENTITLEMENT, flags: {}, bucket: 50, now: NOW }
const pro: AccessContext = { ...free, entitlement: { pro: true, expiresAt: null } }

describe('catalog', () => {
  it('keeps every existing section free', () => {
    for (const id of [
      'scales',
      'arpeggios',
      'metronome',
      'tuner',
      'ear.findNote',
      'ear.intervals',
    ] as const) {
      expect(tierOf(id)).toBe('free')
      expect(accessTo(id, free)).toBe('open')
    }
  })

  it('lists the Pro features', () => {
    expect(PRO_FEATURE_IDS).toEqual(['scales.more', 'rhythm.programs'])
    expect(FEATURE_IDS).toContain('scales.more')
  })
})

describe('isPro', () => {
  it('honors the expiry', () => {
    expect(isPro({ pro: true, expiresAt: null }, NOW)).toBe(true)
    expect(isPro({ pro: true, expiresAt: NOW + 1 }, NOW)).toBe(true)
    expect(isPro({ pro: true, expiresAt: NOW }, NOW)).toBe(false)
    expect(isPro(NO_ENTITLEMENT, NOW)).toBe(false)
  })
})

describe('accessTo', () => {
  it('hides unreleased Pro features until a flag shows them', () => {
    expect(accessTo('scales.more', free)).toBe('hidden')
    expect(accessTo('scales.more', pro)).toBe('hidden')
    const flags = { 'scales.more': { enabled: true } }
    expect(accessTo('scales.more', { ...free, flags })).toBe('locked')
    expect(accessTo('scales.more', { ...pro, flags })).toBe('open')
  })

  it('opens a Pro feature to everyone when flagged free', () => {
    const flags = { 'scales.more': { enabled: true, free: true } }
    expect(accessTo('scales.more', { ...free, flags })).toBe('open')
  })

  it('can switch off a free feature', () => {
    expect(accessTo('tuner', { ...free, flags: { tuner: { enabled: false } } })).toBe('hidden')
  })

  it('rolls out by bucket', () => {
    const flags = { 'scales.more': { enabled: true, rollout: 30 } }
    expect(accessTo('scales.more', { ...pro, flags, bucket: 29 })).toBe('open')
    expect(accessTo('scales.more', { ...pro, flags, bucket: 30 })).toBe('hidden')
  })

  it('checks the minimum app version only where there is one', () => {
    const flags = { 'scales.more': { enabled: true, minVersion: 5 } }
    expect(accessTo('scales.more', { ...pro, flags, version: 4 })).toBe('hidden')
    expect(accessTo('scales.more', { ...pro, flags, version: 5 })).toBe('open')
    expect(accessTo('scales.more', { ...pro, flags })).toBe('open')
  })
})

describe('parseFlags', () => {
  it('keeps valid fields and drops the rest', () => {
    expect(
      parseFlags({
        'scales.more': { enabled: true, rollout: 140.4, minVersion: 3, extra: 1 },
        tuner: { enabled: 'yes', free: true, rollout: -5, minVersion: 2.5 },
        unknown: { enabled: true },
        metronome: 'on',
      }),
    ).toEqual({
      'scales.more': { enabled: true, rollout: 100, minVersion: 3 },
      tuner: { free: true, rollout: 0 },
    })
  })

  it('ignores anything that is not an object', () => {
    expect(parseFlags(null)).toEqual({})
    expect(parseFlags([1])).toEqual({})
    expect(parseFlags('x')).toEqual({})
  })
})

describe('rolloutBucket', () => {
  it('is stable and spreads keys over 0–99', () => {
    expect(rolloutBucket('abc')).toBe(rolloutBucket('abc'))
    const buckets = new Set(Array.from({ length: 500 }, (_, i) => rolloutBucket(`user-${i}`)))
    expect(Math.min(...buckets)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...buckets)).toBeLessThan(100)
    expect(buckets.size).toBeGreaterThan(90)
  })
})
