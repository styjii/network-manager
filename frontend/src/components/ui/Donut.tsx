import type { ReactNode } from 'react'

export interface DonutSegment {
  label: string
  value: number
  color: string
}

interface Props {
  segments: DonutSegment[]
  center: ReactNode
  size?: number
  ariaLabel: string
}

export function Donut({ segments, center, size = 190, ariaLabel }: Props) {
  const stroke = 22
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const gap = total > 0 && segments.filter((s) => s.value > 0).length > 1 ? 2.5 : 0
  let offset = 0

  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((s) => {
              const length = (s.value / total) * c
              const seg = (
                <circle
                  key={s.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${Math.max(length - gap, 0)} ${c - Math.max(length - gap, 0)}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              )
              offset += length
              return seg
            })}
      </svg>
      <div className="donut__center">{center}</div>
    </div>
  )
}
