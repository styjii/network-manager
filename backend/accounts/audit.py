import ipaddress

from django.conf import settings

from .models import AuditLog


def client_ip(request):
    """Adresse du client. X-Forwarded-For n'est lu que si la requête vient d'un proxy de confiance."""
    remote = request.META.get("REMOTE_ADDR") or ""
    trusted = set(getattr(settings, "NM_TRUSTED_PROXIES", []))
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if remote in trusted and forwarded:
        # On remonte la chaîne depuis la droite et on garde la première adresse non fiable.
        for candidate in reversed([p.strip() for p in forwarded.split(",") if p.strip()]):
            if candidate not in trusted:
                remote = candidate
                break
    try:
        return str(ipaddress.ip_address(remote))
    except ValueError:
        return None


def record(request, action, *, user=None, username="", object_type="", object_id="", detail=""):
    actor = user if user is not None else getattr(request, "user", None)
    if actor is not None and not getattr(actor, "is_authenticated", False):
        actor = None
    return AuditLog.objects.create(
        user=actor,
        username=(actor.username if actor else username)[:150],
        action=action,
        object_type=object_type,
        object_id=str(object_id),
        detail=str(detail)[:2000],
        ip=client_ip(request),
        user_agent=(request.META.get("HTTP_USER_AGENT") or "")[:300],
    )
