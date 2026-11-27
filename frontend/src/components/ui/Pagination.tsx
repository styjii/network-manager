import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  page: number
  pageSize: number
  count: number
  noun: string
  onPage: (page: number) => void
}

function windowed(page: number, last: number): (number | '…')[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)
  const set = new Set([1, last, page - 1, page, page + 1])
  const sorted = [...set].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b)
  const out: (number | '…')[] = []
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push('…')
    out.push(n)
  })
  return out
}

export function Pagination({ page, pageSize, count, noun, onPage }: Props) {
  const last = Math.max(1, Math.ceil(count / pageSize))
  const from = count === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, count)
  return (
    <nav className="pagination" aria-label="Pagination">
      <p className="muted">
        {count === 0 ? `Aucun ${noun}` : `Affichage de ${from} à ${to} sur ${count} ${noun}${count > 1 ? 's' : ''}`}
      </p>
      {last > 1 && (
        <div className="pagination__pages">
          <button type="button" className="icon-btn" aria-label="Page précédente" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          {windowed(page, last).map((n, i) =>
            n === '…' ? (
              <span key={`gap-${i}`} className="pagination__gap" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                className={`icon-btn pagination__num ${n === page ? 'is-current' : ''}`}
                aria-label={`Page ${n}`}
                aria-current={n === page ? 'page' : undefined}
                onClick={() => onPage(n)}
              >
                {n}
              </button>
            ),
          )}
          <button type="button" className="icon-btn" aria-label="Page suivante" disabled={page >= last} onClick={() => onPage(page + 1)}>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </nav>
  )
}
