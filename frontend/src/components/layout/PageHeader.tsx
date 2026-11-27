import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  icon: LucideIcon
  title: string
  subtitle: string
  actions?: ReactNode
}

export function PageHeader({ icon: Icon, title, subtitle, actions }: Props) {
  return (
    <header className="page-header">
      <div className="page-header__icon" aria-hidden="true">
        <Icon size={38} strokeWidth={1.8} />
      </div>
      <div className="page-header__text">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  )
}
