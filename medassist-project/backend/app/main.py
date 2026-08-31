import logging
from contextlib import asynccontextmanager
from time import monotonic

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("medassist")

SENSITIVE_INPUT_LOCS = {"password", "hashed_password", "token", "access_token", "secret"}


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("Initializing database schema (env=%s)...", settings.ENVIRONMENT)
    try:
        init_db()
        logger.info("MedAssist API ready")
    except Exception:
        logger.exception(
            "Database initialization failed. "
            "check DATABASE_URL and ensure PostgreSQL is reachable."
        )
        if settings.is_production:
            # Fail closed in production — do not serve a half-initialized clinical API.
            raise
        logger.error(
            "API starts in degraded mode (development only). "
            "Clinical routes will fail until the database is available."
        )
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENABLE_API_DOCS else None,
    redoc_url="/redoc" if settings.ENABLE_API_DOCS else None,
    openapi_url="/openapi.json" if settings.ENABLE_API_DOCS else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(api_router, prefix="/api/v1")


def _json_safe_validation_errors(errors: list) -> list:
    """Sanitize validation errors — never echo passwords/secrets."""
    safe = []
    for err in errors:
        loc = list(err.get("loc", ()))
        loc_names = {str(part).lower() for part in loc}
        item = {
            "type": err.get("type"),
            "loc": loc,
            "msg": err.get("msg"),
        }
        if loc_names & SENSITIVE_INPUT_LOCS:
            item["input"] = "[redacted]"
        elif "input" in err and isinstance(err["input"], (str, int, float, bool, type(None))):
            # Avoid dumping long clinical text from validation failures
            value = err["input"]
            if isinstance(value, str) and len(value) > 120:
                item["input"] = value[:120] + "…"
            else:
                item["input"] = value
        safe.append(item)
    return safe


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Données invalides",
            "errors": _json_safe_validation_errors(exc.errors()),
        },
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(_: Request, exc: SQLAlchemyError):
    logger.exception("Unhandled database error")
    return JSONResponse(
        status_code=500,
        content={"detail": "Erreur interne de base de données"},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception):
    logger.exception("Unhandled server error")
    return JSONResponse(
        status_code=500,
        content={"detail": "Erreur interne du serveur"},
    )


# Simple in-memory login rate limit (per client IP)
_LOGIN_ATTEMPTS: dict[str, list[float]] = {}
LOGIN_WINDOW_SECONDS = 60
LOGIN_MAX_ATTEMPTS = 10


@app.middleware("http")
async def login_rate_limit_middleware(request: Request, call_next):
    if request.url.path.rstrip("/").endswith("/auth/login") and request.method == "POST":
        client = request.client.host if request.client else "unknown"
        now = monotonic()
        window = [t for t in _LOGIN_ATTEMPTS.get(client, []) if now - t < LOGIN_WINDOW_SECONDS]
        if len(window) >= LOGIN_MAX_ATTEMPTS:
            return JSONResponse(
                status_code=429,
                content={"detail": "Trop de tentatives de connexion. Réessayez plus tard."},
            )
        window.append(now)
        _LOGIN_ATTEMPTS[client] = window
    return await call_next(request)


@app.get("/")
def root():
    payload = {"status": "MedAssist Backend Service Active"}
    if settings.ENABLE_API_DOCS:
        payload["docs"] = "/docs"
    return payload
