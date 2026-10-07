import { useId, type ReactNode } from 'react'
import styles from './Controls.module.css'

type Option<T> = { value: T; label: ReactNode; title?: string }

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
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
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
