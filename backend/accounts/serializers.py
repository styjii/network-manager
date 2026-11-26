import re
from typing import cast

from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import AuditLog, User
from .roles import Role
from .services import generate_password, is_last_active_admin

USERNAME_RE = re.compile(r"^[a-z0-9_.-]{3,30}$")


def _validate_new_password(value, user=None):
    try:
        password_validation.validate_password(value, user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(list(exc.messages)) from exc
    return value


class UserSerializer(serializers.ModelSerializer):
    role_label = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "full_name", "email", "role", "role_label",
            "is_active", "last_login", "created_at", "must_change_password",
        ]
        read_only_fields = fields


class MeSerializer(UserSerializer):
    permissions = serializers.SerializerMethodField()

    class Meta(UserSerializer.Meta):
        fields = [*UserSerializer.Meta.fields, "permissions"]
        read_only_fields = fields

    def get_permissions(self, obj):
        return sorted(obj.app_permissions())


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, trim_whitespace=True)
    password = serializers.CharField(max_length=256, trim_whitespace=False, write_only=True)


class UserCreateSerializer(serializers.ModelSerializer):
    temporary_password: str = ""
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, trim_whitespace=False)

    class Meta:
        model = User
        fields = ["username", "full_name", "email", "role", "is_active", "password"]
        extra_kwargs = {"username": {"validators": []}}

    def validate_username(self, value):
        value = value.strip().lower()
        if not USERNAME_RE.match(value):
            raise serializers.ValidationError("3 à 30 caractères : lettres minuscules, chiffres, point, tiret ou tiret bas.")
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur existe déjà.")
        return value

    def validate(self, attrs):
        password = attrs.get("password")
        if password:
            probe = User(username=attrs.get("username", ""), email=attrs.get("email", ""))
            _validate_new_password(password, probe)
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password", "") or ""
        # Un mot de passe choisi par l'administrateur n'est jamais définitif.
        self.temporary_password = password or generate_password()
        user = User(**validated_data, must_change_password=True)
        user.set_password(self.temporary_password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["full_name", "email", "role", "is_active"]

    def validate(self, attrs):
        user = cast(User, self.instance)
        actor = self.context["request"].user
        new_role = attrs.get("role", user.role)
        new_active = attrs.get("is_active", user.is_active)
        if user.pk == actor.pk:
            if new_role != user.role:
                raise serializers.ValidationError({"role": "Vous ne pouvez pas modifier votre propre rôle."})
            if not new_active:
                raise serializers.ValidationError({"is_active": "Vous ne pouvez pas désactiver votre propre compte."})
        if is_last_active_admin(user) and (new_role != Role.ADMIN or not new_active):
            raise serializers.ValidationError("Le dernier administrateur actif ne peut être ni rétrogradé ni désactivé.")
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_current_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Mot de passe actuel incorrect.")
        return value

    def validate(self, attrs):
        user = self.context["request"].user
        if attrs["current_password"] == attrs["new_password"]:
            raise serializers.ValidationError({"new_password": "Le nouveau mot de passe doit être différent de l'ancien."})
        _validate_new_password(attrs["new_password"], user)
        return attrs


class AuditLogSerializer(serializers.ModelSerializer):
    action_label = serializers.CharField(source="get_action_display", read_only=True)

    class Meta:
        model = AuditLog
        fields = ["id", "created_at", "username", "action", "action_label", "object_type", "object_id", "detail", "ip"]
        read_only_fields = fields
