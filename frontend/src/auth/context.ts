import { createContext, useContext } from 'react'
import type { Me } from '../api/types'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'error'

export interface AuthValue {
  status: AuthStatus
  user: Me | null
  error: Error | null
  /** Vrai si l'utilisateur détient la permission (le serveur reste l'autorité). */
  can: (permission: string) => boolean
  canAny: (...permissions: string[]) => boolean
  login: (username: string, password: string) => Promise<Me>
  logout: () => Promise<void>
  reload: () => Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>.')
  return ctx
}
