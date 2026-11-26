from django.test import override_settings

from accounts.models import AuditAction, AuditLog, User

from .base import PASSWORD, AccountsTestCase


class LoginTests(AccountsTestCase):
    def login(self, client, username, password=PASSWORD):
        return client.post("/api/v1/auth/login", {"username": username, "password": password}, format="json")

    def test_login_requires_csrf(self):
        from rest_framework.test import APIClient

        client = APIClient(enforce_csrf_checks=True)
        res = self.login(client, "admin")
        self.assertEqual(res.status_code, 403)

    def test_login_success_returns_profile_and_permissions(self):
        client = self.csrf_client()
        res = self.login(client, "operator")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["role"], "operator")
        self.assertIn("alerts.respond", body["permissions"])
        self.assertNotIn("users.manage", body["permissions"])
        self.assertEqual(client.get("/api/v1/auth/me").status_code, 200)
        self.assertTrue(AuditLog.objects.filter(action=AuditAction.LOGIN, username="operator").exists())
        self.assertIsNotNone(User.objects.get(username="operator").last_login)

    def test_username_is_case_insensitive(self):
        self.assertEqual(self.login(self.csrf_client(), "ADMIN").status_code, 200)

    def test_wrong_password_unknown_user_and_inactive_user_look_the_same(self):
        bodies = []
        for username, password in [("admin", "mauvais"), ("inconnu", PASSWORD), ("guest", PASSWORD)]:
            res = self.login(self.csrf_client(), username, password)
            self.assertEqual(res.status_code, 401, username)
            bodies.append(res.json())
        self.assertEqual(bodies[0], bodies[1])
        self.assertEqual(bodies[1], bodies[2])
        self.assertEqual(bodies[0]["code"], "invalid_credentials")

    @override_settings(NM_LOGIN_MAX_ATTEMPTS=3, NM_LOGIN_LOCK_MINUTES=15)
    def test_lockout_after_repeated_failures_even_with_good_password(self):
        for _ in range(3):
            self.login(self.csrf_client(), "dev", "mauvais")
        self.assertTrue(User.objects.get(username="dev").is_locked)
        self.assertEqual(self.login(self.csrf_client(), "dev").status_code, 401)
        self.assertTrue(AuditLog.objects.filter(action=AuditAction.LOCKOUT, username="dev").exists())

    def test_success_resets_failure_counter(self):
        self.login(self.csrf_client(), "dev", "mauvais")
        self.assertEqual(User.objects.get(username="dev").failed_login_count, 1)
        self.login(self.csrf_client(), "dev")
        self.assertEqual(User.objects.get(username="dev").failed_login_count, 0)

    def test_login_is_rate_limited_per_client(self):
        codes = [self.login(self.csrf_client(), "inconnu", "x").status_code for _ in range(12)]
        self.assertEqual(codes[-1], 429)

    def test_anonymous_gets_401_on_protected_routes(self):
        from rest_framework.test import APIClient

        for url in ("/api/v1/auth/me", "/api/v1/users", "/api/v1/roles", "/api/v1/audit-logs"):
            self.assertEqual(APIClient().get(url).status_code, 401, url)

    def test_logout_closes_session(self):
        client = self.csrf_client()
        token = self.login(client, "admin").json()["csrfToken"]  # le jeton change à la connexion
        client.credentials(HTTP_X_CSRFTOKEN=token)
        self.assertEqual(client.post("/api/v1/auth/logout").status_code, 204)
        self.assertEqual(client.get("/api/v1/auth/me").status_code, 401)


class PasswordTests(AccountsTestCase):
    def test_must_change_password_blocks_everything_but_auth_routes(self):
        User.objects.filter(username="operator").update(must_change_password=True)
        client = self.as_user("operator")
        blocked = client.get("/api/v1/roles")
        self.assertEqual(blocked.status_code, 403)
        self.assertEqual(blocked.json()["code"], "password_change_required")
        self.assertEqual(client.get("/api/v1/auth/me").status_code, 200)

    def test_change_password_flow(self):
        User.objects.filter(username="operator").update(must_change_password=True)
        client = self.as_user("operator")
        new = "Nouveau-Secret-2026!"
        res = client.post("/api/v1/auth/change-password", {"current_password": PASSWORD, "new_password": new}, format="json")
        self.assertEqual(res.status_code, 204)
        user = User.objects.get(username="operator")
        self.assertFalse(user.must_change_password)
        self.assertTrue(user.check_password(new))
        self.assertEqual(client.get("/api/v1/auth/me").status_code, 200)  # la session courante survit

    def test_change_password_rejects_wrong_current_weak_and_same(self):
        client = self.as_user("operator")
        url = "/api/v1/auth/change-password"
        self.assertEqual(client.post(url, {"current_password": "faux", "new_password": "Nouveau-Secret-2026!"}, format="json").status_code, 400)
        self.assertEqual(client.post(url, {"current_password": PASSWORD, "new_password": "12345678"}, format="json").status_code, 400)
        self.assertEqual(client.post(url, {"current_password": PASSWORD, "new_password": PASSWORD}, format="json").status_code, 400)
