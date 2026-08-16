import { useState } from 'react'
import { Button } from '../primitives/Button'
import { Card } from '../primitives/Card'
import { Chip } from '../primitives/Chip'
import { Dialog } from '../primitives/Dialog'
import { Feedback } from '../primitives/Feedback'
import { Icon, type IconName } from '../primitives/Icon'
import { Input } from '../primitives/Input'
import { ProgressBar } from '../primitives/ProgressBar'
import { SegmentedControl } from '../primitives/SegmentedControl'
import { Spinner } from '../primitives/Spinner'
import { StatusDot } from '../primitives/StatusDot'
import { Tabs } from '../primitives/Tabs'
import styles from './PrimitivesDemo.module.css'

const SAMPLE_ICONS: IconName[] = [
  'qr-code',
  'scan-line',
  'upload',
  'copy',
  'check',
  'shield-check',
  'alert-triangle',
  'octagon-alert',
  'settings',
  'sun',
  'moon',
  'camera',
]

export default function PrimitivesDemo() {
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (document.documentElement.dataset.theme as 'dark' | 'light') ?? 'dark',
  )
  const [reducedMotion, setReducedMotion] = useState(false)
  const [segment, setSegment] = useState<'send' | 'receive'>('send')
  const [tab, setTab] = useState<'quick' | 'large'>('quick')
  const [dialogOpen, setDialogOpen] = useState(false)

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.dataset.theme = next
  }

  return (
    <div className={styles.page} data-motion={reducedMotion ? 'reduced' : 'auto'}>
      <div className={styles.toolbar}>
        <Button variant="secondary" onClick={toggleTheme}>
          Theme: {theme}
        </Button>
        <Button variant="secondary" onClick={() => setReducedMotion((v) => !v)}>
          Reduced motion: {reducedMotion ? 'on' : 'off'}
        </Button>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Button</h2>
        <div className={styles.row}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="primary" loading loadingLabel="Loading">
            Loading
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
          <Button variant="secondary" size="sm">
            Small
          </Button>
          <Button variant="secondary" size="icon" aria-label="Settings">
            <Icon name="settings" />
          </Button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Input</h2>
        <div className={styles.row}>
          <Input.Textarea className={styles.swatch} placeholder="Textarea placeholder" />
          <Input.Select className={styles.swatch}>
            <option>Option A</option>
            <option>Option B</option>
          </Input.Select>
          <Input.Range className={styles.swatch} min={0} max={100} defaultValue={40} />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>SegmentedControl</h2>
        <SegmentedControl
          aria-label="Role"
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'send', label: 'Send' },
            { value: 'receive', label: 'Receive' },
          ]}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Tabs</h2>
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'quick', label: 'Quick QR' },
            { value: 'large', label: 'Large Transfer' },
          ]}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>StatusDot</h2>
        <div className={styles.row}>
          <StatusDot />
          <StatusDot live />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Chip</h2>
        <div className={styles.row}>
          <Chip>Frame 4</Chip>
          <Chip onRemove={() => {}} removeLabel="Remove">
            Removable
          </Chip>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Card</h2>
        <div className={styles.row}>
          <Card padding="md" radius="card">
            Card content
          </Card>
          <Card padding="lg" radius="stage" dashed>
            Dashed / dropzone
          </Card>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Icon</h2>
        <div className={styles.row}>
          {SAMPLE_ICONS.map((name) => (
            <Icon key={name} name={name} size={22} />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Feedback</h2>
        <div className={styles.row}>
          <Feedback level="notice" title="Notice">
            Can proceed, should know.
          </Feedback>
          <Feedback level="error" title="Error">
            Cannot proceed until fixed.
          </Feedback>
          <Feedback level="verified" title="Verified">
            Succeeded, confirm it.
          </Feedback>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Dialog</h2>
        <Button variant="secondary" onClick={() => setDialogOpen(true)}>
          Open dialog
        </Button>
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
          <Dialog.Header onClose={() => setDialogOpen(false)}>Dialog title</Dialog.Header>
          <Dialog.Body>
            Modal on desktop, bottom sheet on mobile — resize to see it switch.
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setDialogOpen(false)}>
              Done
            </Button>
          </Dialog.Footer>
        </Dialog>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>ProgressBar</h2>
        <div className={styles.swatch}>
          <ProgressBar value={61} max={96} label="61 / 96 frames" />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Spinner</h2>
        <div className={styles.row}>
          <Spinner size="sm" aria-label="Loading" />
          <Spinner size="md" aria-label="Loading" />
          <Spinner size="lg" aria-label="Loading" />
        </div>
      </section>
    </div>
  )
}
