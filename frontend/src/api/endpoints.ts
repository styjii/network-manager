import { api, setCsrfToken } from './client'
import type { AuditLog, Me, Paginated, RoleInfo, User, UserCreated, UserStats } from './types'

export interface UserFilters {
  q?: string
  role?: string
  is_active?: string
  page?: number
  page_size?: number
}

export interface AuditFilters {
  q?: string
  action?: string
  username?: string
  date_from?: string
  date_to?: string
  page?: number
  page_size?: number
}

export interface NewUser {
  username: string
  full_name: string
  email: string
  role: string
  is_active: boolean
  password?: string
}

export interface UserPatch {
  full_name?: string
  email?: string
  role?: string
  is_active?: boolean
}

export const authApi = {
  me: () => api<Me>('/auth/me', { silent401: true }),
  async login(username: string, password: string): Promise<Me> {
    const res = await api<Me & { csrfToken: string }>('/auth/login', { method: 'POST', body: { username, password }, silent401: true })
    const { csrfToken, ...me } = res
    setCsrfToken(csrfToken) // le jeton change à la connexion
    return me
  },
  logout: () => api('/auth/logout', { method: 'POST' }),
  changePassword: (current_password: string, new_password: string) =>
    api('/auth/change-password', { method: 'POST', body: { current_password, new_password } }),
}

export const usersApi = {
  list: (filters: UserFilters) => api<Paginated<User>>('/users', { query: { ...filters } }),
  stats: () => api<UserStats>('/users/stats'),
  create: (data: NewUser) => api<UserCreated>('/users', { method: 'POST', body: data }),
  update: (id: number, data: UserPatch) => api<User>(`/users/${id}`, { method: 'PATCH', body: data }),
  remove: (id: number) => api(`/users/${id}`, { method: 'DELETE' }),
  resetPassword: (id: number) => api<{ temporary_password: string }>(`/users/${id}/reset-password`, { method: 'POST' }),
}

export const rolesApi = {
  list: () => api<RoleInfo[]>('/roles'),
}

export const auditApi = {
  list: (filters: AuditFilters) => api<Paginated<AuditLog>>('/audit-logs', { query: { ...filters } }),
}
