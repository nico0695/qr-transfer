import { Button } from '../../primitives/Button'
import { Icon } from '../../primitives/Icon'
import { SegmentedControl } from '../../primitives/SegmentedControl'
import { Tabs } from '../../primitives/Tabs'
import styles from './AppHeader.module.css'

export type AppMode = 'quick' | 'large'
export type AppRole = 'send' | 'receive'

export interface AppHeaderProps {
  mode: AppMode
  onModeChange: (mode: AppMode) => void
  role: AppRole
  onRoleChange: (role: AppRole) => void
  roleGroupLabel: string
  theme: 'dark' | 'light'
  onThemeToggle: () => void
  onLangToggle: () => void
  modeLabels: { quick: string; large: string }
  roleLabels: { send: string; receive: string }
  themeLabels: { switchToDark: string; switchToLight: string }
  langLabel: string
}

export function AppHeader({
  mode,
  onModeChange,
  role,
  onRoleChange,
  roleGroupLabel,
  theme,
  onThemeToggle,
  onLangToggle,
  modeLabels,
  roleLabels,
  themeLabels,
  langLabel,
}: AppHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h1 className={styles.visuallyHidden}>QR Transfer</h1>
        <span className={styles.logo} aria-hidden="true">
          🔳
        </span>
        <Tabs
          value={mode}
          onChange={onModeChange}
          options={[
            { value: 'quick', label: modeLabels.quick },
            { value: 'large', label: modeLabels.large },
          ]}
        />
      </div>
      <div className={styles.right}>
        <SegmentedControl
          aria-label={roleGroupLabel}
          value={role}
          onChange={onRoleChange}
          options={[
            { value: 'send', label: roleLabels.send },
            { value: 'receive', label: roleLabels.receive },
          ]}
        />
        <Button
          variant="secondary"
          size="icon"
          aria-label={theme === 'light' ? themeLabels.switchToDark : themeLabels.switchToLight}
          onClick={onThemeToggle}
        >
          <Icon name={theme === 'light' ? 'moon' : 'sun'} size={16} />
        </Button>
        <Button variant="secondary" size="sm" onClick={onLangToggle}>
          {langLabel}
        </Button>
      </div>
    </header>
  )
}
