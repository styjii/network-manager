import type { ReactNode } from 'react'
import type { Tone } from '../../lib/labels'

export function Badge({ tone, icon, children }: { tone: Tone; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={`badge badge--${tone}`}>
      {icon}
      {children}
    </span>
  )
}

/** État avec un point coloré ET un libellé : l'information ne repose jamais sur la seule couleur. */
export function StatusDot({ active, activeLabel = 'Actif', inactiveLabel = 'Inactif' }: { active: boolean; activeLabel?: string; inactiveLabel?: string }) {
  return (
    <span className={`status ${active ? 'status--ok' : 'status--ko'}`}>
      <span className="status__dot" aria-hidden="true" />
      {active ? activeLabel : inactiveLabel}
    </span>
  )
}
