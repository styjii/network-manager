import { ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'

export function ForbiddenPage() {
  return (
    <div className="empty empty--page" role="alert">
      <ShieldAlert size={44} aria-hidden="true" />
      <h1>Accès refusé</h1>
      <p className="muted">Votre rôle ne donne pas accès à cette page. Contactez un administrateur si vous en avez besoin.</p>
      <Link to="/" className="btn btn--primary">
        Retour à l’accueil
      </Link>
    </div>
  )
}
