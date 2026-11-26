from accounts.roles import ALL_PERMISSIONS, ROLE_PERMISSIONS, P, Role

from .base import AccountsTestCase


class MatrixTests(AccountsTestCase):
    def test_admin_has_every_permission(self):
        self.assertEqual(ROLE_PERMISSIONS[Role.ADMIN], ALL_PERMISSIONS)

    def test_only_admin_manages_users_and_restarts_servers(self):
        for role, perms in ROLE_PERMISSIONS.items():
            if role != Role.ADMIN:
                self.assertNotIn(P.USERS_MANAGE, perms, role)
                self.assertNotIn(P.USERS_VIEW, perms, role)
                self.assertNotIn(P.SERVERS_RESTART, perms, role)
                self.assertNotIn(P.BACKUPS_MANAGE, perms, role)

    def test_guest_is_read_only(self):
        self.assertTrue(all(code.endswith(".view") for code in ROLE_PERMISSIONS[Role.GUEST]))
        self.assertNotIn(P.HISTORY_VIEW, ROLE_PERMISSIONS[Role.GUEST])

    def test_operator_can_respond_to_alerts_but_not_edit_rules(self):
        perms = ROLE_PERMISSIONS[Role.OPERATOR]
        self.assertIn(P.ALERTS_RESPOND, perms)
        self.assertNotIn(P.ALERTS_MANAGE, perms)
        self.assertNotIn(P.SETTINGS_VIEW, perms)

    def test_supervisor_edits_monitoring_settings_only(self):
        perms = ROLE_PERMISSIONS[Role.SUPERVISOR]
        self.assertIn(P.SETTINGS_MONITORING, perms)
        self.assertNotIn(P.SETTINGS_EDIT, perms)

    def test_developer_gets_api_docs_and_logs(self):
        perms = ROLE_PERMISSIONS[Role.DEVELOPER]
        self.assertTrue({P.API_DOCS, P.SERVERS_LOGS, P.SERVERS_TEST} <= perms)
        self.assertNotIn(P.MACHINES_MANAGE, perms)


class EndpointAccessTests(AccountsTestCase):
    def status(self, username, url):
        return self.as_user(username).get(url).status_code

    def test_user_endpoints_are_admin_only(self):
        for url in ("/api/v1/users", "/api/v1/users/stats", "/api/v1/roles"):
            self.assertEqual(self.status("admin", url), 200, url)
            for other in ("styjii", "operator", "dev"):
                self.assertEqual(self.status(other, url), 403, f"{other} {url}")

    def test_audit_log_readable_by_admin_and_supervisor_only(self):
        self.assertEqual(self.status("admin", "/api/v1/audit-logs"), 200)
        self.assertEqual(self.status("styjii", "/api/v1/audit-logs"), 200)
        for other in ("operator", "dev"):
            self.assertEqual(self.status(other, "/api/v1/audit-logs"), 403)

    def test_inactive_account_session_is_rejected(self):
        client = self.as_user("operator")
        self.users["operator"].__class__.objects.filter(username="operator").update(is_active=False)
        self.assertEqual(client.get("/api/v1/auth/me").status_code, 401)

    def test_non_admin_cannot_write_users(self):
        client = self.as_user("styjii")
        self.assertEqual(client.post("/api/v1/users", {"username": "intrus", "role": "admin"}, format="json").status_code, 403)
        self.assertEqual(client.patch(f"/api/v1/users/{self.users['guest'].pk}", {"role": "admin"}, format="json").status_code, 403)
        self.assertEqual(client.delete(f"/api/v1/users/{self.users['guest'].pk}").status_code, 403)
