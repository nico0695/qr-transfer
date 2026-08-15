import { useI18n } from '../i18n'

export type Section = 'quick' | 'large'

interface NavMenuProps {
  section: Section
  onChange: (section: Section) => void
}

export function NavMenu({ section, onChange }: NavMenuProps) {
  const t = useI18n()
  const items: { id: Section; label: string }[] = [
    { id: 'quick', label: t.navQuick },
    { id: 'large', label: t.navLarge },
  ]
  return (
    <nav className="nav" aria-label={t.navLabel}>
      <ul className="nav-list">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="nav-link"
              aria-current={section === item.id ? 'page' : undefined}
              onClick={() => onChange(item.id)}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
