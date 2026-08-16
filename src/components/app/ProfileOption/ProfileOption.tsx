import { cx } from '../../../lib/cx'
import styles from './ProfileOption.module.css'

export interface ProfileOptionProps {
  name: string
  spec: string
  description: string
  checked: boolean
  onSelect: () => void
  inputName: string
  value: string
}

/** Radio card: custom indicator, name + mono spec header row, description line. DS §5.13. */
export function ProfileOption({
  name,
  spec,
  description,
  checked,
  onSelect,
  inputName,
  value,
}: ProfileOptionProps) {
  return (
    <label className={cx(styles.option, checked && styles.checked)}>
      <input
        type="radio"
        name={inputName}
        value={value}
        checked={checked}
        onChange={onSelect}
        className={styles.input}
      />
      <span className={styles.indicator} />
      <span className={styles.text}>
        <span className={styles.headerRow}>
          <span className={styles.name}>{name}</span>
          <span className={styles.spec}>{spec}</span>
        </span>
        <span className={styles.description}>{description}</span>
      </span>
    </label>
  )
}
