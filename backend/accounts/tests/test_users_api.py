from accounts.models import AuditAction, AuditLog, User

from .base import PASSWORD, AccountsTestCase


class UserCrudTests(AccountsTestCase):
    def setUp(self):
        super().setUp()
        self.admin = self.as_user("admin")

    def test_list_matches_mockup_with_pagination_and_filters(self):
        body = self.admin.get("/api/v1/users").json()
        self.assertEqual(body["count"], 5)
        self.assertEqual({u["username"] for u in body["results"]}, {"admin", "styjii", "operator", "guest", "dev"})
        self.assertEqual(self.admin.get("/api/v1/users?role=guest").json()["count"], 1)
        self.assertEqual(self.admin.get("/api/v1/users?is_active=false").json()["results"][0]["username"], "guest")
        self.assertEqual(self.admin.get("/api/v1/users?q=Tojo").json()["results"][0]["username"], "styjii")

    def test_stats_cards(self):
        s = self.admin.get("/api/v1/users/stats").json()
        self.assertEqual((s["total"], s["admins"], s["active"]), (5, 1, 4))
        self.assertEqual(s["active_percent"], 80.0)
        roles = {r["role"]: r for r in s["roles"]}
        self.assertEqual(roles["admin"]["percent"], 20.0)
        self.assertEqual(sum(r["count"] for r in s["roles"]), 5)

    def test_create_generates_temporary_password_and_forces_change(self):
        res = self.admin.post("/api/v1/users", {"username": "Nouveau", "full_name": "Nouvel Utilisateur", "role": "operator"}, format="json")
        self.assertEqual(res.status_code, 201)
        body = res.json()
        self.assertEqual(body["username"], "nouveau")
        self.assertTrue(body["must_change_password"])
        self.assertGreaterEqual(len(body["temporary_password"]), 16)
        self.assertTrue(User.objects.get(username="nouveau").check_password(body["temporary_password"]))
        self.assertTrue(AuditLog.objects.filter(action=AuditAction.CREATE, username="admin").exists())

    def test_create_validations(self):

        def post(data):
            return self.admin.post("/api/v1/users", data, format="json")

        self.assertEqual(post({"username": "ADMIN", "role": "guest"}).status_code, 400)  # doublon insensible à la casse
        self.assertEqual(post({"username": "a b", "role": "guest"}).status_code, 400)
        self.assertEqual(post({"username": "valide", "role": "root"}).status_code, 400)
        self.assertEqual(post({"username": "valide", "role": "guest", "password": "123"}).status_code, 400)
        self.assertEqual(post({"username": "valide", "role": "guest"}).json().get("code"), None)

    def test_update_role_closes_sessions_and_is_audited(self):
        victim = self.as_user("operator")
        self.assertEqual(victim.get("/api/v1/auth/me").status_code, 200)
        res = self.admin.patch(f"/api/v1/users/{self.users['operator'].pk}", {"role": "supervisor"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["role"], "supervisor")
        log = AuditLog.objects.filter(action=AuditAction.UPDATE).first()
        assert log is not None
        self.assertIn("operator -> supervisor", log.detail)

    def test_cannot_change_own_role_or_deactivate_self(self):
        url = f"/api/v1/users/{self.users['admin'].pk}"
        self.assertEqual(self.admin.patch(url, {"role": "guest"}, format="json").status_code, 400)
        self.assertEqual(self.admin.patch(url, {"is_active": False}, format="json").status_code, 400)
        self.assertEqual(self.admin.delete(url).status_code, 400)

    def test_last_active_admin_detection(self):
        from accounts.services import is_last_active_admin

        admin = self.users["admin"]
        self.assertTrue(is_last_active_admin(admin))
        second = User.objects.create_user("admin2", password=PASSWORD, role="admin")
        self.assertFalse(is_last_active_admin(admin))
        second.is_active = False
        second.save()
        self.assertTrue(is_last_active_admin(admin))

    def test_reset_password_forces_change_and_ends_sessions(self):
        victim = self.as_user("dev")
        res = self.admin.post(f"/api/v1/users/{self.users['dev'].pk}/reset-password")
        self.assertEqual(res.status_code, 200)
        temp = res.json()["temporary_password"]
        user = User.objects.get(username="dev")
        self.assertTrue(user.check_password(temp))
        self.assertTrue(user.must_change_password)
        self.assertEqual(victim.get("/api/v1/auth/me").status_code, 401)
        self.assertTrue(AuditLog.objects.filter(action=AuditAction.PASSWORD_RESET).exists())

    def test_cannot_reset_own_password_here(self):
        self.assertEqual(self.admin.post(f"/api/v1/users/{self.users['admin'].pk}/reset-password").status_code, 400)

    def test_delete_user_keeps_audit_trail(self):
        pk = self.users["guest"].pk
        self.assertEqual(self.admin.delete(f"/api/v1/users/{pk}").status_code, 204)
        self.assertFalse(User.objects.filter(pk=pk).exists())
        self.assertTrue(AuditLog.objects.filter(action=AuditAction.DELETE, detail="guest").exists())

    def test_roles_endpoint_lists_five_roles_with_counts(self):
        roles = self.admin.get("/api/v1/roles").json()
        self.assertEqual([r["role"] for r in roles], ["admin", "supervisor", "operator", "developer", "guest"])
        self.assertTrue(all(r["user_count"] == 1 for r in roles))


class AuditApiTests(AccountsTestCase):
    def test_activity_feed_with_filters_and_immutability(self):
        client = self.csrf_client()
        client.post("/api/v1/auth/login", {"username": "admin", "password": PASSWORD}, format="json")
        client.post("/api/v1/auth/login", {"username": "admin", "password": "faux"}, format="json")
        res = self.as_user("styjii").get("/api/v1/audit-logs?action=login&page_size=3").json()
        self.assertEqual(res["count"], 1)
        self.assertEqual(res["results"][0]["username"], "admin")
        entry = AuditLog.objects.first()
        assert entry is not None
        with self.assertRaises(ValueError):
            entry.save()
        with self.assertRaises(ValueError):
            entry.delete()

    def test_forwarded_ip_only_trusted_from_proxy(self):
        from django.test import override_settings

        from accounts.audit import client_ip

        class Req:
            META = {"REMOTE_ADDR": "10.0.0.5", "HTTP_X_FORWARDED_FOR": "6.6.6.6, 192.168.43.60"}

        self.assertEqual(client_ip(Req()), "10.0.0.5")  # proxy non déclaré : en-tête ignoré
        with override_settings(NM_TRUSTED_PROXIES=["10.0.0.5"]):
            self.assertEqual(client_ip(Req()), "192.168.43.60")
