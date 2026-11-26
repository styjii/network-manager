from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.hashers import make_password
from django.db.models import Count, Q
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import mixins, status, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import action
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from . import audit
from .models import AuditAction, AuditLog, User
from .roles import ROLE_DESCRIPTIONS, ROLE_PERMISSIONS, P, Role
from .serializers import (
    AuditLogSerializer,
    ChangePasswordSerializer,
    LoginSerializer,
    MeSerializer,
    UserCreateSerializer,
    UserSerializer,
    UserUpdateSerializer,
)
from .services import generate_password, is_last_active_admin, terminate_sessions

INVALID_CREDENTIALS = "Identifiants invalides ou compte indisponible."


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    """Pose le cookie CSRF et renvoie le jeton à mettre dans l'en-tête X-CSRFToken."""

    public = True
    authentication_classes = []

    def get(self, request):
        return Response({"csrfToken": get_token(request)})


class LoginView(APIView):
    public = True
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def get_authenticate_header(self, request):
        return "Session"  # sans cela, DRF transformerait les 401 de cette vue en 403

    def post(self, request):
        SessionAuthentication().enforce_csrf(request)  # le formulaire de connexion est lui aussi protégé
        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        username, password = ser.validated_data["username"], ser.validated_data["password"]

        user = User.objects.filter(username__iexact=username).first()
        if user is None:
            make_password(password)  # même coût de calcul qu'un compte existant
            audit.record(request, AuditAction.LOGIN_FAILED, username=username[:150], detail="compte inconnu")
            raise AuthenticationFailed(INVALID_CREDENTIALS, code="invalid_credentials")
        if not user.is_active:
            audit.record(request, AuditAction.LOGIN_FAILED, user=user, detail="compte désactivé")
            raise AuthenticationFailed(INVALID_CREDENTIALS, code="invalid_credentials")
        if user.is_locked:
            audit.record(request, AuditAction.LOGIN_FAILED, user=user, detail="compte verrouillé")
            raise AuthenticationFailed(INVALID_CREDENTIALS, code="invalid_credentials")

        if authenticate(request, username=user.username, password=password) is None:
            locked = user.register_failed_login(settings.NM_LOGIN_MAX_ATTEMPTS, settings.NM_LOGIN_LOCK_MINUTES)
            audit.record(request, AuditAction.LOGIN_FAILED, user=user, detail="mot de passe incorrect")
            if locked:
                audit.record(request, AuditAction.LOCKOUT, user=user, detail=f"{settings.NM_LOGIN_LOCK_MINUTES} min")
            raise AuthenticationFailed(INVALID_CREDENTIALS, code="invalid_credentials")

        user.reset_login_failures()
        login(request, user)  # nouvelle session, mise à jour de last_login
        audit.record(request, AuditAction.LOGIN, user=user)
        # Django renouvelle le jeton CSRF à la connexion : le frontend doit utiliser celui-ci.
        return Response({**MeSerializer(user).data, "csrfToken": get_token(request)})


class LogoutView(APIView):
    authenticated_only = True
    allow_pending_password_change = True

    def post(self, request):
        audit.record(request, AuditAction.LOGOUT)
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    authenticated_only = True
    allow_pending_password_change = True

    def get(self, request):
        return Response(MeSerializer(request.user).data)


class ChangePasswordView(APIView):
    authenticated_only = True
    allow_pending_password_change = True
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        ser = ChangePasswordSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        user = request.user
        user.set_password(ser.validated_data["new_password"])
        user.must_change_password = False
        user.password_changed_at = timezone.now()
        user.save(update_fields=["password", "must_change_password", "password_changed_at"])
        update_session_auth_hash(request, user)  # la session courante reste valide
        terminate_sessions(user, keep_session_key=request.session.session_key)
        audit.record(request, AuditAction.PASSWORD_CHANGE)
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    ACTION_PERMS = {
        "list": P.USERS_VIEW, "retrieve": P.USERS_VIEW, "stats": P.USERS_VIEW,
        "create": P.USERS_MANAGE, "partial_update": P.USERS_MANAGE,
        "destroy": P.USERS_MANAGE, "reset_password": P.USERS_MANAGE,
    }

    def required_permission_for(self, request):
        return self.ACTION_PERMS.get(self.action or "")

    def get_queryset(self):
        qs = User.objects.all().order_by("username")
        p = self.request.query_params
        if q := p.get("q"):
            qs = qs.filter(Q(username__icontains=q) | Q(full_name__icontains=q) | Q(email__icontains=q))
        if role := p.get("role"):
            qs = qs.filter(role=role)
        if (active := p.get("is_active")) in {"true", "false"}:
            qs = qs.filter(is_active=(active == "true"))
        return qs

    def get_serializer_class(self):
        return {"create": UserCreateSerializer, "partial_update": UserUpdateSerializer}.get(self.action, UserSerializer)

    def create(self, request, *args, **kwargs):
        ser = UserCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        audit.record(request, AuditAction.CREATE, object_type="user", object_id=user.pk, detail=f"{user.username} ({user.role})")
        return Response(
            {**UserSerializer(user).data, "temporary_password": ser.temporary_password},
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()
        before = {"role": user.role, "is_active": user.is_active, "full_name": user.full_name, "email": user.email}
        ser = self.get_serializer(user, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        changes = [f"{k}: {before[k]} -> {getattr(user, k)}" for k in before if before[k] != getattr(user, k)]
        if before["role"] != user.role or (before["is_active"] and not user.is_active):
            terminate_sessions(user)
        audit.record(request, AuditAction.UPDATE, object_type="user", object_id=user.pk, detail=f"{user.username} | " + "; ".join(changes))
        return Response(UserSerializer(user).data)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user.pk == request.user.pk:
            raise ValidationError("Vous ne pouvez pas supprimer votre propre compte.")
        if is_last_active_admin(user):
            raise ValidationError("Le dernier administrateur actif ne peut pas être supprimé.")
        audit.record(request, AuditAction.DELETE, object_type="user", object_id=user.pk, detail=user.username)
        terminate_sessions(user)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        user = self.get_object()
        if user.pk == request.user.pk:
            raise ValidationError("Utilisez « Changer mot de passe » pour votre propre compte.")
        temporary = generate_password()
        user.set_password(temporary)
        user.must_change_password = True
        user.reset_login_failures()
        user.save(update_fields=["password", "must_change_password"])
        terminate_sessions(user)
        audit.record(request, AuditAction.PASSWORD_RESET, object_type="user", object_id=user.pk, detail=user.username)
        return Response({"temporary_password": temporary})

    @action(detail=False, methods=["get"])
    def stats(self, request):
        total = User.objects.count()

        def pct(n: int) -> float:
            return round(100 * n / total, 1) if total else 0.0

        active = User.objects.filter(is_active=True).count()
        counts = dict(User.objects.values_list("role").annotate(n=Count("id")))
        since = timezone.now() - timedelta(hours=24)
        return Response({
            "total": total,
            "admins": counts.get(Role.ADMIN, 0),
            "admins_percent": pct(counts.get(Role.ADMIN, 0)),
            "active": active,
            "active_percent": pct(active),
            "connections_24h": AuditLog.objects.filter(action=AuditAction.LOGIN, created_at__gte=since).count(),
            "roles": [
                {"role": r.value, "label": r.label, "count": counts.get(r.value, 0), "percent": pct(counts.get(r.value, 0))}
                for r in Role
            ],
        })


class RoleListView(APIView):
    permission_map = {"GET": P.USERS_VIEW}

    def get(self, request):
        counts = dict(User.objects.values_list("role").annotate(n=Count("id")))
        return Response([
            {
                "role": r.value, "label": r.label, "description": ROLE_DESCRIPTIONS[r],
                "user_count": counts.get(r.value, 0), "permissions": sorted(ROLE_PERMISSIONS[r]),
            }
            for r in Role
        ])


class AuditLogViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = AuditLogSerializer
    permission_map = {"GET": P.AUDIT_VIEW}

    def get_queryset(self):
        qs = AuditLog.objects.all()
        p = self.request.query_params
        if v := p.get("action"):
            qs = qs.filter(action=v)
        if v := p.get("username"):
            qs = qs.filter(username__iexact=v)
        if v := p.get("q"):
            qs = qs.filter(Q(detail__icontains=v) | Q(username__icontains=v) | Q(object_type__icontains=v))
        if v := p.get("date_from"):
            qs = qs.filter(created_at__date__gte=v)
        if v := p.get("date_to"):
            qs = qs.filter(created_at__date__lte=v)
        return qs
