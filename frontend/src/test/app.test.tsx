import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Paginated, User, UserStats } from '../api/types'
import { csrfHandler, err, makeMe, mockApi, ok, renderApp } from './utils'

const unauth = () => err(401, 'not_authenticated', 'Informations d’authentification non fournies.')

function user(over: Partial<User> = {}): User {
  return {
    id: 2, username: 'styjii', full_name: 'Tojo Randrianarison', email: '', role: 'supervisor', role_label: 'Superviseur',
    is_active: true, last_login: '2026-11-23T11:20:00Z', created_at: '2026-11-01T08:00:00Z', must_change_password: false, ...over,
  }
}
const page = (results: User[]): Paginated<User> => ({ count: results.length, next: null, previous: null, results })
const stats: UserStats = {
  total: 2, admins: 1, admins_percent: 50, active: 2, active_percent: 100, connections_24h: 4,
  roles: [
    { role: 'admin', label: 'Administrateur', count: 1, percent: 50 },
    { role: 'supervisor', label: 'Superviseur', count: 1, percent: 50 },
    { role: 'operator', label: 'Opérateur', count: 0, percent: 0 },
    { role: 'developer', label: 'Développeur', count: 0, percent: 0 },
    { role: 'guest', label: 'Invité', count: 0, percent: 0 },
  ],
}
const adminUser = user({ id: 1, username: 'admin', full_name: 'Administrateur', role: 'admin', role_label: 'Administrateur' })

describe('connexion', () => {
  it('redirige un visiteur vers la page de connexion', async () => {
    mockApi({ 'GET /auth/me': unauth })
    renderApp('/admin/utilisateurs')
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
  })

  it('refuse un formulaire vide sans appeler le serveur', async () => {
    const mock = mockApi({ 'GET /auth/me': unauth })
    renderApp('/connexion')
    await userEvent.click(await screen.findByRole('button', { name: 'Se connecter' }))
    expect(await screen.findByText('Saisissez votre nom d’utilisateur.')).toBeInTheDocument()
    expect(screen.getByText('Saisissez votre mot de passe.')).toBeInTheDocument()
    expect(mock.calls.some((c) => c.path === '/auth/login')).toBe(false)
  })

  it('affiche le message du serveur pour des identifiants invalides', async () => {
    mockApi({
      'GET /auth/me': unauth,
      'GET /auth/csrf': csrfHandler,
      'POST /auth/login': () => err(401, 'invalid_credentials', 'Identifiants invalides ou compte indisponible.'),
    })
    renderApp('/connexion')
    await userEvent.type(await screen.findByLabelText('Nom d’utilisateur'), 'admin')
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'faux')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Identifiants invalides ou compte indisponible.')
  })

  it('connecte l’utilisateur et ouvre le tableau de bord', async () => {
    const me = makeMe()
    const mock = mockApi({
      'GET /auth/me': unauth,
      'GET /auth/csrf': csrfHandler,
      'POST /auth/login': () => ok({ ...me, csrfToken: 'tok-2' }),
    })
    renderApp('/connexion')
    await userEvent.type(await screen.findByLabelText('Nom d’utilisateur'), ' Admin ')
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'secret-12345')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))
    expect(await screen.findByRole('heading', { name: 'Tableau de bord' })).toBeInTheDocument()
    expect(mock.calls.find((c) => c.path === '/auth/login')!.body).toEqual({ username: 'Admin', password: 'secret-12345' })
  })

  it('impose le changement de mot de passe temporaire avant tout le reste', async () => {
    mockApi({ 'GET /auth/me': () => ok(makeMe({ must_change_password: true })) })
    renderApp('/admin/utilisateurs')
    expect(await screen.findByRole('heading', { name: 'Choisissez un nouveau mot de passe' })).toBeInTheDocument()
  })
})

describe('droits', () => {
  it('masque les entrées de menu interdites et refuse l’accès direct', async () => {
    mockApi({ 'GET /auth/me': () => ok(makeMe({ role: 'guest', username: 'guest', full_name: 'Invité' })) })
    renderApp('/admin/utilisateurs')
    expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' })
    expect(within(nav).queryByText('Admin')).not.toBeInTheDocument()
    expect(within(nav).queryByText('Paramètres')).not.toBeInTheDocument()
    expect(within(nav).getByText('Machines')).toBeInTheDocument()
  })
})

describe('administration des utilisateurs', () => {
  function setup(extra: Record<string, Parameters<typeof mockApi>[0][string]> = {}) {
    return mockApi({
      'GET /auth/me': () => ok(makeMe()),
      'GET /auth/csrf': csrfHandler,
      'GET /users': () => ok(page([adminUser, user()])),
      'GET /users/stats': () => ok(stats),
      'GET /audit-logs': () => ok({ count: 0, next: null, previous: null, results: [] }),
      ...extra,
    })
  }

  it('affiche les cartes, la liste et protège son propre compte', async () => {
    setup()
    renderApp('/admin/utilisateurs')
    const row = (await screen.findByText('styjii')).closest('tr')!
    expect(within(row).getByText('Superviseur')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Supprimer admin' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Supprimer styjii' })).toBeEnabled()
    expect(screen.getByText('Connexions (24 h)')).toBeInTheDocument()
    expect(await screen.findByText('Affichage de 1 à 2 sur 2 utilisateurs')).toBeInTheDocument()
  })

  it('crée un compte et montre le mot de passe temporaire une seule fois', async () => {
    const mock = setup({
      'POST /users': ({ body }) => ok({ ...user({ id: 9, username: (body as { username: string }).username, role: 'operator', role_label: 'Opérateur' }), temporary_password: 'Tmp-Pass-123456' }, 201),
    })
    renderApp('/admin/utilisateurs')
    await userEvent.click(await screen.findByRole('button', { name: /Nouvel utilisateur/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Nom d’utilisateur'), 'Nouveau')
    await userEvent.selectOptions(within(dialog).getByLabelText('Rôle'), 'operator')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Créer le compte' }))
    expect(await screen.findByTestId('temporary-password')).toHaveTextContent('Tmp-Pass-123456')
    const post = mock.calls.find((c) => c.method === 'POST' && c.path === '/users')!
    expect(post.body).toMatchObject({ username: 'nouveau', role: 'operator', is_active: true })
    expect(post.headers.get('X-CSRFToken')).toBeTruthy()
  })

  it('valide le nom d’utilisateur côté client puis affiche les erreurs du serveur sous le champ', async () => {
    setup({ 'POST /users': () => err(400, 'validation_error', 'Données invalides.', { username: ['Ce nom d’utilisateur existe déjà.'] }) })
    renderApp('/admin/utilisateurs')
    await userEvent.click(await screen.findByRole('button', { name: /Nouvel utilisateur/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Nom d’utilisateur'), 'a b')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Créer le compte' }))
    expect(await within(dialog).findByText(/3 à 30 caractères/)).toBeInTheDocument()
    await userEvent.clear(within(dialog).getByLabelText('Nom d’utilisateur'))
    await userEvent.type(within(dialog).getByLabelText('Nom d’utilisateur'), 'styjii')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Créer le compte' }))
    expect(await within(dialog).findByText('Ce nom d’utilisateur existe déjà.')).toBeInTheDocument()
  })

  it('supprime après confirmation et signale un refus du serveur', async () => {
    let calls = 0
    setup({
      'DELETE /users/2': () => {
        calls++
        return err(400, 'validation_error', 'Données invalides.', ['Le dernier administrateur actif ne peut pas être supprimé.'])
      },
    })
    renderApp('/admin/utilisateurs')
    await userEvent.click(await screen.findByRole('button', { name: 'Supprimer styjii' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/sera supprimé définitivement/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Supprimer' }))
    await waitFor(() => expect(calls).toBe(1))
    expect(await screen.findByText(/dernier administrateur actif/)).toBeInTheDocument()
  })

  it('déconnecte proprement quand la session expire', async () => {
    let expired = false
    setup({ 'GET /users': () => (expired ? unauth() : ok(page([adminUser, user()]))) })
    renderApp('/admin/utilisateurs')
    await screen.findByText('styjii')
    expired = true
    mockApi({ 'GET /auth/me': unauth, 'GET /users': unauth, 'GET /users/stats': unauth, 'GET /audit-logs': unauth })
    await userEvent.click(screen.getByRole('button', { name: 'Actualiser les données' }))
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
  })
})
