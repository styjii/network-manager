from django.core.management import call_command

from accounts.models import User
from accounts.roles import Role

from .base import PASSWORD, AccountsTestCase


class SeedUsersTests(AccountsTestCase):
    def test_five_accounts_match_the_mockup(self):
        expected = {
            "admin": (Role.ADMIN, True),
            "styjii": (Role.SUPERVISOR, True),
            "operator": (Role.OPERATOR, True),
            "guest": (Role.GUEST, False),
            "dev": (Role.DEVELOPER, True),
        }
        self.assertEqual(User.objects.count(), 5)
        for username, (role, active) in expected.items():
            user = self.users[username]
            self.assertEqual((user.role, user.is_active), (role, active), username)
        self.assertEqual(self.users["styjii"].full_name, "Tojo Randrianarison")

    def test_only_admin_reaches_django_admin(self):
        self.assertTrue(self.users["admin"].is_staff)
        self.assertFalse(self.users["styjii"].is_staff)

    def test_seed_is_idempotent_and_keeps_passwords(self):
        call_command("seed_users", password="Autre-Mot-De-Passe-9!", verbosity=0)
        self.assertEqual(User.objects.count(), 5)
        self.assertTrue(User.objects.get(username="admin").check_password(PASSWORD))

    def test_generated_passwords_are_unique_and_force_change(self):
        User.objects.all().delete()
        call_command("seed_users", verbosity=0)
        self.assertTrue(all(u.must_change_password for u in User.objects.all()))
        hashes = set(User.objects.values_list("password", flat=True))
        self.assertEqual(len(hashes), 5)

    def test_admin_role_has_full_django_admin_rights_and_others_none(self):
        self.assertTrue(self.users["admin"].is_superuser)
        self.assertFalse(self.users["styjii"].is_superuser)
        client = self.as_user("admin")
        for url in ("/admin/accounts/user/", "/admin/accounts/user/add/", "/admin/accounts/auditlog/"):
            self.assertEqual(client.get(url).status_code, 200, url)
        self.assertEqual(self.as_user("styjii").get("/admin/accounts/user/").status_code, 302)
