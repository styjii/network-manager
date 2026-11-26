"""Source unique de vérité pour les rôles et leurs permissions.

Le frontend reçoit la liste des permissions via GET /auth/me et n'a donc jamais
à dupliquer cette matrice. Le backend applique toujours les droits lui-même.
"""
from django.db import models


class Role(models.TextChoices):
    ADMIN = "admin", "Administrateur"
    SUPERVISOR = "supervisor", "Superviseur"
    OPERATOR = "operator", "Opérateur"
    DEVELOPER = "developer", "Développeur"
    GUEST = "guest", "Invité"


ROLE_DESCRIPTIONS = {
    Role.ADMIN: "Gère tout le système : utilisateurs, paramètres, sauvegardes, audit.",
    Role.SUPERVISOR: "Pilote la supervision : machines, services, alertes, seuils, notifications.",
    Role.OPERATOR: "Exploite au quotidien : acquitte et résout les alertes, lecture du reste.",
    Role.DEVELOPER: "Accès technique : lecture, journaux, documentation d'API, tests de serveurs.",
    Role.GUEST: "Consultation en lecture seule.",
}


class P:
    """Codes de permission (ressource.action)."""

    DASHBOARD_VIEW = "dashboard.view"
    MACHINES_VIEW = "machines.view"
    MACHINES_MANAGE = "machines.manage"
    SERVICES_VIEW = "services.view"
    SERVICES_MANAGE = "services.manage"
    SERVERS_VIEW = "servers.view"
    SERVERS_MANAGE = "servers.manage"
    SERVERS_TEST = "servers.test"
    SERVERS_LOGS = "servers.logs"
    SERVERS_RESTART = "servers.restart"
    ALERTS_VIEW = "alerts.view"
    ALERTS_RESPOND = "alerts.respond"  # acquitter / résoudre
    ALERTS_MANAGE = "alerts.manage"  # règles d'alerte
    HISTORY_VIEW = "history.view"
    HISTORY_EXPORT = "history.export"
    SETTINGS_VIEW = "settings.view"
    SETTINGS_MONITORING = "settings.monitoring"  # seuils, intervalles, notifications
    SETTINGS_EDIT = "settings.edit"  # tous les paramètres
    USERS_VIEW = "users.view"
    USERS_MANAGE = "users.manage"
    AUDIT_VIEW = "audit.view"
    BACKUPS_VIEW = "backups.view"
    BACKUPS_MANAGE = "backups.manage"
    API_DOCS = "api.docs"


ALL_PERMISSIONS = frozenset(v for k, v in vars(P).items() if not k.startswith("_"))

_READ_ONLY = {
    P.DASHBOARD_VIEW,
    P.MACHINES_VIEW,
    P.SERVICES_VIEW,
    P.SERVERS_VIEW,
    P.ALERTS_VIEW,
}

ROLE_PERMISSIONS: dict[str, frozenset[str]] = {
    Role.ADMIN: ALL_PERMISSIONS,
    Role.SUPERVISOR: frozenset(
        _READ_ONLY
        | {
            P.MACHINES_MANAGE,
            P.SERVICES_MANAGE,
            P.SERVERS_MANAGE,
            P.SERVERS_TEST,
            P.SERVERS_LOGS,
            P.ALERTS_RESPOND,
            P.ALERTS_MANAGE,
            P.HISTORY_VIEW,
            P.HISTORY_EXPORT,
            P.SETTINGS_VIEW,
            P.SETTINGS_MONITORING,
            P.AUDIT_VIEW,
            P.BACKUPS_VIEW,
        }
    ),
    Role.OPERATOR: frozenset(_READ_ONLY | {P.ALERTS_RESPOND, P.HISTORY_VIEW}),
    Role.DEVELOPER: frozenset(
        _READ_ONLY | {P.HISTORY_VIEW, P.SERVERS_TEST, P.SERVERS_LOGS, P.API_DOCS}
    ),
    Role.GUEST: frozenset(_READ_ONLY),
}


def permissions_for(role: str) -> frozenset:
    return ROLE_PERMISSIONS.get(role, frozenset())
