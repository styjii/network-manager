from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from accounts.models import User
from accounts.roles import Role
from accounts.seed_data import SEED_USERS
from accounts.services import generate_password


class Command(BaseCommand):
    help = "Crée les cinq comptes de la maquette (admin, styjii, operator, guest, dev)."

    def add_arguments(self, parser):
        parser.add_argument("--password", help="Mot de passe commun (développement uniquement). Sinon un mot de passe aléatoire est généré par compte.")
        parser.add_argument("--update", action="store_true", help="Met aussi à jour nom, rôle et statut des comptes déjà présents.")

    def handle(self, *args, **opts):
        created = []
        for spec in SEED_USERS:
            user = User.objects.filter(username=spec["username"]).first()
            if user:
                if opts["update"]:
                    for key in ("full_name", "role", "is_active"):
                        setattr(user, key, spec[key])
                    user.save()
                    self.stdout.write(f"mis à jour : {user.username}")
                else:
                    self.stdout.write(f"existe déjà : {user.username}")
                continue
            password = opts["password"] or generate_password()
            user = User(**spec, must_change_password=True)
            user.set_password(password)
            try:
                user.full_clean(exclude=["password"])
            except ValidationError as exc:
                raise CommandError(f"{spec['username']} : {exc}") from exc
            user.save()
            created.append((user.username, Role(user.role).label, "actif" if user.is_active else "inactif", password))

        if created and opts["verbosity"] > 0:
            self.stdout.write("\nComptes créés (mots de passe affichés une seule fois, changement exigé à la première connexion) :")
            for username, role, status, password in created:
                self.stdout.write(f"  {username:<10} {role:<15} {status:<8} {password}")
