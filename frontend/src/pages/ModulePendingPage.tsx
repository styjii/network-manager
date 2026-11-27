import { Info } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'

interface Props {
  icon: LucideIcon
  title: string
  subtitle: string
  backend: string
  planned: string[]
}

/**
 * Page d'un module dont l'API n'existe pas encore côté Django.
 * Aucune valeur fictive : le cahier des charges demande « non collecté » plutôt qu'une donnée inventée.
 */
export function ModulePendingPage({ icon, title, subtitle, backend, planned }: Props) {
  return (
    <>
      <PageHeader icon={icon} title={title} subtitle={subtitle} />
      <section className="panel pending" aria-labelledby="pending-title">
        <div className="pending__icon" aria-hidden="true">
          <Info size={26} />
        </div>
        <div>
          <h2 id="pending-title">Ce module n’est pas encore branché</h2>
          <p className="muted">
            L’API de l’application <code>{backend}</code> n’est pas encore disponible dans le backend. La page affichera les données réelles dès qu’elle le sera, sans valeur de démonstration.
          </p>
          <h3 className="pending__sub">Prévu pour cette page</h3>
          <ul className="pending__list">
            {planned.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}
