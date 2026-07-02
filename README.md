# System Zarządzania Kinoteatrem

Aplikacja webowa do zarządzania kinoteatrem: przeglądanie filmów i repertuaru,
rezerwacja miejsc, rabaty lojalnościowe oraz potwierdzenia e-mail. Projekt
podzielony jest na oddzielny **back-end** (FastAPI + SQLAlchemy) i **front-end**
(React), a dane przechowywane są w bazie **PostgreSQL**. Całość uruchamiana jest
w kontenerach **Docker**.

Pełna dokumentacja techniczna znajduje się w pliku
[docs/DOCUMENTATION.md](docs/DOCUMENTATION.md).

## Stos technologiczny

| Warstwa       | Technologia                                   |
| ------------- | --------------------------------------------- |
| Back-end      | Python 3.12, FastAPI, SQLAlchemy (ORM), Alembic |
| Front-end     | React 18, React Router, Axios, Vite           |
| Baza danych   | PostgreSQL 16                                 |
| Autoryzacja   | JWT (python-jose), pbkdf2_sha256 (passlib)    |
| E-mail        | fastapi-mail (SMTP)                           |
| Konteneryzacja| Docker, Docker Compose                        |
| Testy         | pytest, behave (Gherkin)                       |

## Jak uruchomić (Docker)

Wymagania: zainstalowany Docker Desktop.

```bash
# 1. Skopiuj plik konfiguracyjny
copy .env.example .env        # Windows
# cp .env.example .env        # Linux/macOS

# 2. Zbuduj i uruchom wszystkie kontenery
docker compose up --build
```

Po uruchomieniu:

- Front-end: http://localhost:3000
- Back-end (API): http://localhost:8000
- Dokumentacja API (Swagger UI): http://localhost:8000/docs
- Baza danych PostgreSQL: localhost:5432

Kontener back-endu automatycznie wykonuje migracje bazy (`alembic upgrade head`)
oraz wypełnia ją danymi startowymi (`app.db.init_db`).

### Konta startowe (seed)

| Rola      | E-mail              | Hasło    |
| --------- | ------------------- | -------- |
| Admin     | admin@example.com   | admin123 |
| Klient    | jan@example.com     | test123  |

## Uruchamianie lokalne (bez Dockera)

### Back-end

```bash
cd backend
py -m venv .venv
.\.venv\Scripts\activate        # Windows
pip install -r requirements.txt
# ustaw DATABASE_URL na lokalną bazę Postgres lub SQLite
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

## Testy

```bash
cd backend
# testy jednostkowe i integracyjne
pytest -q
# testy akceptacyjne w języku Gherkin
behave tests/features
```

## Struktura projektu

```
SystemZarzadzaniaKinoteatrem/
├── backend/            # API (FastAPI) + ORM + migracje + testy
├── frontend/           # Aplikacja React (Vite)
├── docs/               # Dokumentacja techniczna
├── docker-compose.yml  # Orkiestracja kontenerów
└── .env.example        # Szablon zmiennych środowiskowych
```
