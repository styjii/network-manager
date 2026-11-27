import { describe, expect, it, vi } from 'vitest'
import { api, ApiError, parseValidation, setCsrfToken } from '../api/client'
import { csrfHandler, err, mockApi, ok } from './utils'

describe('client HTTP', () => {
  it('ajoute le jeton CSRF aux requêtes d’écriture et pas aux lectures', async () => {
    setCsrfToken(null)
    const mock = mockApi({ 'GET /auth/csrf': csrfHandler, 'POST /x': () => ok({ done: true }), 'GET /y': () => ok([]) })
    await api('/y')
    await api('/x', { method: 'POST', body: { a: 1 } })
    const get = mock.calls.find((c) => c.path === '/y')!
    const post = mock.calls.find((c) => c.path === '/x')!
    expect(get.headers.get('X-CSRFToken')).toBeNull()
    expect(post.headers.get('X-CSRFToken')).toBe('tok-1')
    expect(post.body).toEqual({ a: 1 })
  })

  it('relit le cookie csrftoken quand il existe (jeton renouvelé à la connexion)', async () => {
    document.cookie = 'csrftoken=cookie-token; path=/'
    const mock = mockApi({ 'POST /x': () => ok({}) })
    await api('/x', { method: 'POST' })
    expect(mock.calls[0].headers.get('X-CSRFToken')).toBe('cookie-token')
    expect(mock.calls.some((c) => c.path === '/auth/csrf')).toBe(false)
  })

  it('refait une seule fois la requête après un échec CSRF', async () => {
    setCsrfToken('vieux')
    let attempts = 0
    const mock = mockApi({
      'GET /auth/csrf': csrfHandler,
      'POST /x': ({ headers }) => {
        attempts++
        return headers.get('X-CSRFToken') === 'tok-1' ? ok({ done: true }) : err(403, 'permission_denied', 'CSRF Failed: CSRF token missing.')
      },
    })
    await expect(api('/x', { method: 'POST' })).resolves.toEqual({ done: true })
    expect(attempts).toBe(2)
    expect(mock.calls.filter((c) => c.path === '/auth/csrf')).toHaveLength(1)
  })

  it('transforme les erreurs {code, message, details} en ApiError', async () => {
    mockApi({ 'GET /a': () => err(400, 'validation_error', 'Données invalides.', { username: ['Déjà pris.'] }) })
    const e = await api('/a').catch((x: unknown) => x)
    expect(e).toBeInstanceOf(ApiError)
    expect((e as ApiError).code).toBe('validation_error')
    expect(parseValidation(e).fields).toEqual({ username: 'Déjà pris.' })
  })

  it('range les erreurs sans champ (liste ou non_field_errors) dans les messages généraux', () => {
    const list = new ApiError(400, 'validation_error', 'x', ['Le dernier administrateur actif ne peut pas être supprimé.'])
    const nf = new ApiError(400, 'validation_error', 'x', { non_field_errors: ['Interdit.'], email: ['Invalide.'] })
    expect(parseValidation(list).global).toEqual(['Le dernier administrateur actif ne peut pas être supprimé.'])
    expect(parseValidation(nf)).toEqual({ fields: { email: 'Invalide.' }, global: ['Interdit.'] })
  })

  it('signale un serveur injoignable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const e = (await api('/a').catch((x: unknown) => x)) as ApiError
    expect(e.status).toBe(0)
    expect(e.isConnectivity).toBe(true)
  })

  it('affiche le délai d’attente d’une limitation de débit (429)', async () => {
    mockApi({ 'GET /a': () => ({ status: 429, body: { code: 'throttled', message: 'Request was throttled.', details: {} }, headers: { 'Retry-After': '42' } }) })
    const e = (await api('/a').catch((x: unknown) => x)) as ApiError
    expect(e.message).toBe('Trop de tentatives. Réessayez dans 42 s.')
  })
})
