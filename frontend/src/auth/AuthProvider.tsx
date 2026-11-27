import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, type ReactNode } from 'react'
import { ApiError, onUnauthorized, setCsrfToken } from '../api/client'
import { authApi } from '../api/endpoints'
import type { Me } from '../api/types'
import { AuthContext, type AuthStatus, type AuthValue } from './context'

const ME_KEY = ['me'] as const

async function fetchMe(): Promise<Me | null> {
  try {
    return await authApi.me()
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null
    throw err
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ME_KEY,
    queryFn: fetchMe,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })

  // Une réponse 401 n'importe où signifie que la session a expiré.
  useEffect(
    () =>
      onUnauthorized(() => {
        qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' })
        qc.setQueryData(ME_KEY, null)
      }),
    [qc],
  )

  // Le serveur exige un changement de mot de passe (403 password_change_required) : on relit le profil.
  useEffect(() => {
    return qc.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'error') {
        const err = event.action.error
        if (err instanceof ApiError && err.code === 'password_change_required') void qc.invalidateQueries({ queryKey: ME_KEY })
      }
    })
  }, [qc])

  const login = useCallback(
    async (username: string, password: string) => {
      const me = await authApi.login(username.trim(), password)
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' })
      qc.setQueryData(ME_KEY, me)
      return me
    },
    [qc],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch (err) {
      // Une session déjà expirée (401) revient au même : l'utilisateur est bien déconnecté.
      if (!(err instanceof ApiError && err.status === 401)) throw err
    }
    setCsrfToken(null)
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' })
    qc.setQueryData(ME_KEY, null)
  }, [qc])

  const reload = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ME_KEY })
  }, [qc])

  const user = query.data ?? null
  const status: AuthStatus = query.isPending ? 'loading' : query.isError ? 'error' : user ? 'authenticated' : 'anonymous'

  const value = useMemo<AuthValue>(() => {
    const perms = new Set(user?.permissions ?? [])
    return {
      status,
      user,
      error: query.error,
      can: (p) => perms.has(p),
      canAny: (...ps) => ps.some((p) => perms.has(p)),
      login,
      logout,
      reload,
    }
  }, [status, user, query.error, login, logout, reload])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
