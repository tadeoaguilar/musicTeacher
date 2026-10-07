export type SpeedTrainer = { target: number; step: number; every: number }
export type GapTrainer = { play: number; mute: number }

export type TrainerSettings = {
  bpm: number
  countIn: boolean
  speed: SpeedTrainer | undefined
  gap: GapTrainer | undefined
}

export type BarPlan = {
  bpm: number
  /** Silent bar of the gap trainer: visuals continue, sound stops. */
  muted: boolean
  countIn: boolean
  /** Bars until the speed trainer changes tempo; undefined when it has reached the target or is off. */
  barsToNextStep: number | undefined
}

/** What a bar should do, given its index from the start (the count-in, if on, is bar 0). */
export function barPlan(barIndex: number, { bpm, countIn, speed, gap }: TrainerSettings): BarPlan {
  if (countIn && barIndex === 0) {
    return { bpm, muted: false, countIn: true, barsToNextStep: undefined }
  }
  const bar = barIndex - (countIn ? 1 : 0)

  let current = bpm
  let barsToNextStep: number | undefined
  if (speed && speed.step > 0 && speed.every > 0) {
    const distance = Math.abs(speed.target - bpm)
    const travelled = Math.min(distance, Math.floor(bar / speed.every) * speed.step)
    current = bpm + Math.sign(speed.target - bpm) * travelled
    if (travelled < distance) barsToNextStep = speed.every - (bar % speed.every)
  }

  const muted = !!gap && gap.play > 0 && gap.mute > 0 && bar % (gap.play + gap.mute) >= gap.play
  return { bpm: current, muted, countIn: false, barsToNextStep }
}
