from rest_framework.exceptions import ValidationError
from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    """Toutes les erreurs ont la forme {code, message, details}."""
    response = exception_handler(exc, context)
    if response is None:
        return None
    data = response.data
    if isinstance(exc, ValidationError):
        code, message, details = "validation_error", "Données invalides.", data
    else:
        detail = data.get("detail") if isinstance(data, dict) else None
        code = getattr(detail, "code", None) or getattr(exc, "default_code", "error")
        message = str(detail) if detail is not None else str(exc)
        details = {}
    response.data = {"code": code, "message": message, "details": details}
    return response
