# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Cinema management system ("System Zarządzania Kinoteatrem"): browse films/screenings,
reserve seats, loyalty discounts, and email confirmations. Split into a FastAPI + SQLAlchemy
backend and a React (Vite) frontend, backed by PostgreSQL, orchestrated with Docker Compose.
User-facing text is Polish; code identifiers and comments are English.

## Commands

### Docker (full stack)
```bash
cp .env.example .env          # required before first run
docker compose up --build
```
The backend container runs `entrypoint.sh`: `alembic upgrade head` → seed via
`python -m app.db.init_db` → `uvicorn`. Migrations and seeding happen automatically on start.

### Backend (local, from `backend/`)
```bash
py -m venv .venv && .\.venv\Scripts\activate   # Windows
pip install -r requirements.txt
alembic upgrade head
python -m app.db.init_db          # seed admin + demo data (idempotent)
uvicorn app.main:app --reload
pytest -q                          # unit + integration tests
pytest tests/test_crud.py::test_name   # single test
behave tests/features              # Gherkin acceptance tests
```
Tests run against in-memory SQLite (see `tests/conftest.py`) — no Postgres needed. The
`get_db` dependency is overridden and `Base.metadata` is created/dropped per test.

### Frontend (from `frontend/`)
```bash
npm install
npm run dev        # Vite dev server on :3000
npm run build
```

## Ports (important gotcha)

`docker-compose.yml` remaps host ports to avoid clashing with local services, so they differ
from the README and from local (non-Docker) runs:

| Service  | In Docker (host) | Local dev |
| -------- | ---------------- | --------- |
| Backend  | **8001** → 8000  | 8000      |
| Postgres | **5433** → 5432  | 5432      |
| Frontend | 3000             | 3000      |

The frontend's `VITE_API_URL` is set to `http://localhost:8001` in Compose but defaults to
`http://localhost:8000` in `client.js`. When wiring the frontend to the API, confirm which
port the backend is actually exposed on.

## Backend architecture

Layered, per-domain structure under `backend/app/`. The domains are **customer, movie, hall,
seat, screening, reservation, review**. Each layer holds one file per domain:

- `models/` — SQLAlchemy 2.0 ORM (`Mapped[...]` / `mapped_column`). All models must be
  imported in `db/base.py` so Alembic autogenerate and `Base.metadata` discover them.
- `schemas/` — Pydantic v2 request/response models (`*Create`, `*Read`, `*Update`, etc.).
- `crud/` — data access **and business logic**. This is where domain rules live, not the routers.
- `routers/` — thin FastAPI endpoints; catch domain exceptions and translate to `HTTPException`.

Cross-cutting pieces:
- `core/config.py` — `Settings` (pydantic-settings) loaded from `.env`; single `settings` instance.
- `core/security.py` — JWT (python-jose, HS256) + password hashing (passlib `pbkdf2_sha256`).
- `deps.py` — `get_current_user` (decodes JWT, loads Customer by email in `sub`) and
  `require_admin` (checks `role == "admin"`). Use these as route dependencies for auth.
- `core/email.py` — confirmation emails via `fastapi-mail`, sent through FastAPI
  `BackgroundTasks`. `MAIL_SUPPRESS_SEND=true` disables actual sending (default for dev/tests).
- `services/omdb.py`, `services/tmdb.py` — external lookups (IMDb metadata, YouTube trailer)
  powering the admin "Szukaj w IMDb" film autofill; degrade gracefully when API keys are unset.

### Key domain rules (in `crud/reservation.py`)
- Loyalty discount: once a customer's `total_reservations >= LOYALTY_THRESHOLD` (5), a
  `LOYALTY_DISCOUNT_RATE` (10%) discount applies to the next booking. Config-driven.
- Seat availability = no existing `confirmed` reservation for that (screening, seat).
- `create_reservations` (bulk) is all-or-nothing: validates the whole batch before committing;
  discount rate is computed once for the batch.
- Cancelling sets status to `cancelled` and decrements `total_reservations`.
- Guest booking (`/reservations/guest*`) creates/reuses a Customer keyed by email — no login.
- Prices use `Decimal` throughout; never use floats for money.

### Migrations
Alembic in `backend/alembic/`. After changing a model, autogenerate a revision and check it in;
`entrypoint.sh` applies `upgrade head` on container start. Seed data is separate (`init_db.py`).

## Frontend architecture

React 18 + React Router 6 + Axios (Vite). Under `frontend/src/`:
- `api/client.js` — Axios instance; request interceptor attaches the `Bearer` token from
  `localStorage`; response interceptor clears the token on 401.
- `api/endpoints.js` — all API call functions; components import from here, not `client` directly.
- `context/AuthContext.jsx` — auth state; exposes `login/register/logout`, `user`, `isAdmin`.
  Token persisted in `localStorage`; `getMe()` rehydrates the user on load.
- `components/ProtectedRoute.jsx` — route guard; `adminOnly` prop for admin-only routes.
- `pages/` — one component per route (routes defined in `App.jsx`).

## Seed accounts

| Role   | Email             | Password |
| ------ | ----------------- | -------- |
| Admin  | admin@example.com | admin123 |
| Client | jan@example.com   | test123  |
