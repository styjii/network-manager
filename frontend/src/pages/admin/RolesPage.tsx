import { Check, Minus, UserCog } from 'lucide-react'
import { errorMessage } from '../../api/client'
import { useRoles } from '../../api/queries'
import { PageHeader } from '../../components/layout/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { ErrorState } from '../../components/ui/Feedback'
import { PERMISSION_GROUPS, ROLE_TONES } from '../../lib/labels'

export function RolesPage() {
  const roles = useRoles()
  const list = roles.data ?? []
  const known = new Set(PERMISSION_GROUPS.flatMap((g) => Object.keys(g.permissions)))
  // Codes renvoyés par le serveur mais absents de la table de libellés : affichés tels quels, jamais masqués.
  const unknown = [...new Set(list.flatMap((r) => r.permissions))].filter((p) => !known.has(p)).sort()

  return (
    <>
      <PageHeader icon={UserCog} title="Rôles et permissions" subtitle="Ce que chaque rôle peut consulter et modifier" />

      {roles.isError && !roles.data && <ErrorState message={errorMessage(roles.error)} onRetry={() => void roles.refetch()} />}

      <section className="role-cards" aria-label="Rôles">
        {roles.isPending && Array.from({ length: 5 }, (_, i) => <span key={i} className="skeleton skeleton--card" />)}
        {list.map((r) => (
          <article key={r.role} className="panel role-card">
            <div className="role-card__head">
              <Badge tone={ROLE_TONES[r.role]}>{r.label}</Badge>
              <span className="muted">
                {r.user_count} utilisateur{r.user_count > 1 ? 's' : ''}
              </span>
            </div>
            <p>{r.description}</p>
            <p className="muted">{r.permissions.length} permissions</p>
          </article>
        ))}
      </section>

      {list.length > 0 && (
        <section className="panel" aria-labelledby="matrix-title">
          <div className="panel__head">
            <h2 id="matrix-title">Matrice des permissions</h2>
            <p className="muted">Définie côté serveur : cette page est en lecture seule.</p>
          </div>
          <div className="table-wrap table-wrap--scroll">
            <table className="table matrix">
              <thead>
                <tr>
                  <th scope="col">Permission</th>
                  {list.map((r) => (
                    <th scope="col" key={r.role} className="matrix__role">
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              {[...PERMISSION_GROUPS.map((g) => ({ key: g.key, label: g.label, items: Object.entries(g.permissions) })), ...(unknown.length ? [{ key: 'other', label: 'Autres', items: unknown.map((p) => [p, p] as [string, string]) }] : [])].map(
                (group) => (
                  <tbody key={group.key}>
                    <tr className="matrix__group">
                      <th scope="colgroup" colSpan={list.length + 1}>
                        {group.label}
                      </th>
                    </tr>
                    {group.items.map(([code, label]) => (
                      <tr key={code}>
                        <th scope="row" className="matrix__perm">
                          {label}
                          <code>{code}</code>
                        </th>
                        {list.map((r) => {
                          const has = r.permissions.includes(code)
                          return (
                            <td key={r.role} className="matrix__cell">
                              {has ? <Check size={18} className="yes" aria-hidden="true" /> : <Minus size={18} className="no" aria-hidden="true" />}
                              <span className="sr-only">{has ? 'Oui' : 'Non'}</span>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                ),
              )}
            </table>
          </div>
        </section>
      )}
    </>
  )
}
