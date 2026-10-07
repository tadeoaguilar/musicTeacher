import { useId, type ReactNode } from 'react'
import styles from './Controls.module.css'

type Option<T> = {
  value: T
  label: ReactNode
  title?: string
  /** Shown as an <optgroup> in selects. */ group?: string
}

type SegmentedProps<T> = {
  label: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  wrap?: boolean
}

/** A row of toggle buttons; better than a dropdown when choices are few and visual. */
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  wrap,
}: SegmentedProps<T>) {
  return (
    <div className={styles.field} role="radiogroup" aria-label={label}>
      <span className={styles.label}>{label}</span>
      <div className={wrap ? `${styles.segmented} ${styles.wrap}` : styles.segmented}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            title={o.title}
            className={o.value === value ? `${styles.segment} ${styles.selected}` : styles.segment}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

type SelectProps = {
  label: string
  value: string
  options: Option<string>[]
  onChange: (value: string) => void
}

export function Select({ label, value, options, onChange }: SelectProps) {
  const id = useId()
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <select id={id} className={styles.select} value={value} onChange={(e) => onChange(e.target.value)}>
        {groupOptions(options).map(([group, items]) => {
          const rendered = items.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))
          return group ? (
            <optgroup key={group} label={group}>
              {rendered}
            </optgroup>
          ) : (
            rendered
          )
        })}
      </select>
    </div>
  )
}

/** Consecutive options sharing a group, in order. */
function groupOptions<T>(options: Option<T>[]): [string | undefined, Option<T>[]][] {
  const groups: [string | undefined, Option<T>[]][] = []
  for (const o of options) {
    const last = groups.at(-1)
    if (last && last[0] === o.group) last[1].push(o)
    else groups.push([o.group, [o]])
  }
  return groups
}

type SliderProps = {
  label: string
  /** Text shown next to the label, e.g. "60 %". */
  display: string
  value: number
  min: number
  max: number
  step?: number
  disabled?: boolean
  onChange: (value: number) => void
}

export function Slider({ label, display, value, min, max, step = 1, disabled, onChange }: SliderProps) {
  const id = useId()
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label} · <output>{display}</output>
      </label>
      <input
        id={id}
        className={styles.range}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

type NumberFieldProps = {
  label: string
  value: number
  min: number
  max: number
  disabled?: boolean
  onChange: (value: number) => void
}

/** Integer input that only reports values inside [min, max]. */
export function NumberField({ label, value, min, max, disabled, onChange }: NumberFieldProps) {
  const id = useId()
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={styles.number}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (Number.isInteger(n) && n >= min && n <= max) onChange(n)
        }}
      />
    </div>
  )
}

type ToggleProps = { label: string; checked: boolean; onChange: (checked: boolean) => void }

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className={styles.toggle}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={styles.switch} aria-hidden />
      {label}
    </label>
  )
}
