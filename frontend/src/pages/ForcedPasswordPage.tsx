import { useNavigate } from 'react-router-dom'
import { errorMessage } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { InlineAlert } from '../components/ui/Feedback'
import { PulseMark } from '../components/ui/Logo'
import { useToast } from '../components/ui/toast-context'
import { ChangePasswordForm } from './ChangePasswordForm'
import { useState } from 'react'

/** Écran plein page affiché tant que le serveur exige un changement de mot de passe (première connexion, réinitialisation). */
export function ForcedPasswordPage() {
  const { user, reload, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [logoutError, setLogoutError] = useState<string | null>(null)

  async function done() {
    await reload()
    toast.success('Mot de passe modifié.')
    navigate('/', { replace: true })
  }

  async function leave() {
    try {
      await logout()
      navigate('/connexion', { replace: true })
    } catch (err) {
      setLogoutError(errorMessage(err))
    }
  }

  return (
    <main className="auth">
      <section className="auth__card" aria-labelledby="pw-title">
        <div className="auth__brand">
          <PulseMark size={72} />
        </div>
        <h1 id="pw-title">Choisissez un nouveau mot de passe</h1>
        <p className="muted">
          {user?.full_name || user?.username}, votre mot de passe est temporaire. Vous devez le remplacer avant d’utiliser l’application.
        </p>
        {logoutError && <InlineAlert>{logoutError}</InlineAlert>}
        <ChangePasswordForm onSuccess={done} />
        <p className="auth__foot">
          <button type="button" className="link-btn" onClick={() => void leave()}>
            Se déconnecter
          </button>
        </p>
      </section>
    </main>
  )
}
