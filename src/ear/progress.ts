/** Answers so far in this session. */
export type Score = { right: number; total: number; streak: number; best: number }

export const EMPTY_SCORE: Score = { right: 0, total: 0, streak: 0, best: 0 }

export function addToScore(score: Score, correct: boolean): Score {
  const streak = correct ? score.streak + 1 : 0
  return {
    right: score.right + (correct ? 1 : 0),
    total: score.total + 1,
    streak,
    best: Math.max(score.best, streak),
  }
}

/** Right and wrong answers per item (a note, an interval…), kept across sessions. */
export type ItemStats = Record<string, { right: number; wrong: number }>

export function recordAnswer(stats: ItemStats, item: string, correct: boolean): ItemStats {
  const { right, wrong } = stats[item] ?? { right: 0, wrong: 0 }
  return { ...stats, [item]: correct ? { right: right + 1, wrong } : { right, wrong: wrong + 1 } }
}

/**
 * How often an item should come up: 2.5 for a new item, rising towards 4 for
 * items you keep missing and falling towards 1 for items you always get right.
 */
export function weightOf(stats: ItemStats, item: string): number {
  const { right, wrong } = stats[item] ?? { right: 0, wrong: 0 }
  return 1 + (3 * (wrong + 1)) / (right + wrong + 2)
}

/** The items missed most often (by share of wrong answers), worst first. */
export function weakest(stats: ItemStats, count = 3): string[] {
  return Object.entries(stats)
    .filter(([, s]) => s.wrong > 0)
    .sort(
      ([, a], [, b]) => b.wrong / (b.right + b.wrong) - a.wrong / (a.right + a.wrong) || b.wrong - a.wrong,
    )
    .slice(0, count)
    .map(([item]) => item)
}
