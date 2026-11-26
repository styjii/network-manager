# Network Manager : backend, app `accounts`

Comptes, rôles, permissions, authentification par session et journal d'audit.

## Installation

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # puis adapter, et exporter : set -a; source .env; set +a
python manage.py migrate
python manage.py seed_users     # affiche UNE fois les mots de passe générés
python manage.py runserver 0.0.0.0:8100
python manage.py test apps.accounts
```

En développement : `export DJANGO_DEBUG=1` (clé secrète de secours, cookies non sécurisés, admin Django sur /django-admin/).
Sur le réseau local en HTTP : `NM_HTTPS=0`, et renseigner `DJANGO_ALLOWED_HOSTS` et `DJANGO_CSRF_TRUSTED_ORIGINS`
(par exemple `http://192.168.43.45:8090`) pour éviter les erreurs CSRF hors localhost.

## Comptes créés par `seed_users` (maquette Administration)

| Utilisateur | Nom complet | Rôle | Statut |
|---|---|---|---|
| admin | Administrateur | Administrateur | Actif |
| styjii | Tojo Randrianarison | Superviseur | Actif |
| operator | Opérateur Réseau | Opérateur | Actif |
| guest | Invité | Invité | Inactif |
| dev | Développeur | Développeur | Actif |

Chaque mot de passe est aléatoire (16 caractères) et doit être changé à la première connexion.
`--password X` impose un mot de passe commun (développement seulement), `--update` met à jour les comptes existants.

## API (préfixe /api/v1/)

| Méthode et chemin | Permission | Rôle de la route |
|---|---|---|
| GET auth/csrf | publique | Pose le cookie CSRF, renvoie le jeton |
| POST auth/login | publique (CSRF exigé) | Connexion ; renvoie le profil, les permissions et le nouveau jeton CSRF |
| POST auth/logout | connecté | Déconnexion |
| GET auth/me | connecté | Profil et liste des permissions |
| POST auth/change-password | connecté | Changement de mot de passe (current_password, new_password) |
| GET users, GET users/{id} | users.view | Liste paginée (filtres q, role, is_active), détail |
| POST users | users.manage | Création ; renvoie `temporary_password` une seule fois |
| PATCH users/{id} | users.manage | Nom, e-mail, rôle, statut |
| DELETE users/{id} | users.manage | Suppression |
| POST users/{id}/reset-password | users.manage | Nouveau mot de passe temporaire, sessions fermées |
| GET users/stats | users.view | Cartes et répartition des rôles de la page Administration |
| GET roles | users.view | Rôles, descriptions, permissions, effectifs |
| GET audit-logs | audit.view | Journal (filtres action, username, q, date_from, date_to ; page_size) |

Les erreurs ont toujours la forme `{"code", "message", "details"}`. Code `password_change_required` : rediriger vers l'écran de changement de mot de passe.
Après la connexion, le jeton CSRF change : le frontend doit utiliser le `csrfToken` renvoyé par `auth/login` pour les requêtes suivantes.

## Matrice des rôles

Définie une seule fois dans `apps/accounts/roles.py`. Le frontend lit `permissions` dans `auth/me`
et masque les boutons en conséquence ; le backend refuse de toute façon (toute vue sans permission déclarée est fermée par défaut).

| Permission | Admin | Superviseur | Opérateur | Développeur | Invité |
|---|---|---|---|---|---|
| dashboard, machines, services, servers, alerts : view | oui | oui | oui | oui | oui |
| machines, services, servers : manage | oui | oui | non | non | non |
| alerts.respond (acquitter, résoudre) | oui | oui | oui | non | non |
| alerts.manage (règles) | oui | oui | non | non | non |
| servers.test, servers.logs | oui | oui | non | oui | non |
| servers.restart | oui | non | non | non | non |
| history.view | oui | oui | oui | oui | non |
| history.export | oui | oui | non | non | non |
| settings.view, settings.monitoring | oui | oui | non | non | non |
| settings.edit | oui | non | non | non | non |
| users.view, users.manage | oui | non | non | non | non |
| audit.view | oui | oui | non | non | non |
| backups.view | oui | oui | non | non | non |
| backups.manage | oui | non | non | non | non |
| api.docs | oui | non | non | oui | non |

## Règles de sécurité appliquées

- Mots de passe hachés avec Argon2, minimum 10 caractères, validateurs Django.
- Verrouillage du compte après 5 échecs (15 min), limitation de débit de la connexion (10 par minute et par client), message d'erreur identique pour compte inconnu, inactif, verrouillé ou mot de passe faux.
- Session httpOnly, SameSite=Lax, Secure si HTTPS ; CSRF obligatoire, y compris sur la connexion.
- Impossible de changer son propre rôle, de se désactiver ou de se supprimer ; le dernier administrateur actif est protégé.
- Changement de rôle, désactivation ou réinitialisation : les sessions de l'utilisateur sont fermées.
- Journal d'audit en ajout seul ; adresse IP lue dans X-Forwarded-For uniquement si la requête vient d'un proxy déclaré dans NM_TRUSTED_PROXIES.
- Mot de passe défini par un administrateur : toujours temporaire (must_change_password).

## Suite logique

Écran de connexion et garde de routes React (lecture de `permissions`), puis app `inventory` (machines, services).
