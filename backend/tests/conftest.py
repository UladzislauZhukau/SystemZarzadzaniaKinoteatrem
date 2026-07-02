from datetime import datetime, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.customer import Customer
from app.models.hall import Hall
from app.models.movie import Movie
from app.models.screening import Screening
from app.models.seat import Seat

# In-memory SQLite shared across connections for fast, isolated tests.
engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture()
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def seeded(db_session):
    """Populate a customer, admin, hall+seats, movie and screening."""
    admin = Customer(
        name="Admin", email="admin@example.com",
        hashed_password=hash_password("admin123"), role="admin",
    )
    customer = Customer(
        name="Jan Kowalski", email="jan@example.com",
        hashed_password=hash_password("test123"), role="customer",
    )
    movie = Movie(title="Inception", genre="Sci-Fi", duration_min=148, rating=8.8)
    hall = Hall(name="Sala 1", capacity=6)
    db_session.add_all([admin, customer, movie, hall])
    db_session.flush()

    seats = []
    for row in ["A", "B"]:
        for number in range(1, 4):
            seat = Seat(hall_id=hall.id, row=row, number=number)
            seats.append(seat)
            db_session.add(seat)
    db_session.flush()

    screening = Screening(
        movie_id=movie.id, hall_id=hall.id,
        start_time=datetime.now() + timedelta(days=1),
        ticket_price=Decimal("30.00"),
    )
    db_session.add(screening)
    db_session.commit()

    return {
        "admin": admin,
        "customer": customer,
        "movie": movie,
        "hall": hall,
        "seats": seats,
        "screening": screening,
    }


@pytest.fixture()
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
