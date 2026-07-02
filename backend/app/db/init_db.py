"""Seed the database with an admin account and demo data.

Idempotent: running multiple times will not create duplicates.
"""
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.customer import Customer
from app.models.hall import Hall
from app.models.movie import Movie
from app.models.screening import Screening
from app.models.seat import Seat


def seed() -> None:
    db = SessionLocal()
    try:
        # Admin user
        if not db.scalar(select(Customer).where(Customer.email == "admin@example.com")):
            db.add(
                Customer(
                    name="Administrator",
                    email="admin@example.com",
                    hashed_password=hash_password("admin123"),
                    role="admin",
                )
            )

        # Demo customer
        if not db.scalar(select(Customer).where(Customer.email == "jan@example.com")):
            db.add(
                Customer(
                    name="Jan Kowalski",
                    email="jan@example.com",
                    phone="+48123456789",
                    hashed_password=hash_password("test123"),
                    role="customer",
                )
            )

        # Movies
        if db.scalar(select(Movie).limit(1)) is None:
            movies = [
                Movie(title="Inception", genre="Sci-Fi",
                      description="A thief who steals corporate secrets through dream-sharing technology.",
                      duration_min=148, rating=8.8),
                Movie(title="Interstellar", genre="Sci-Fi",
                      description="Explorers travel through a wormhole in space.",
                      duration_min=169, rating=8.6),
                Movie(title="Parasite", genre="Drama",
                      description="Greed and class discrimination threaten a symbiotic relationship.",
                      duration_min=132, rating=8.5),
            ]
            db.add_all(movies)

        # Hall with seats (5 rows x 8 seats)
        hall = db.scalar(select(Hall).where(Hall.name == "Sala 1"))
        if hall is None:
            hall = Hall(name="Sala 1", capacity=40)
            db.add(hall)
            db.flush()
            for row in ["A", "B", "C", "D", "E"]:
                for number in range(1, 9):
                    db.add(Seat(hall_id=hall.id, row=row, number=number))

        db.commit()

        # Screenings (need movie + hall ids)
        if db.scalar(select(Screening).limit(1)) is None:
            first_movie = db.scalar(select(Movie).order_by(Movie.id))
            hall = db.scalar(select(Hall).order_by(Hall.id))
            if first_movie and hall:
                base = datetime.now().replace(hour=18, minute=0, second=0, microsecond=0)
                db.add_all([
                    Screening(movie_id=first_movie.id, hall_id=hall.id,
                              start_time=base + timedelta(days=1),
                              ticket_price=Decimal("30.00")),
                    Screening(movie_id=first_movie.id, hall_id=hall.id,
                              start_time=base + timedelta(days=2),
                              ticket_price=Decimal("35.00")),
                ])
                db.commit()

        print("Seeding complete.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
