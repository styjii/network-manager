import { KeyRound, UserRound } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { useToast } from '../components/ui/toast-context'
import { useAuth } from '../auth/useAuth'
import { formatDateTime } from '../lib/format'
import { permissionLabel, ROLE_TONES } from '../lib/labels'
import { ChangePasswordForm } from './ChangePasswordForm'

export function AccountPage() {
  const { user } = useAuth()
  const toast = useToast()
  if (!user) return null

  return (
    <>
      <PageHeader icon={UserRound} title="Mon compte" subtitle="Votre profil, vos droits et votre mot de passe" />
      <div className="grid grid--account">
        <section className="panel" aria-labelledby="profile-title">
          <div className="panel__head">
            <h2 id="profile-title">Profil</h2>
          </div>
          <div className="profile">
            <Avatar name={user.full_name || user.username} seed={user.username} size={72} />
            <div>
              <p className="profile__name">{user.full_name || user.username}</p>
              <Badge tone={ROLE_TONES[user.role]}>{user.role_label}</Badge>
            </div>
          </div>
          <dl className="facts">
            <div>
              <dt>Nom d’utilisateur</dt>
              <dd>{user.username}</dd>
            </div>
            <div>
              <dt>Adresse e-mail</dt>
              <dd>{user.email || 'Non renseignée'}</dd>
            </div>
            <div>
              <dt>Compte créé le</dt>
              <dd>{formatDateTime(user.created_at)}</dd>
            </div>
            <div>
              <dt>Connexion en cours depuis</dt>
              <dd>{formatDateTime(user.last_login)}</dd>
            </div>
          </dl>
          <h3 className="panel__sub">Vos droits ({user.permissions.length})</h3>
          <ul className="chips">
            {user.permissions.map((p) => (
              <li key={p} title={p}>
                {permissionLabel(p) === p ? p : `${p.split('.')[0]} : ${permissionLabel(p).toLowerCase()}`}
              </li>
            ))}
          </ul>
        </section>

        <section className="panel" aria-labelledby="pw-title">
          <div className="panel__head">
            <h2 id="pw-title">
              <KeyRound size={20} aria-hidden="true" /> Changer le mot de passe
            </h2>
          </div>
          <p className="muted panel__lead">Vos autres sessions ouvertes seront fermées. Celle-ci reste active.</p>
          <ChangePasswordForm onSuccess={() => toast.success('Mot de passe modifié. Vos autres sessions ont été fermées.')} />
        </section>
      </div>
    </>
  )
}
