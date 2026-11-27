import { SearchX } from 'lucide-react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="empty empty--page">
      <SearchX size={44} aria-hidden="true" />
      <h1>Page introuvable</h1>
      <p className="muted">Cette adresse n’existe pas ou a été déplacée.</p>
      <Link to="/" className="btn btn--primary">
        Retour à l’accueil
      </Link>
    </div>
  )
}
