# Cinema Management System

A web application for managing a cinema: browsing films and the schedule,
reserving seats, loyalty discounts, and email confirmations. The project is
split into a separate **back-end** (FastAPI + SQLAlchemy) and **front-end**
(React), with data stored in a **PostgreSQL** database. Everything runs in
**Docker** containers.

Full technical documentation is available in
[docs/DOCUMENTATION.md](docs/DOCUMENTATION.md).

## Features

- **Browse films and the schedule** with filters (title, genre, hall, date)
  and sorting.
- **Search suggestions** — as you type in a filter field, matching titles
  appear, and an empty field shows your recently searched terms (**search
  history** saved locally, separately for films and the schedule).
- **Seat reservation** with selection on the hall seat map, loyalty discounts,
  and email confirmations.
- **Admin panel** — manage films, halls, and screenings. When adding a film,
  the **IMDb** search suggests matching titles (poster, year) and auto-fills the
  form with data from OMDb/TMDb.
- **Background music** with a toggle in the top-right corner (see below).

## Tech stack

| Layer          | Technology                                      |
| -------------- | ----------------------------------------------- |
| Back-end       | Python 3.12, FastAPI, SQLAlchemy (ORM), Alembic |
| Front-end      | React 18, React Router, Axios, Vite             |
| Database       | PostgreSQL 16                                   |
| Authentication | JWT (python-jose), pbkdf2_sha256 (passlib)      |
| Email          | fastapi-mail (SMTP)                             |
| Containerization | Docker, Docker Compose                        |
| Tests          | pytest, behave (Gherkin)                        |

## Running with Docker

Requirements: Docker Desktop installed.

```bash
# 1. Copy the configuration file
copy .env.example .env        # Windows
# cp .env.example .env        # Linux/macOS

# 2. Build and start all containers
docker compose up --build
```

After startup:

- Front-end: http://localhost:3000
- Back-end (API): http://localhost:8000
- API documentation (Swagger UI): http://localhost:8000/docs
- PostgreSQL database: localhost:5432

The back-end container automatically runs database migrations
(`alembic upgrade head`) and seeds it with initial data (`app.db.init_db`).

### Seed accounts

| Role     | Email               | Password |
| -------- | ------------------- | -------- |
| Admin    | admin@example.com   | admin123 |
| Customer | jan@example.com     | test123  |

## Running locally (without Docker)

### Back-end

```bash
cd backend
py -m venv .venv
.\.venv\Scripts\activate        # Windows
pip install -r requirements.txt
# set DATABASE_URL to a local Postgres or SQLite database
alembic upgrade head
python -m app.db.init_db
uvicorn app.main:app --reload
```

### Front-end

```bash
cd frontend
npm install
npm run dev
```

### Background music

The music toggle in the top-right corner plays the file
`frontend/public/music/moonlight-haze.mp3`. The file is **not** included in the
repository (it's third-party audio) — you need to add it yourself:

1. Download the track **"Moonlight Haze" (Bird Creek)** — free from the
   [YouTube Audio Library](https://www.youtube.com/audiolibrary) (no attribution
   required).
2. Save it as `moonlight-haze.mp3` in the `frontend/public/music/` folder.

Without this file the toggle still works but plays no sound. To use a different
track, replace the file and update the `MUSIC_SRC` constant in
`frontend/src/components/MusicPlayer.jsx`.

## Tests

```bash
cd backend
# unit and integration tests
pytest -q
# Gherkin acceptance tests
behave tests/features
```

## Project structure

```
SystemZarzadzaniaKinoteatrem/
├── backend/            # API (FastAPI) + ORM + migrations + tests
├── frontend/           # React application (Vite)
├── docs/               # Technical documentation
├── docker-compose.yml  # Container orchestration
└── .env.example        # Environment variables template
```
