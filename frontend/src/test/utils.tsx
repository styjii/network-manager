import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { setCsrfToken } from '../api/client'
import type { Me } from '../api/types'
import App from '../App'
import { AuthProvider } from '../auth/AuthProvider'
import { ToastProvider } from '../components/ui/ToastProvider'
import { ThemeProvider } from '../theme/ThemeProvider'

export const ROLE_PERMS: Record<string, string[]> = {
  admin: [
    'dashboard.view', 'machines.view', 'machines.manage', 'services.view', 'servers.view', 'alerts.view', 'history.view',
    'settings.view', 'users.view', 'users.manage', 'audit.view', 'backups.view',
  ],
  guest: ['dashboard.view', 'machines.view', 'services.view', 'servers.view', 'alerts.view'],
}

export function makeMe(over: Partial<Me> = {}): Me {
  const role = over.role ?? 'admin'
  return {
    id: 1,
    username: 'admin',
    full_name: 'Administrateur',
    email: 'admin@mon-reseau.local',
    role,
    role_label: role === 'admin' ? 'Administrateur' : 'Invité',
    is_active: true,
    last_login: '2026-11-23T12:42:00Z',
    created_at: '2026-11-01T08:00:00Z',
    must_change_password: false,
    permissions: ROLE_PERMS[role] ?? [],
    ...over,
  }
}

export type Handler = (req: { url: URL; method: string; body: unknown; headers: Headers }) => { status?: number; body?: unknown; headers?: Record<string, string> } | undefined

export interface MockApi {
  calls: { method: string; path: string; body: unknown; headers: Headers }[]
  set: (key: string, handler: Handler) => void
}

/** Remplace fetch : les clés ont la forme « GET /auth/me » (chemin sans le préfixe /api/v1). */
export function mockApi(handlers: Record<string, Handler>): MockApi {
  const table = new Map(Object.entries(handlers))
  const calls: MockApi['calls'] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost')
      const method = (init?.method ?? 'GET').toUpperCase()
      const path = url.pathname.replace('/api/v1', '')
      const headers = new Headers(init?.headers)
      const body = init?.body ? JSON.parse(String(init.body)) : undefined
      calls.push({ method, path, body, headers })
      const handler = table.get(`${method} ${path}`)
      const out = handler?.({ url, method, body, headers }) ?? { status: 404, body: { code: 'not_found', message: 'Introuvable.', details: {} } }
      const status = out.status ?? 200
      const hasBody = status !== 204 && out.body !== undefined
      return new Response(hasBody ? JSON.stringify(out.body) : null, {
        status,
        headers: { ...(hasBody ? { 'content-type': 'application/json' } : {}), ...out.headers },
      })
    }),
  )
  return { calls, set: (k, h) => void table.set(k, h) }
}

export const ok = (body: unknown, status = 200) => ({ status, body })
export const err = (status: number, code: string, message: string, details: unknown = {}) => ({ status, body: { code, message, details } })

export function renderApp(route = '/') {
  setCsrfToken(null)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchInterval: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[route]}>
          <ToastProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ToastProvider>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

export const csrfHandler: Handler = () => ok({ csrfToken: 'tok-1' })
