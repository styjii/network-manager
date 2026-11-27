/**
 * Client HTTP du backend Django (session + CSRF, erreurs {code, message, details}).
 * Toutes les requêtes partent vers /api/v1 sur la même origine que l'application.
 */
export const API_BASE = '/api/v1'

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export class ApiError extends Error {
  status: number
  code: string
  details: unknown
  retryAfter: number | null

  constructor(status: number, code: string, message: string, details: unknown = {}, retryAfter: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
    this.retryAfter = retryAfter
  }

  /** Le serveur est injoignable ou en panne (et non une réponse métier). */
  get isConnectivity(): boolean {
    return this.status === 0 || this.status >= 500
  }
}

// --- CSRF -----------------------------------------------------------------

let csrfToken: string | null = null

export function setCsrfToken(token: string | null): void {
  csrfToken = token
}

function readCookie(name: string): string | null {
  for (const part of document.cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

async function fetchCsrf(): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/csrf`, { credentials: 'same-origin' })
  if (!res.ok) throw new ApiError(res.status, 'csrf_unavailable', 'Impossible d’obtenir le jeton de sécurité.')
  const data = (await res.json()) as { csrfToken: string }
  csrfToken = data.csrfToken
  return csrfToken
}

async function getCsrf(force: boolean): Promise<string> {
  if (!force) {
    // Le cookie est toujours le plus récent (Django le renouvelle à la connexion).
    const cookie = readCookie('csrftoken')
    if (cookie) return cookie
    if (csrfToken) return csrfToken
  }
  return fetchCsrf()
}

// --- Abonnement aux 401 (session expirée) ---------------------------------

type Listener = () => void
const unauthorizedListeners = new Set<Listener>()

export function onUnauthorized(listener: Listener): () => void {
  unauthorizedListeners.add(listener)
  return () => unauthorizedListeners.delete(listener)
}

// --- Requête ---------------------------------------------------------------

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | boolean | null | undefined>
  signal?: AbortSignal
  /** Ne pas déclencher la déconnexion globale sur un 401 (connexion, auth/me). */
  silent401?: boolean
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${API_BASE}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined
  const type = res.headers.get('content-type') ?? ''
  if (type.includes('application/json')) {
    try {
      return await res.json()
    } catch {
      return undefined
    }
  }
  return undefined
}

function toApiError(res: Response, body: unknown): ApiError {
  const retryHeader = res.headers.get('retry-after')
  const retryAfter = retryHeader && !Number.isNaN(Number(retryHeader)) ? Number(retryHeader) : null
  if (body && typeof body === 'object' && 'code' in body && 'message' in body) {
    const b = body as { code: string; message: string; details?: unknown }
    let message = b.message
    if (res.status === 429) {
      message = retryAfter
        ? `Trop de tentatives. Réessayez dans ${retryAfter} s.`
        : 'Trop de tentatives. Patientez un instant avant de réessayer.'
    }
    return new ApiError(res.status, b.code, message, b.details ?? {}, retryAfter)
  }
  if (res.status >= 500) {
    return new ApiError(res.status, 'server_error', `Le serveur est indisponible (HTTP ${res.status}).`)
  }
  return new ApiError(res.status, 'error', `Erreur inattendue (HTTP ${res.status}).`)
}

function isCsrfFailure(err: ApiError): boolean {
  return err.status === 403 && /csrf/i.test(err.message)
}

export async function api<T = void>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const unsafe = UNSAFE.has(method)

  const send = async (forceCsrf: boolean): Promise<Response> => {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (options.body !== undefined) headers['Content-Type'] = 'application/json'
    if (unsafe) headers['X-CSRFToken'] = await getCsrf(forceCsrf)
    try {
      return await fetch(buildUrl(path, options.query), {
        method,
        headers,
        credentials: 'same-origin',
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: options.signal,
      })
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
      throw new ApiError(0, 'network_error', 'Impossible de joindre le serveur. Vérifiez la connexion réseau.')
    }
  }

  let res = await send(false)
  let body = await parseBody(res)

  if (!res.ok && unsafe) {
    const err = toApiError(res, body)
    if (isCsrfFailure(err)) {
      // Jeton périmé (cookie renouvelé, session recréée) : un seul nouvel essai.
      res = await send(true)
      body = await parseBody(res)
    }
  }

  if (!res.ok) {
    const err = toApiError(res, body)
    if (err.status === 401 && !options.silent401) unauthorizedListeners.forEach((fn) => fn())
    throw err
  }
  return body as T
}

// --- Erreurs de validation --------------------------------------------------

export interface ParsedValidation {
  fields: Record<string, string>
  global: string[]
}

function flatten(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(flatten)
  if (value && typeof value === 'object') return Object.values(value).flatMap(flatten)
  return []
}

/** Transforme `details` (DRF) en messages par champ et messages généraux. */
export function parseValidation(err: unknown): ParsedValidation {
  const out: ParsedValidation = { fields: {}, global: [] }
  if (!(err instanceof ApiError)) return out
  const d = err.details
  if (Array.isArray(d)) {
    out.global.push(...flatten(d))
  } else if (d && typeof d === 'object') {
    for (const [key, value] of Object.entries(d)) {
      const messages = flatten(value)
      if (!messages.length) continue
      if (key === 'non_field_errors' || key === 'detail') out.global.push(...messages)
      else out.fields[key] = messages.join(' ')
    }
  }
  if (!out.global.length && !Object.keys(out.fields).length && err.status !== 0) out.global.push(err.message)
  return out
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'validation_error') {
      const { fields, global } = parseValidation(err)
      return [...global, ...Object.values(fields)].join(' ') || err.message
    }
    return err.message
  }
  return 'Une erreur inattendue est survenue.'
}
