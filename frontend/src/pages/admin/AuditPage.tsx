import { ScrollText, Search } from 'lucide-react'
import { useEffect } from 'react'
import { ApiError, errorMessage } from '../../api/client'
import { useAuditLogs } from '../../api/queries'
import { PageHeader } from '../../components/layout/PageHeader'
import { AuditTag } from '../../components/ui/AuditTag'
import { EmptyState, ErrorState } from '../../components/ui/Feedback'
import { Pagination } from '../../components/ui/Pagination'
import { formatDateTime } from '../../lib/format'
import { useDebouncedValue, usePage, useUrlState } from '../../lib/hooks'
import { AUDIT_ACTIONS, OBJECT_TYPE_LABELS } from '../../lib/labels'

const PAGE_SIZE = 20

export function AuditPage() {
  const [{ q, action, username, date_from, date_to }, setUrl] = useUrlState(['q', 'action', 'username', 'date_from', 'date_to'])
  const [page, setPage] = usePage()
  const dq = useDebouncedValue(q.trim(), 300)
  const du = useDebouncedValue(username.trim(), 300)
  const logs = useAuditLogs({ q: dq, action, username: du, date_from, date_to, page, page_size: PAGE_SIZE })

  useEffect(() => {
    if (logs.error instanceof ApiError && logs.error.status === 404 && page > 1) setPage(1)
  }, [logs.error, page, setPage])

  const hasFilters = Boolean(q || action || username || date_from || date_to)
  const invalidRange = Boolean(date_from && date_to && date_from > date_to)

  return (
    <>
      <PageHeader icon={ScrollText} title="Journal d’audit" subtitle="Connexions, modifications et actions sensibles, en ajout seul" />

      <section className="panel" aria-labelledby="audit-title">
        <div className="panel__head">
          <h2 id="audit-title">Événements</h2>
        </div>

        <div className="filters filters--audit">
          <label className="search search--inline search--grow">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Rechercher dans le journal</span>
            <input type="search" placeholder="Rechercher dans le détail, l’objet ou l’utilisateur..." value={q} onChange={(e) => setUrl({ q: e.target.value })} />
          </label>
          <label>
            <span>Action</span>
            <select className="input input--select" value={action} onChange={(e) => setUrl({ action: e.target.value })}>
              <option value="">Toutes les actions</option>
              {Object.entries(AUDIT_ACTIONS).map(([code, meta]) => (
                <option key={code} value={code}>
                  {meta.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Utilisateur</span>
            <input className="input" type="text" placeholder="admin" autoCapitalize="none" value={username} onChange={(e) => setUrl({ username: e.target.value })} />
          </label>
          <label>
            <span>Du</span>
            <input className="input" type="date" value={date_from} max={date_to || undefined} onChange={(e) => setUrl({ date_from: e.target.value })} />
          </label>
          <label>
            <span>Au</span>
            <input className="input" type="date" value={date_to} min={date_from || undefined} onChange={(e) => setUrl({ date_to: e.target.value })} />
          </label>
          {hasFilters && (
            <button type="button" className="link-btn" onClick={() => setUrl({ q: null, action: null, username: null, date_from: null, date_to: null })}>
              Effacer les filtres
            </button>
          )}
        </div>
        {invalidRange && <p className="field__error">La date de début doit précéder la date de fin.</p>}

        {logs.isError && !logs.data ? (
          <ErrorState message={errorMessage(logs.error)} onRetry={() => void logs.refetch()} />
        ) : (
          <>
            <div className="table-wrap" aria-busy={logs.isFetching}>
              <table className="table table--stack">
                <thead>
                  <tr>
                    <th scope="col">Date / Heure</th>
                    <th scope="col">Utilisateur</th>
                    <th scope="col">Action</th>
                    <th scope="col">Objet</th>
                    <th scope="col">Détail</th>
                    <th scope="col">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.isPending &&
                    Array.from({ length: 6 }, (_, i) => (
                      <tr key={i} aria-hidden="true">
                        <td colSpan={6}>
                          <span className="skeleton skeleton--row" />
                        </td>
                      </tr>
                    ))}
                  {logs.data?.results.map((l) => (
                    <tr key={l.id}>
                      <td data-label="Date" className="nowrap">
                        {formatDateTime(l.created_at, true)}
                      </td>
                      <td data-label="Utilisateur">{l.username || <span className="muted">–</span>}</td>
                      <td data-label="Action">
                        <AuditTag action={l.action} label={l.action_label} />
                      </td>
                      <td data-label="Objet">
                        {l.object_type ? `${OBJECT_TYPE_LABELS[l.object_type] ?? l.object_type}${l.object_id ? ` n° ${l.object_id}` : ''}` : <span className="muted">–</span>}
                      </td>
                      <td data-label="Détail" className="cell-detail">
                        {l.detail || <span className="muted">–</span>}
                      </td>
                      <td data-label="IP" className="nowrap">
                        {l.ip ?? '–'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.data && logs.data.count === 0 && (
                <EmptyState title="Aucun événement">{hasFilters ? 'Aucune entrée ne correspond à ces filtres.' : 'Le journal est vide pour le moment.'}</EmptyState>
              )}
            </div>
            {logs.data && <Pagination page={page} pageSize={PAGE_SIZE} count={logs.data.count} noun="événement" onPage={setPage} />}
          </>
        )}
      </section>
    </>
  )
}
