from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import AuditLog, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ("username", "full_name", "role", "is_active", "last_login")
    list_filter = ("role", "is_active")
    search_fields = ("username", "full_name", "email")
    ordering = ("username",)
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Identité", {"fields": ("full_name", "email")}),
        ("Accès", {"fields": ("role", "is_active", "must_change_password", "failed_login_count", "locked_until")}),
        ("Dates", {"fields": ("last_login", "password_changed_at", "created_at")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("username", "full_name", "email", "role", "password1", "password2")}),
    )
    readonly_fields = ("last_login", "password_changed_at", "created_at")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "username", "action", "object_type", "ip")
    list_filter = ("action",)
    search_fields = ("username", "detail")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
