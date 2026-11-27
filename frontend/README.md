# Network Monitor : frontend React

Interface de l'application `accounts` (connexion, comptes, rôles, journal d'audit) : React 19, TypeScript, Vite,
React Router, TanStack Query, React Hook Form + Zod. Thème sombre par défaut, thème clair disponible.

## Démarrage

```bash
# 1. Backend (dans backend/, avec un .env copié depuis .env.example)
python manage.py migrate
python manage.py seed_users --password 'MotDePasseSolide!'
python manage.py runserver 127.0.0.1:8100

# 2. Frontend (dans frontend/)
npm install
npm run dev          # http://localhost:5173, ajouter --host pour le réseau local
```

Vite relaie `/api` vers `http://127.0.0.1:8100` (variable `VITE_API_PROXY`). Le navigateur ne parle qu'à une seule origine :
cookie de session et jeton CSRF fonctionnent sans CORS et sans `DJANGO_CSRF_TRUSTED_ORIGINS`.
Pour accéder depuis le réseau local, ajouter l'IP du poste à `DJANGO_ALLOWED_HOSTS`.

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` | vérification TypeScript + build dans `dist/` |
| `npm test` | tests Vitest (client HTTP, connexion, droits, gestion des utilisateurs) |
| `npm run lint` | ESLint |

Production : servir `dist/` avec Nginx et relayer `/api` (voir `deploy/nginx.conf`).

## Pages branchées sur l'API `accounts`

| Page | Route | Permission | API |
| --- | --- | --- | --- |
| Connexion | `/connexion` | aucune | `POST /auth/login`, `GET /auth/csrf` |
| Mot de passe temporaire | `/changer-mot-de-passe` | connecté | `POST /auth/change-password` |
| Mon compte | `/compte` | connecté | `GET /auth/me`, `POST /auth/change-password` |
| Administration, utilisateurs | `/admin/utilisateurs` | `users.view` (actions : `users.manage`) | `/users`, `/users/stats`, `/users/{id}/reset-password`, `/audit-logs` |
| Rôles et permissions | `/admin/roles` | `users.view` | `GET /roles` |
| Journal d'audit | `/admin/audit` | `audit.view` | `GET /audit-logs` |

Les modules sans API côté Django (tableau de bord, machines, services, réseau, serveurs, alertes, historique, paramètres,
sauvegardes) ont leur route, leur entrée de menu et leur contrôle de droits ; ils affichent un état « non branché »
et aucune donnée de démonstration. Il suffira de remplacer le composant de page quand l'API existera.

## Organisation

```
src/api/         client HTTP (CSRF, erreurs {code,message,details}), endpoints, hooks TanStack Query
src/auth/        contexte d'authentification, gardes de routes
src/components/  layout (sidebar, topbar) et composants UI (modale, champs, badges, anneau…)
src/pages/       pages et formulaires (schémas Zod dans schemas.ts)
src/lib/         formats (dates en fuseau Indian/Antananarivo), libellés, navigation
src/styles/      jetons de design (sombre/clair) et feuilles CSS
```
