# MedAssist

MedAssist is a clinical consultation assistant. The current codebase provides a **React + Vite** frontend, a **FastAPI** backend, and **PostgreSQL** for persistence.

Clinicians log in with an email or INPE identifier, manage patients, dictate or transcribe a consultation, extract structured medical data, apply coding (ICD-10 / GMR / NABM), validate the record, generate a PDF, and transmit to a simulated SIH adapter.

This README documents the **current local development setup**. It does **not** describe a production-ready deployment. See [Current production status](#12-current-production-status).

---

## 1. Project overview

| Layer | Technology | Role |
| --- | --- | --- |
| Frontend | React 18, Vite 5, Tailwind CSS | Login, dashboard, patients, dictation, validation, history, settings |
| Backend | FastAPI, SQLAlchemy, JWT auth | REST API under `/api/v1`, schema init, coding, STT, LLM extraction, PDF, SIH simulation |
| Database | PostgreSQL 15 (`postgres:15-alpine`) | Users, patients, consultations |

Authentication is JWT-based (not Keycloak). A Keycloak service exists in Compose behind the optional `keycloak` profile and is unused by the current login flow.

---

## 2. Repository structure

Git root: `C:\Users\imane\MedPro\medassist`

Application code lives under `medassist-project/`.

```
medassist/
├── README.md
├── .gitignore
├── .gitattributes
└── medassist-project/
    ├── .env.example              # Compose / tooling placeholders (POSTGRES_PASSWORD, …)
    ├── docker-compose.yml
    ├── backend/
    │   ├── .env.example          # FastAPI placeholders (copy to backend/.env)
    │   ├── Dockerfile
    │   ├── pytest.ini
    │   ├── requirements.txt
    │   ├── requirements-dev.txt
    │   ├── app/                  # FastAPI application (main.py, API, models, services)
    │   └── tests/                # pytest suite
    └── frontend/
        ├── .env.example          # optional VITE_API_BASE_URL
        ├── package.json
        ├── package-lock.json
        ├── vite.config.js        # dev server port 3003
        └── src/
```

**Backend** (`medassist-project/backend`): FastAPI app in `app/`. Entry point is `app.main:app`. Settings load from `backend/.env` (absolute path, not the process working directory). Tests live in `backend/tests/` with `pytest.ini` setting `testpaths = tests` and `pythonpath = .`.

**Frontend** (`medassist-project/frontend`): Vite React SPA. Scripts in `package.json`: `dev`, `build`, `preview`. API client: `src/services/api.js`.

**Important configuration files**

- `medassist-project/docker-compose.yml` — PostgreSQL, optional Keycloak, optional backend container
- `medassist-project/backend/.env.example` — template for FastAPI
- `medassist-project/.env.example` — template for Compose interpolation
- `medassist-project/frontend/.env.example` — optional frontend public API URL
- `medassist-project/backend/Dockerfile` — Python 3.10 image, `uvicorn app.main:app --host 0.0.0.0 --port 8000`

---

## 3. Prerequisites

- **Git**
- **Docker Desktop** (Compose file uses image `postgres:15-alpine`)
- **Python** 3.10 or later (the backend Dockerfile is `python:3.10-slim`)
- **Node.js** with **npm** (lockfile is npm lockfileVersion 3)

A local Ollama (or compatible) LLM is required only for extraction/coding features. The API can start without it; those routes fail until the host in `LLM_API_URL` is reachable **and** listed in `LLM_ALLOWED_HOSTS`.

---

## 4. Local setup

There are **two environment files** for local development. Neither is committed. Copy the examples; replace placeholders with values you generate locally. **Never put real passwords, JWT secrets, admin passwords, API keys, or tokens in this README or in Git.**

| File | Purpose |
| --- | --- |
| `medassist-project/.env` | Read by Docker Compose for `${POSTGRES_PASSWORD}` and related interpolation |
| `medassist-project/backend/.env` | Read by FastAPI (`app.core.config`) for `DATABASE_URL`, JWT, admin bootstrap, CORS, LLM |

`frontend/.env` is optional. If omitted, the UI uses the fallback in `src/services/api.js`.

### Password matching (required)

Compose starts Postgres with:

`POSTGRES_PASSWORD` from `medassist-project/.env`, or the Compose default placeholder if that file is missing.

The backend connects with:

`DATABASE_URL` in `medassist-project/backend/.env`

The password **inside** `DATABASE_URL` (the part after `medassist_user:`) **must match** the password the PostgreSQL container was created with. If they differ, FastAPI cannot open the database.

If you already started Postgres once, changing `.env` later does **not** change the existing volume password. Either keep using the original password in `DATABASE_URL`, or recreate the volume (this deletes local data).

### PowerShell — create the env files

```powershell
Set-Location C:\Users\imane\MedPro\medassist\medassist-project
Copy-Item .env.example .env

Set-Location C:\Users\imane\MedPro\medassist\medassist-project\backend
Copy-Item .env.example .env
```

Then edit both files locally:

1. Set `POSTGRES_PASSWORD` in `medassist-project/.env`.
2. Set the same password in `DATABASE_URL` in `medassist-project/backend/.env`.
3. Set a long random `JWT_SECRET_KEY` (32+ characters) and a strong `ADMIN_PASSWORD` in `backend/.env`.
4. Do not commit either `.env` file.

Optional frontend:

```powershell
Set-Location C:\Users\imane\MedPro\medassist\medassist-project\frontend
Copy-Item .env.example .env
```

---

## 5. PostgreSQL startup

Run Compose from `medassist-project` (that directory contains `docker-compose.yml`).

```powershell
Set-Location C:\Users\imane\MedPro\medassist\medassist-project
docker compose up -d postgres
```

This starts container `medassist_postgres` from `postgres:15-alpine`, database `medassist_db`, user `medassist_user`, port `5432` on the host.

**Verify**

```powershell
docker ps
docker logs medassist_postgres
```

Healthy output includes Postgres ready to accept connections. Compose also defines a `pg_isready` healthcheck for `medassist_user` / `medassist_db`.

**Stop** (from `medassist-project`)

```powershell
Set-Location C:\Users\imane\MedPro\medassist\medassist-project
docker compose down
```

`docker compose down` stops containers. It does **not** remove the `postgres_data` volume unless you pass `-v`.

---

## 6. Backend setup

Use a virtual environment. Install runtime and test dependencies from the existing requirement files.

```powershell
Set-Location C:\Users\imane\MedPro\medassist\medassist-project\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt -r requirements-dev.txt
```

If PowerShell blocks activation:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

**Start FastAPI** (from `backend`, with the venv active):

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API: http://127.0.0.1:8000
- Health: http://127.0.0.1:8000/api/v1/health
- OpenAPI docs (when `ENABLE_API_DOCS=true` and `ENVIRONMENT` is not production): http://127.0.0.1:8000/docs

On first start with an empty database, `init_db()` creates tables and seeds a bootstrap admin from `ADMIN_*` in `backend/.env`. The admin is seeded **only if the users table is empty**. Changing `ADMIN_PASSWORD` later does not update an existing user.

Compose also defines a `backend` service that builds `backend/Dockerfile`. Local development documented here runs **uvicorn on the host** against host-mapped Postgres (`localhost:5432`). If you run the API **inside** Docker, `DATABASE_URL` must use hostname `postgres`, not `localhost`, and `LLM_API_URL` pointing at `127.0.0.1` will not reach a host Ollama process.

---

## 7. Tests

From `medassist-project/backend` with the venv active and `requirements-dev.txt` installed:

```powershell
Set-Location C:\Users\imane\MedPro\medassist\medassist-project\backend
python -m pytest -q
```

`pytest.ini` points tests at `tests/` and adds `.` to `pythonpath`. `tests/conftest.py` isolates the suite on a temporary SQLite file; it does not use your PostgreSQL data.

**Verified baseline** (from the pre-commit / local audit of this repository): **61 passed, 1 skipped**.

---

## 8. Frontend setup

```powershell
Set-Location C:\Users\imane\MedPro\medassist\medassist-project\frontend
npm ci
npm run dev
```

`npm ci` installs from `package-lock.json`. `npm run dev` starts Vite.

- Development URL: **http://localhost:3003** (`vite.config.js` sets `server.port` to `3003`)

Other scripts defined in `package.json`:

```powershell
npm run build
npm run preview
```

There is no test or lint script in `package.json`.

---

## 9. API configuration

Frontend client (`frontend/src/services/api.js`):

```text
import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1"
```

`VITE_API_BASE_URL` is documented in `frontend/.env.example`. If you do not create `frontend/.env`, the fallback `http://localhost:8000/api/v1` is used.

Backend CORS in `backend/.env.example` allows:

`http://localhost:3003,http://127.0.0.1:3003`

If you change the frontend origin, update `CORS_ORIGINS` to match.

---

## 10. Environment variables

Copy values from the `.env.example` files. **Generate secrets locally. Never commit `.env` files. Never paste real secrets into documentation.**

### `medassist-project/.env` (Compose)

| Variable | Purpose |
| --- | --- |
| `POSTGRES_PASSWORD` | Password for the `postgres:15-alpine` container user `medassist_user`. Must match the password in backend `DATABASE_URL`. Set locally; do not commit. |
| `HF_TOKEN` | Optional Hugging Face token for model downloads. Leave empty if unused. Server-side only. |
| `KEYCLOAK_ADMIN_PASSWORD` | Only used if you start the optional `keycloak` profile. Current JWT login does not use Keycloak. Set locally; do not commit. |

### `medassist-project/backend/.env` (FastAPI)

| Variable | Purpose |
| --- | --- |
| `ENVIRONMENT` | `development` or `production`. Production fail-closes on DB init failure, rejects default JWT/admin secrets, and turns API docs off. |
| `DATABASE_URL` | SQLAlchemy URL. Local host example shape: `postgresql+psycopg2://medassist_user:<YOUR_PASSWORD>@localhost:5432/medassist_db`. Password must match Postgres. Do not commit. |
| `JWT_SECRET_KEY` | Signing key for access tokens. Generate a long random value (32+ characters). Do not use the example placeholder. Do not commit. |
| `JWT_ALGORITHM` | Example: `HS256`. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token TTL in minutes (validated between 5 and 1440). Example: `60`. |
| `ADMIN_INPE` / `ADMIN_EMAIL` / `ADMIN_FULL_NAME` / `ADMIN_SPECIALTY` | Bootstrap admin identity, used only when the users table is empty. |
| `ADMIN_PASSWORD` | Bootstrap admin password. Generate a strong local value. Do not use the example placeholder. Do not commit. Seeded only on an empty users table. |
| `CORS_ORIGINS` | Comma-separated allowed origins. Must include the Vite origin (`http://localhost:3003`). |
| `LLM_API_URL` | Backend-only LLM endpoint. Clinical text is posted only if the host is allowlisted. |
| `LLM_MODEL_NAME` | Model name sent to the LLM API. |
| `LLM_ALLOWED_HOSTS` | Fail-closed allowlist of LLM hosts (comma-separated). Unknown hosts are rejected. |
| `WHISPER_MODEL` | Faster-Whisper model size for local STT. |
| `STT_MAX_UPLOAD_BYTES` | Max audio upload size. |
| `ENABLE_API_DOCS` | OpenAPI `/docs`. Forced off when `ENVIRONMENT=production`. |
| `HF_TOKEN` | Optional; keep server-side only. |

### `medassist-project/frontend/.env` (optional, public)

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Browser-visible API prefix. Example: `http://localhost:8000/api/v1`. Never put JWT secrets, DB passwords, or API keys here. |

---

## 11. Development workflow

Use **three terminals**. Keep Docker Desktop running.

**Terminal 1 — PostgreSQL**

```powershell
Set-Location C:\Users\imane\MedPro\medassist\medassist-project
docker compose up -d postgres
```

**Terminal 2 — backend**

```powershell
Set-Location C:\Users\imane\MedPro\medassist\medassist-project\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 3 — frontend**

```powershell
Set-Location C:\Users\imane\MedPro\medassist\medassist-project\frontend
npm run dev
```

Open http://localhost:3003 and log in with the bootstrap admin from your local `backend/.env` (email or INPE, plus `ADMIN_PASSWORD`), after the backend has seeded an empty database.

**Tests** (can run while services are up; they use isolated SQLite):

```powershell
Set-Location C:\Users\imane\MedPro\medassist\medassist-project\backend
.\.venv\Scripts\Activate.ps1
python -m pytest -q
```

---

## 12. Current production status

**This application is not production-ready.** The items below are current limitations / TODO before production.

### CURRENT LIMITATIONS / TODO BEFORE PRODUCTION

- **No production frontend Docker / Nginx setup.** There is no frontend Dockerfile, no static-file server config, and no frontend service in Compose. The UI is served by the Vite **dev** server (`npm run dev`), which must not be used in production.
- **No Alembic migration system currently in use.** `alembic` is listed in `requirements.txt`, but there is no `alembic.ini` and no migrations directory. Schema is created/altered at startup via `init_db()` / `ensure_schema()`. That is unversioned and not a production migration strategy.
- **Current Compose is development-oriented.** Postgres publishes `5432` to the host. The optional `backend` service bind-mounts `./backend:/app`. There is no `docker-compose.prod.yml`.
- **LLM networking needs adjustment for Docker deployment.** Default `LLM_API_URL` is `http://127.0.0.1:11434/api/generate`. Inside a container, `127.0.0.1` is the container itself. The host must also be listed in `LLM_ALLOWED_HOSTS` (fail-closed).
- **Login rate limiting is process-local.** Attempts are stored in an in-memory dict in `app/main.py`. Multiple workers or replicas do not share that state.
- **No CI workflow.** There is no `.github/workflows` (or equivalent) in the repository.
- **No README previously existed.** This file is the first project README.

Additional gaps for a real deployment (not required for local dev): no LICENSE, Dockerfile runs as root with no healthcheck, JWT stored in frontend `localStorage` (XSS-sensitive), `faster-whisper` may download models on first STT use.

---

## 13. Security notes

- **Never commit `.env` files.** Git ignore rules exclude them. Only `.env.example` templates belong in the repository.
- Use `.env.example` as templates. Replace every `CHANGE_ME_*` placeholder locally.
- If a secret is ever committed, leaked in chat, or pasted into logs: **rotate it** (Postgres password, JWT secret, admin password, tokens). Changing `ADMIN_PASSWORD` in `.env` does not update an already-seeded user.
- Frontend stores the JWT in `localStorage` (`medassist_access_token`). That is XSS-sensitive. Keep tokens short-lived (`ACCESS_TOKEN_EXPIRE_MINUTES`) and treat frontend input as untrusted. Never put DB credentials or API keys in the browser.
- Do **not** expose PostgreSQL publicly in production. The current Compose publish of `5432` is for local development only.
- LLM traffic is fail-closed: only hosts in `LLM_ALLOWED_HOSTS` are contacted, and the backend HTTP client does not follow redirects.
- Production (`ENVIRONMENT=production`) refuses default JWT/admin secrets and does not serve a half-initialized API if database init fails.

---

## 14. Troubleshooting

**Docker daemon not running**

Start Docker Desktop and wait until it is ready. `docker compose up -d postgres` fails if the engine is not running.

**Port 5432 already in use**

Another Postgres (or service) is bound to 5432. Stop that process, or change the host mapping in `docker-compose.yml` and the port in `DATABASE_URL` to match. Do not run two Compose stacks against conflicting volumes without intending to.

**Port 8000 already in use**

Another process (often a leftover uvicorn) owns 8000. Stop it, or pass a different `--port` and update `VITE_API_BASE_URL` / CORS accordingly.

**Port 3003 already in use**

Vite is configured for 3003. Stop the other process, or change `server.port` in `vite.config.js` and `CORS_ORIGINS`.

**`DATABASE_URL` password does not match PostgreSQL**

Symptoms: backend cannot connect; `init_db` logs a database error. Align the password in `backend/.env` `DATABASE_URL` with `POSTGRES_PASSWORD` used when the volume was first created. Recreating the volume (`docker compose down -v`) deletes local data.

**Frontend cannot reach backend**

Confirm uvicorn is on http://127.0.0.1:8000, `/api/v1/health` returns 200, `VITE_API_BASE_URL` (or the fallback) points at `http://localhost:8000/api/v1`, and `CORS_ORIGINS` includes `http://localhost:3003`. On Windows, `localhost` may resolve to IPv6 first; the documented bind is IPv4 `127.0.0.1`. If the UI cannot connect, try `http://127.0.0.1:8000/api/v1` as `VITE_API_BASE_URL`.

**Login fails after changing `ADMIN_PASSWORD`**

The bootstrap user is created only when the users table is empty. An existing hash is not updated from `.env`.

**LLM / extraction errors**

Confirm the LLM process is listening at `LLM_API_URL` and that its hostname is in `LLM_ALLOWED_HOSTS`. From inside Docker, `127.0.0.1` is not the host machine.

**pytest failures caused by environment/dependencies**

Run from `backend` with the venv active after `pip install -r requirements.txt -r requirements-dev.txt`. The suite expects the env overrides in `tests/conftest.py`, not your live `.env`. Do not point pytest at production data.

**PowerShell cannot activate `.venv`**

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

---

## 15. Useful commands

```powershell
# Git (repository root)
Set-Location C:\Users\imane\MedPro\medassist
git status
git log -1 --oneline

# Docker
docker ps
Set-Location C:\Users\imane\MedPro\medassist\medassist-project
docker compose ps
docker compose up -d postgres
docker logs medassist_postgres
docker compose down

# Backend tests
Set-Location C:\Users\imane\MedPro\medassist\medassist-project\backend
.\.venv\Scripts\Activate.ps1
python -m pytest -q

# Frontend production build (local check only)
Set-Location C:\Users\imane\MedPro\medassist\medassist-project\frontend
npm run build
```

---

## 16. Final note

This README documents the **current development** setup: Docker Postgres, host-run FastAPI, and the Vite dev server.

Production deployment requires completing the blockers in [section 12](#12-current-production-status): frontend packaging, a real migration system, a production Compose (or equivalent) that does not publish the database, LLM/Docker networking, shared rate-limit storage, and CI.

Do not treat a successful local login or `pytest` run as production readiness.
