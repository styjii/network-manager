import { Copy } from 'lucide-react'
import { InlineAlert } from '../../components/ui/Feedback'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toast-context'
import { copyText } from '../../lib/clipboard'

interface Props {
  username: string | null
  password: string | null
  reason: 'created' | 'reset'
  onClose: () => void
}

/** Le mot de passe temporaire n'est renvoyé qu'une fois par le serveur : on l'affiche ici et nulle part ailleurs. */
export function TempPasswordDialog({ username, password, reason, onClose }: Props) {
  const toast = useToast()

  async function copy() {
    if (!password) return
    const ok = await copyText(password)
    if (ok) toast.success('Mot de passe copié.')
    else toast.error('Copie impossible : sélectionnez le mot de passe et copiez-le à la main.')
  }

  return (
    <Modal
      open={Boolean(password)}
      onClose={onClose}
      size="sm"
      title={reason === 'created' ? 'Compte créé' : 'Mot de passe réinitialisé'}
      description={username ? `Compte : ${username}` : undefined}
      footer={
        <button type="button" className="btn btn--primary" onClick={onClose}>
          J’ai noté le mot de passe
        </button>
      }
    >
      <p>Transmettez ce mot de passe temporaire à l’utilisateur. Il devra le remplacer à sa prochaine connexion.</p>
      <div className="secret">
        <code data-testid="temporary-password">{password}</code>
        <button type="button" className="btn btn--ghost" onClick={() => void copy()}>
          <Copy size={16} aria-hidden="true" />
          Copier
        </button>
      </div>
      <InlineAlert tone="warning">Ce mot de passe ne sera plus jamais affiché. Fermer cette fenêtre le rend définitivement inaccessible.</InlineAlert>
    </Modal>
  )
}
