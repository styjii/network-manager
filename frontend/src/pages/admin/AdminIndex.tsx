import { Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { ADMIN_NAV } from '../../lib/nav'
import { ForbiddenPage } from '../ForbiddenPage'

/** /admin mène à la première page d'administration que le rôle peut ouvrir. */
export function AdminIndex() {
  const { canAny } = useAuth()
  const first = ADMIN_NAV.find((i) => canAny(...i.any))
  return first ? <Navigate to={first.to} replace /> : <ForbiddenPage />
}
