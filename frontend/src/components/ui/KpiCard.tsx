import type { ReactNode } from 'react'
import type { Tone } from '../../lib/labels'

interface Props {
  tone: Tone
  icon: ReactNode
  label: string
  value: ReactNode
  hint?: string
  /** 0 à 100 : barre de progression sous la valeur. */
  progress?: number
  loading?: boolean
}

export function KpiCard({ tone, icon, label, value, hint, progress, loading }: Props) {
  return (
    <article className={`kpi kpi--${tone}`} aria-busy={loading || undefined}>
      <div className="kpi__icon" aria-hidden="true">
        {icon}
      </div>
      <div className="kpi__body">
        <h3 className="kpi__label">{label}</h3>
        <p className="kpi__value">
          {loading ? <span className="skeleton skeleton--kpi" aria-label="Chargement" /> : value}
          {hint && !loading && <span className="kpi__hint">{hint}</span>}
        </p>
        {progress !== undefined && !loading && (
          <div className="kpi__bar" role="presentation">
            <span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
        )}
      </div>
    </article>
  )
}
