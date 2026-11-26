from rest_framework.authentication import SessionAuthentication


class SessionAuthentication401(SessionAuthentication):
    """Session Django + CSRF, mais répond 401 (et non 403) à un utilisateur non connecté."""

    def authenticate_header(self, request):
        return "Session"
