export type Role = 'admin' | 'supervisor' | 'operator' | 'developer' | 'guest'

export interface User {
  id: number
  username: string
  full_name: string
  email: string
  role: Role
  role_label: string
  is_active: boolean
  last_login: string | null
  created_at: string
  must_change_password: boolean
}

export interface Me extends User {
  permissions: string[]
}

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface RoleStat {
  role: Role
  label: string
  count: number
  percent: number
}

export interface UserStats {
  total: number
  admins: number
  admins_percent: number
  active: number
  active_percent: number
  connections_24h: number
  roles: RoleStat[]
}

export interface RoleInfo {
  role: Role
  label: string
  description: string
  user_count: number
  permissions: string[]
}

export type AuditActionCode =
  | 'login'
  | 'login_failed'
  | 'lockout'
  | 'logout'
  | 'password_change'
  | 'password_reset'
  | 'create'
  | 'update'
  | 'delete'
  | 'view'
  | 'export'
  | 'remote_action'

export interface AuditLog {
  id: number
  created_at: string
  username: string
  action: AuditActionCode
  action_label: string
  object_type: string
  object_id: string
  detail: string
  ip: string | null
}

export interface UserCreated extends User {
  temporary_password: string
}
