import { useCallback, useState } from 'react'
import { recordAnswer, type ItemStats } from '../../ear/progress'

function load(key: string): ItemStats {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as ItemStats) : {}
  } catch {
    return {}
  }
}

/**
 * Right/wrong counts per item, remembered on this device so practice picks up
 * where you left off. Storage can be unavailable (private mode); then stats
 * last for the session only.
 */
export function useItemStats(key: string) {
  const [stats, setStats] = useState(() => load(key))
  const record = useCallback(
    (item: string, correct: boolean) =>
      setStats((current) => {
        const next = recordAnswer(current, item, correct)
        try {
          localStorage.setItem(key, JSON.stringify(next))
        } catch {
          // Not persisted; fine for this session.
        }
        return next
      }),
    [key],
  )
  return [stats, record] as const
}
