import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { SplashScreen } from '../components/ui/SplashScreen'
import { ForbiddenPage } from '../pages/ForbiddenPage'
import { useAuth } from './useAuth'

export const PASSWORD_ROUTE = '/changer-mot-de-passe'
export const LOGIN_ROUTE = '/connexion'

/** Laisse passer les utilisateurs connectés ; sinon renvoie vers la connexion en mémorisant la page demandée. */
export function RequireAuth() {
  const { status, user, error, reload } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <SplashScreen />
  if (status === 'error') {
    return (
      <SplashScreen
        title="Serveur injoignable"
        message={error?.message ?? 'Impossible de contacter le serveur.'}
        actionLabel="Réessayer"
        onAction={() => void reload()}
      />
    )
  }
  if (!user) return <Navigate to={LOGIN_ROUTE} replace state={{ from: location.pathname + location.search }} />
  if (user.must_change_password && location.pathname !== PASSWORD_ROUTE) return <Navigate to={PASSWORD_ROUTE} replace />
  return <Outlet />
}

/** Routes réservées aux visiteurs (connexion) : un utilisateur déjà connecté est renvoyé à l'accueil. */
export function PublicOnly() {
  const { status, user } = useAuth()
  if (status === 'loading') return <SplashScreen />
  if (user) return <Navigate to={user.must_change_password ? PASSWORD_ROUTE : '/'} replace />
  return <Outlet />
}

/** Affiche « Accès refusé » si aucune des permissions n'est détenue. Le serveur refuse de toute façon. */
export function RequirePermission({ any, children }: { any: string[]; children: ReactNode }) {
  const { canAny } = useAuth()
  if (!canAny(...any)) return <ForbiddenPage />
  return <>{children}</>
}
