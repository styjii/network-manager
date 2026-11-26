from django.core.cache import cache
from django.core.management import call_command
from rest_framework.test import APIClient, APITestCase

from accounts.models import User

PASSWORD = "Str0ng-Passw0rd!2026"


class AccountsTestCase(APITestCase):
    """Crée les cinq comptes de la maquette avec un mot de passe connu."""

    @classmethod
    def setUpTestData(cls):
        call_command("seed_users", password=PASSWORD, verbosity=0)
        User.objects.update(must_change_password=False)
        cls.users = {u.username: u for u in User.objects.all()}

    def setUp(self):
        cache.clear()  # remet à zéro la limitation de débit

    def as_user(self, username):
        client = APIClient()
        client.force_login(self.users[username])
        return client

    def csrf_client(self):
        client = APIClient(enforce_csrf_checks=True)
        token = client.get("/api/v1/auth/csrf").json()["csrfToken"]
        client.credentials(HTTP_X_CSRFTOKEN=token)
        return client
