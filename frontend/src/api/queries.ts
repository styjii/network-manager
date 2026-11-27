import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { POLL_INTERVAL_MS } from '../lib/config'
import { auditApi, rolesApi, usersApi, type AuditFilters, type NewUser, type UserFilters, type UserPatch } from './endpoints'

export const keys = {
  users: (f: UserFilters) => ['users', 'list', f] as const,
  usersAll: ['users'] as const,
  stats: ['users', 'stats'] as const,
  roles: ['roles'] as const,
  audit: (f: AuditFilters) => ['audit', f] as const,
}

const poll = { refetchInterval: POLL_INTERVAL_MS, refetchIntervalInBackground: false } as const

export function useUsers(filters: UserFilters) {
  return useQuery({ queryKey: keys.users(filters), queryFn: () => usersApi.list(filters), placeholderData: keepPreviousData, ...poll })
}

export function useUserStats() {
  return useQuery({ queryKey: keys.stats, queryFn: usersApi.stats, ...poll })
}

export function useRoles() {
  return useQuery({ queryKey: keys.roles, queryFn: rolesApi.list, ...poll })
}

export function useAuditLogs(filters: AuditFilters, enabled = true) {
  return useQuery({ queryKey: keys.audit(filters), queryFn: () => auditApi.list(filters), placeholderData: keepPreviousData, enabled, ...poll })
}

/** Après toute modification de compte : liste, cartes, répartition des rôles et journal sont périmés. */
function useRefreshAccounts() {
  const qc = useQueryClient()
  return () => Promise.all([qc.invalidateQueries({ queryKey: keys.usersAll }), qc.invalidateQueries({ queryKey: keys.roles }), qc.invalidateQueries({ queryKey: ['audit'] })])
}

export function useCreateUser() {
  const refresh = useRefreshAccounts()
  return useMutation({ mutationFn: (data: NewUser) => usersApi.create(data), onSuccess: refresh })
}

export function useUpdateUser() {
  const refresh = useRefreshAccounts()
  return useMutation({ mutationFn: ({ id, data }: { id: number; data: UserPatch }) => usersApi.update(id, data), onSuccess: refresh })
}

export function useDeleteUser() {
  const refresh = useRefreshAccounts()
  return useMutation({ mutationFn: (id: number) => usersApi.remove(id), onSuccess: refresh })
}

export function useResetPassword() {
  const refresh = useRefreshAccounts()
  return useMutation({ mutationFn: (id: number) => usersApi.resetPassword(id), onSuccess: refresh })
}
