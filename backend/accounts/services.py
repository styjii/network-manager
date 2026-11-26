import secrets
import string

from django.contrib.sessions.models import Session
from django.utils import timezone

from .models import User
from .roles import Role


def generate_password(length: int = 16) -> str:
    alphabet = string.ascii_letters + string.digits + "-_.!#"
    while True:
        pwd = "".join(secrets.choice(alphabet) for _ in range(length))
        if any(c.islower() for c in pwd) and any(c.isupper() for c in pwd) and any(c.isdigit() for c in pwd):
            return pwd


def is_last_active_admin(user: User) -> bool:
    return (
        user.role == Role.ADMIN
        and user.is_active
        and not User.objects.filter(role=Role.ADMIN, is_active=True).exclude(pk=user.pk).exists()
    )


def terminate_sessions(user: User, keep_session_key: str | None = None) -> int:
    """Ferme toutes les sessions ouvertes d'un utilisateur (rôle modifié, compte désactivé, mot de passe réinitialisé)."""
    closed = 0
    for session in Session.objects.filter(expire_date__gt=timezone.now()):
        if session.session_key == keep_session_key:
            continue
        if session.get_decoded().get("_auth_user_id") == str(user.pk):
            session.delete()
            closed += 1
    return closed
