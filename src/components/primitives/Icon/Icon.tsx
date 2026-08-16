import { ICONS, type IconName } from './Icon.constants'

const SIZES = { 14: 14, 16: 16, 22: 22, 26: 26 } as const

export interface IconProps {
  name: IconName
  size?: keyof typeof SIZES
  className?: string
  'aria-hidden'?: boolean
  'aria-label'?: string
}

export function Icon({ name, size = 16, className, ...aria }: IconProps) {
  const LucideIcon = ICONS[name]
  return (
    <LucideIcon
      size={SIZES[size]}
      className={className}
      color="currentColor"
      aria-hidden={aria['aria-label'] ? undefined : true}
      {...aria}
    />
  )
}
