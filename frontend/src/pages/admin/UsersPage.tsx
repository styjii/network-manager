import { Clock, Database, Filter, KeyRound, Lock, Pencil, Plus, ScrollText, Search, ShieldCheck, Trash2, UserCheck, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, errorMessage } from '../../api/client'
import { useAuditLogs, useDeleteUser, useResetPassword, useUsers, useUserStats } from '../../api/queries'
import type { User, UserCreated } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { PageHeader } from '../../components/layout/PageHeader'
import { Avatar } from '../../components/ui/Avatar'
import { AuditTag } from '../../components/ui/AuditTag'
import { Badge, StatusDot } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Donut } from '../../components/ui/Donut'
import { EmptyState, ErrorState } from '../../components/ui/Feedback'
import { KpiCard } from '../../components/ui/KpiCard'
import { Pagination } from '../../components/ui/Pagination'
import { useToast } from '../../components/ui/toast-context'
import { formatDateTime, formatPercent } from '../../lib/format'
import { useDebouncedValue, usePage, useUrlState } from '../../lib/hooks'
import { ROLE_LABELS, ROLE_ORDER, ROLE_TONES, TONE_HEX } from '../../lib/labels'
import { TempPasswordDialog } from './TempPasswordDialog'
import { UserFormModal } from './UserFormModal'

const PAGE_SIZE = 10

export function UsersPage() {
  const { user: me, can } = useAuth()
  const toast = useToast()
  const canManage = can('users.manage')
  const canAudit = can('audit.view')

  const [{ q, role, active }, setUrl] = useUrlState(['q', 'role', 'active'])
  const [page, setPage] = usePage()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const debouncedQ = useDebouncedValue(q.trim(), 300)

  const users = useUsers({ q: debouncedQ, role, is_active: active, page, page_size: PAGE_SIZE })
  const stats = useUserStats()
  const audit = useAuditLogs({ page_size: 5 }, canAudit)

  // Page demandée devenue inexistante (dernier élément supprimé, filtre plus étroit) : retour à la page 1.
  useEffect(() => {
    if (users.error instanceof ApiError && users.error.status === 404 && page > 1) setPage(1)
  }, [users.error, page, setPage])

  const [formUser, setFormUser] = useState<User | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [toDelete, setToDelete] = useState<User | null>(null)
  const [toReset, setToReset] = useState<User | null>(null)
  const [secret, setSecret] = useState<{ username: string; password: string; reason: 'created' | 'reset' } | null>(null)

  const del = useDeleteUser()
  const reset = useResetPassword()

  function openCreate() {
    setFormUser(null)
    setFormOpen(true)
  }
  function openEdit(u: User) {
    setFormUser(u)
    setFormOpen(true)
  }
  function onCreated(u: UserCreated) {
    setFormOpen(false)
    setSecret({ username: u.username, password: u.temporary_password, reason: 'created' })
  }

  async function confirmDelete() {
    if (!toDelete) return
    try {
      await del.mutateAsync(toDelete.id)
      toast.success(`Utilisateur « ${toDelete.username} » supprimé.`)
      setToDelete(null)
    } catch (err) {
      toast.error(errorMessage(err))
      setToDelete(null)
    }
  }

  async function confirmReset() {
    if (!toReset) return
    try {
      const res = await reset.mutateAsync(toReset.id)
      setSecret({ username: toReset.username, password: res.temporary_password, reason: 'reset' })
      setToReset(null)
    } catch (err) {
      toast.error(errorMessage(err))
      setToReset(null)
    }
  }

  const s = stats.data
  const activeFilters = (role ? 1 : 0) + (active ? 1 : 0)

  return (
    <>
      <PageHeader
        icon={ShieldCheck}
        title="Administration"
        subtitle="Gestion des utilisateurs, rôles et sécurité"
        actions={
          canManage && (
            <button type="button" className="btn btn--primary" onClick={openCreate}>
              <Plus size={18} aria-hidden="true" />
              Nouvel utilisateur
            </button>
          )
        }
      />

      <section className="kpis" aria-label="Indicateurs des comptes">
        <KpiCard tone="blue" icon={<Users size={44} />} label="Utilisateurs" value={s?.total} loading={stats.isPending} />
        <KpiCard
          tone="green"
          icon={<ShieldCheck size={44} />}
          label="Administrateurs"
          value={s?.admins}
          hint={s ? formatPercent(s.admins_percent) : undefined}
          progress={s?.admins_percent}
          loading={stats.isPending}
        />
        <KpiCard
          tone="purple"
          icon={<UserCheck size={44} />}
          label="Utilisateurs actifs"
          value={s?.active}
          hint={s ? formatPercent(s.active_percent) : undefined}
          progress={s?.active_percent}
          loading={stats.isPending}
        />
        <KpiCard tone="orange" icon={<Clock size={44} />} label="Connexions (24 h)" value={s?.connections_24h} loading={stats.isPending} />
      </section>
      {stats.isError && <ErrorState message={errorMessage(stats.error)} onRetry={() => void stats.refetch()} />}

      <div className="grid grid--users">
        <section className="panel panel--glow" aria-labelledby="users-title">
          <div className="panel__head panel__head--wrap">
            <div className="panel__title">
              <Users size={30} aria-hidden="true" className="accent" />
              <div>
                <h2 id="users-title">Utilisateurs</h2>
                <p className="muted">Liste des utilisateurs du système</p>
              </div>
            </div>
            <div className="toolbar">
              <label className="search search--inline">
                <Search size={18} aria-hidden="true" />
                <span className="sr-only">Rechercher un utilisateur</span>
                <input type="search" placeholder="Rechercher un utilisateur..." value={q} onChange={(e) => setUrl({ q: e.target.value })} />
              </label>
              <button
                type="button"
                className={`btn btn--ghost ${activeFilters ? 'is-on' : ''}`}
                aria-expanded={filtersOpen}
                aria-controls="user-filters"
                onClick={() => setFiltersOpen((o) => !o)}
              >
                <Filter size={18} aria-hidden="true" />
                Filtrer{activeFilters ? ` (${activeFilters})` : ''}
              </button>
            </div>
          </div>

          {filtersOpen && (
            <div id="user-filters" className="filters">
              <label>
                <span>Rôle</span>
                <select className="input input--select" value={role} onChange={(e) => setUrl({ role: e.target.value })}>
                  <option value="">Tous les rôles</option>
                  {ROLE_ORDER.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Statut</span>
                <select className="input input--select" value={active} onChange={(e) => setUrl({ active: e.target.value })}>
                  <option value="">Tous les statuts</option>
                  <option value="true">Actif</option>
                  <option value="false">Inactif</option>
                </select>
              </label>
              {activeFilters > 0 && (
                <button type="button" className="link-btn" onClick={() => setUrl({ role: null, active: null })}>
                  Effacer les filtres
                </button>
              )}
            </div>
          )}

          {users.isError && !users.data ? (
            <ErrorState message={errorMessage(users.error)} onRetry={() => void users.refetch()} />
          ) : (
            <>
              <div className="table-wrap" aria-busy={users.isFetching}>
                <table className="table table--stack">
                  <thead>
                    <tr>
                      <th scope="col">Nom d’utilisateur</th>
                      <th scope="col">Nom complet</th>
                      <th scope="col">Rôle</th>
                      <th scope="col">Statut</th>
                      <th scope="col">Dernière connexion</th>
                      {canManage && (
                        <th scope="col" className="col-actions">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {users.isPending &&
                      Array.from({ length: 5 }, (_, i) => (
                        <tr key={i} aria-hidden="true">
                          <td colSpan={canManage ? 6 : 5}>
                            <span className="skeleton skeleton--row" />
                          </td>
                        </tr>
                      ))}
                    {users.data?.results.map((u) => {
                      const self = u.id === me?.id
                      return (
                        <tr key={u.id}>
                          <td data-label="Utilisateur">
                            <span className="cell-user">
                              <Avatar name={u.full_name || u.username} seed={u.username} />
                              <strong>{u.username}</strong>
                              {self && <span className="tag-me">Vous</span>}
                            </span>
                          </td>
                          <td data-label="Nom complet">{u.full_name || <span className="muted">–</span>}</td>
                          <td data-label="Rôle">
                            <Badge tone={ROLE_TONES[u.role]}>{u.role_label}</Badge>
                          </td>
                          <td data-label="Statut">
                            <StatusDot active={u.is_active} />
                          </td>
                          <td data-label="Dernière connexion">{u.last_login ? formatDateTime(u.last_login) : <span className="muted">Jamais</span>}</td>
                          {canManage && (
                            <td data-label="Actions" className="col-actions">
                              <div className="row-actions">
                                <button type="button" className="icon-btn icon-btn--blue" aria-label={`Modifier ${u.username}`} title="Modifier" onClick={() => openEdit(u)}>
                                  <Pencil size={17} aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  className="icon-btn icon-btn--blue"
                                  aria-label={`Réinitialiser le mot de passe de ${u.username}`}
                                  title={self ? 'Utilisez « Mon compte » pour votre propre mot de passe' : 'Réinitialiser le mot de passe'}
                                  disabled={self}
                                  onClick={() => setToReset(u)}
                                >
                                  <KeyRound size={17} aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  className="icon-btn icon-btn--red"
                                  aria-label={`Supprimer ${u.username}`}
                                  title={self ? 'Vous ne pouvez pas supprimer votre propre compte' : 'Supprimer'}
                                  disabled={self}
                                  onClick={() => setToDelete(u)}
                                >
                                  <Trash2 size={17} aria-hidden="true" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {users.data && users.data.count === 0 && (
                  <EmptyState title="Aucun utilisateur trouvé">
                    {q || role || active ? 'Aucun compte ne correspond à ces critères.' : 'Créez le premier compte pour commencer.'}
                  </EmptyState>
                )}
              </div>
              {users.data && <Pagination page={page} pageSize={PAGE_SIZE} count={users.data.count} noun="utilisateur" onPage={setPage} />}
            </>
          )}
        </section>

        <section className="panel" aria-labelledby="roles-title">
          <div className="panel__head">
            <h2 id="roles-title">Répartition des rôles</h2>
          </div>
          {stats.isPending && <span className="skeleton skeleton--donut" />}
          {s && (
            <div className="roles-chart">
              <Donut
                ariaLabel={`Répartition de ${s.total} utilisateurs par rôle`}
                segments={ROLE_ORDER.map((r) => {
                  const stat = s.roles.find((x) => x.role === r)
                  return { label: ROLE_LABELS[r], value: stat?.count ?? 0, color: TONE_HEX[ROLE_TONES[r]] }
                })}
                center={
                  <>
                    <strong>{s.total}</strong>
                    <span>Utilisateur{s.total > 1 ? 's' : ''}</span>
                  </>
                }
              />
              <ul className="legend">
                {ROLE_ORDER.map((r) => {
                  const stat = s.roles.find((x) => x.role === r)
                  return (
                    <li key={r}>
                      <span className="legend__dot" style={{ background: TONE_HEX[ROLE_TONES[r]] }} aria-hidden="true" />
                      <span className="legend__label">{ROLE_LABELS[r]}</span>
                      <span className="legend__value">
                        {stat?.count ?? 0} · {formatPercent(stat?.percent ?? 0)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </section>
      </div>

      <div className="grid grid--activity">
        {canAudit && (
          <section className="panel" aria-labelledby="activity-title">
            <div className="panel__head">
              <h2 id="activity-title">Journal d’activité récent</h2>
              <Link to="/admin/audit" className="link">
                Voir tout
              </Link>
            </div>
            {audit.isError && !audit.data ? (
              <ErrorState message={errorMessage(audit.error)} onRetry={() => void audit.refetch()} />
            ) : (
              <div className="table-wrap">
                <table className="table table--stack">
                  <thead>
                    <tr>
                      <th scope="col">Date / Heure</th>
                      <th scope="col">Utilisateur</th>
                      <th scope="col">Action</th>
                      <th scope="col">Détail</th>
                      <th scope="col">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.isPending &&
                      Array.from({ length: 3 }, (_, i) => (
                        <tr key={i} aria-hidden="true">
                          <td colSpan={5}>
                            <span className="skeleton skeleton--row" />
                          </td>
                        </tr>
                      ))}
                    {audit.data?.results.map((l) => (
                      <tr key={l.id}>
                        <td data-label="Date" className="nowrap">
                          {formatDateTime(l.created_at, true)}
                        </td>
                        <td data-label="Utilisateur">{l.username || <span className="muted">–</span>}</td>
                        <td data-label="Action">
                          <AuditTag action={l.action} label={l.action_label} />
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
                {audit.data && audit.data.count === 0 && <EmptyState title="Aucune activité enregistrée" />}
              </div>
            )}
          </section>
        )}

        <section className="panel" aria-labelledby="security-title">
          <div className="panel__head">
            <h2 id="security-title">
              <ShieldCheck size={22} aria-hidden="true" className="accent" /> Sécurité
            </h2>
          </div>
          <ul className="security">
            <li>
              <Lock size={26} aria-hidden="true" />
              <div>
                <strong>Comptes inactifs</strong>
                <span>{s ? `${s.total - s.active} sur ${s.total}` : '…'}</span>
              </div>
            </li>
            <li>
              <Database size={26} aria-hidden="true" />
              <div>
                <strong>Sauvegardes</strong>
                <span>Module non disponible pour le moment</span>
              </div>
            </li>
          </ul>
          <div className="security__actions">
            <Link to="/compte" className="btn btn--primary btn--block">
              <KeyRound size={18} aria-hidden="true" />
              Changer mon mot de passe
            </Link>
            {canAudit && (
              <Link to="/admin/audit" className="btn btn--ghost btn--block">
                <ScrollText size={18} aria-hidden="true" />
                Voir le journal d’audit
              </Link>
            )}
          </div>
        </section>
      </div>

      <UserFormModal user={formUser} open={formOpen} isSelf={formUser?.id === me?.id} onClose={() => setFormOpen(false)} onCreated={onCreated} />
      <TempPasswordDialog username={secret?.username ?? null} password={secret?.password ?? null} reason={secret?.reason ?? 'created'} onClose={() => setSecret(null)} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Supprimer cet utilisateur ?"
        confirmLabel="Supprimer"
        danger
        busy={del.isPending}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      >
        <p>
          Le compte <strong>{toDelete?.username}</strong> sera supprimé définitivement et ses sessions ouvertes seront fermées. Les entrées du journal d’audit sont conservées.
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        open={Boolean(toReset)}
        title="Réinitialiser le mot de passe ?"
        confirmLabel="Réinitialiser"
        busy={reset.isPending}
        onConfirm={() => void confirmReset()}
        onCancel={() => setToReset(null)}
      >
        <p>
          Un nouveau mot de passe temporaire sera généré pour <strong>{toReset?.username}</strong>. Ses sessions ouvertes seront fermées et il devra le changer à la connexion.
        </p>
      </ConfirmDialog>
    </>
  )
}
