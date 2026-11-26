from datetime import timedelta

from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import UserManager as DjangoUserManager
from django.db import models
from django.utils import timezone

from .roles import Role, permissions_for


class UserManager(DjangoUserManager):
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault("role", Role.ADMIN)
        return super().create_superuser(username, email, password, **extra_fields)


class User(AbstractUser):
    """Utilisateur de Network Manager (nom complet unique, rôle applicatif)."""

    first_name = None  # type: ignore[assignment]
    last_name = None  # type: ignore[assignment]

    full_name = models.CharField("nom complet", max_length=150, blank=True)
    role = models.CharField("rôle", max_length=20, choices=Role.choices, default=Role.GUEST, db_index=True)
    must_change_password = models.BooleanField("doit changer son mot de passe", default=False)
    password_changed_at = models.DateTimeField(null=True, blank=True)
    failed_login_count = models.PositiveSmallIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    class Meta:
        ordering = ["username"]

    def __str__(self):
        return self.username

    def get_full_name(self):
        return self.full_name or self.username

    def get_short_name(self):
        return self.username

    def save(self, *args, **kwargs):
        # Le rôle Administrateur ouvre l'interface d'administration Django avec tous les droits ;
        # tout autre rôle n'y a pas accès (un administrateur rétrogradé perd donc aussi ce droit).
        self.is_superuser = self.role == Role.ADMIN
        self.is_staff = self.is_superuser
        super().save(*args, **kwargs)

    @property
    def is_locked(self) -> bool:
        return bool(self.locked_until and self.locked_until > timezone.now())

    def app_permissions(self) -> frozenset:
        return permissions_for(self.role) if self.is_active else frozenset()

    def has_app_perm(self, code: str) -> bool:
        return code in self.app_permissions()

    def register_failed_login(self, max_attempts: int, lock_minutes: int) -> bool:
        """Compte un échec ; renvoie True si le compte vient d'être verrouillé."""
        self.failed_login_count += 1
        locked = self.failed_login_count >= max_attempts
        if locked:
            self.locked_until = timezone.now() + timedelta(minutes=lock_minutes)
            self.failed_login_count = 0
        self.save(update_fields=["failed_login_count", "locked_until"])
        return locked

    def reset_login_failures(self):
        if self.failed_login_count or self.locked_until:
            self.failed_login_count = 0
            self.locked_until = None
            self.save(update_fields=["failed_login_count", "locked_until"])


class AuditAction(models.TextChoices):
    LOGIN = "login", "Connexion"
    LOGIN_FAILED = "login_failed", "Échec de connexion"
    LOCKOUT = "lockout", "Verrouillage du compte"
    LOGOUT = "logout", "Déconnexion"
    PASSWORD_CHANGE = "password_change", "Changement de mot de passe"
    PASSWORD_RESET = "password_reset", "Réinitialisation du mot de passe"
    CREATE = "create", "Création"
    UPDATE = "update", "Modification"
    DELETE = "delete", "Suppression"
    VIEW = "view", "Consultation"
    EXPORT = "export", "Export"
    REMOTE_ACTION = "remote_action", "Action distante"


class AuditLog(models.Model):
    """Journal d'audit. Une ligne n'est jamais modifiée ni supprimée depuis l'application."""

    user = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="audit_logs")
    username = models.CharField(max_length=150, blank=True)  # copie : survit à la suppression du compte
    action = models.CharField(max_length=20, choices=AuditAction.choices, db_index=True)
    object_type = models.CharField(max_length=50, blank=True)
    object_id = models.CharField(max_length=50, blank=True)
    detail = models.TextField(blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.created_at:%Y-%m-%d %H:%M} {self.username} {self.action}"

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValueError("Une entrée du journal d'audit n'est pas modifiable.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Une entrée du journal d'audit n'est pas supprimable.")
