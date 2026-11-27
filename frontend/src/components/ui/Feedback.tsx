import { CircleAlert, Inbox, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

export function InlineAlert({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'warning' | 'info' }) {
  const Icon = tone === 'error' ? CircleAlert : TriangleAlert
  return (
    <div className={`alert alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={18} aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <Inbox size={34} aria-hidden="true" />
      <h3>{title}</h3>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="empty empty--error" role="alert">
      <CircleAlert size={34} aria-hidden="true" />
      <h3>Impossible de charger les données</h3>
      <p className="muted">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn--ghost" onClick={onRetry}>
          Réessayer
        </button>
      )}
    </div>
  )
}
