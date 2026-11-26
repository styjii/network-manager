from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter(trailing_slash=False)
router.include_root_view = False
router.register("users", views.UserViewSet, basename="user")
router.register("audit-logs", views.AuditLogViewSet, basename="audit-log")

urlpatterns = [
    path("auth/csrf", views.CsrfView.as_view(), name="auth-csrf"),
    path("auth/login", views.LoginView.as_view(), name="auth-login"),
    path("auth/logout", views.LogoutView.as_view(), name="auth-logout"),
    path("auth/me", views.MeView.as_view(), name="auth-me"),
    path("auth/change-password", views.ChangePasswordView.as_view(), name="auth-change-password"),
    path("roles", views.RoleListView.as_view(), name="roles"),
    path("", include(router.urls)),
]
