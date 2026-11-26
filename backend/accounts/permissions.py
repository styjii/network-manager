from typing import cast

from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission

from .models import User


class RolePermission(BasePermission):
    """Permission par défaut de toute l'API : refus tant qu'une vue n'a pas déclaré ce qu'elle exige.

    Une vue déclare au choix :
      - public = True                      accessible sans connexion (connexion, jeton CSRF) ;
      - authenticated_only = True          tout utilisateur connecté ;
      - permission_map = {"GET": code}     code de permission par méthode HTTP ;
      - required_permission_for(request)   code calculé (ViewSets : selon l'action).
    Tant que must_change_password est vrai, seules les vues marquées
    allow_pending_password_change = True répondent.
    """

    def has_permission(self, request, view):
        if getattr(view, "public", False):
            return True
        if not request.user or not request.user.is_authenticated or not request.user.is_active:
            return False
        user = cast(User, request.user)
        if user.must_change_password and not getattr(view, "allow_pending_password_change", False):
            raise PermissionDenied("Vous devez changer votre mot de passe avant de continuer.", code="password_change_required")
        required_permission_for = getattr(view, "required_permission_for", None)
        if required_permission_for is not None:
            required = required_permission_for(request)
        else:
            required = getattr(view, "permission_map", {}).get(request.method)
        if required is None:
            return bool(getattr(view, "authenticated_only", False))
        return user.has_app_perm(required)
