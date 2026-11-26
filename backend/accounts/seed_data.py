"""Comptes de démonstration, repris de la maquette « Administration »."""
from .roles import Role

SEED_USERS = [
    {"username": "admin", "full_name": "Administrateur", "role": Role.ADMIN, "is_active": True},
    {"username": "styjii", "full_name": "Tojo Randrianarison", "role": Role.SUPERVISOR, "is_active": True},
    {"username": "operator", "full_name": "Opérateur Réseau", "role": Role.OPERATOR, "is_active": True},
    {"username": "guest", "full_name": "Invité", "role": Role.GUEST, "is_active": False},
    {"username": "dev", "full_name": "Développeur", "role": Role.DEVELOPER, "is_active": True},
]
