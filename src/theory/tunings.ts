export type StringCount = 4 | 5 | 6

export type Tuning = {
  id: string
  /** i18n key suffix for the tuning name. */
  nameKey: string
  /** Open string notes, lowest string first. */
  strings: string[]
}

export const TUNINGS: Tuning[] = [
  { id: '4-standard', nameKey: 'standard', strings: ['E1', 'A1', 'D2', 'G2'] },
  { id: '4-drop-d', nameKey: 'dropD', strings: ['D1', 'A1', 'D2', 'G2'] },
  { id: '4-half-down', nameKey: 'halfDown', strings: ['Eb1', 'Ab1', 'Db2', 'Gb2'] },
  { id: '4-d-standard', nameKey: 'wholeDown', strings: ['D1', 'G1', 'C2', 'F2'] },
  { id: '5-standard', nameKey: 'standard', strings: ['B0', 'E1', 'A1', 'D2', 'G2'] },
  { id: '5-high-c', nameKey: 'highC', strings: ['E1', 'A1', 'D2', 'G2', 'C3'] },
  { id: '5-drop-a', nameKey: 'dropA', strings: ['A0', 'E1', 'A1', 'D2', 'G2'] },
  { id: '5-half-down', nameKey: 'halfDown', strings: ['Bb0', 'Eb1', 'Ab1', 'Db2', 'Gb2'] },
  { id: '6-standard', nameKey: 'standard', strings: ['B0', 'E1', 'A1', 'D2', 'G2', 'C3'] },
  { id: '6-half-down', nameKey: 'halfDown', strings: ['Bb0', 'Eb1', 'Ab1', 'Db2', 'Gb2', 'B2'] },
]

export const STRING_COUNTS: StringCount[] = [4, 5, 6]
export const FRET_COUNTS = [20, 21, 22, 24] as const
export type FretCount = (typeof FRET_COUNTS)[number]

export function getTuning(id: string): Tuning | undefined {
  return TUNINGS.find((t) => t.id === id)
}

export function tuningsFor(count: StringCount): Tuning[] {
  return TUNINGS.filter((t) => t.strings.length === count)
}

export function defaultTuningFor(count: StringCount): Tuning {
  return tuningsFor(count)[0]
}
