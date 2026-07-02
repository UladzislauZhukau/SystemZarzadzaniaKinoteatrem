from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class Screening(Base):
    __tablename__ = "screenings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    movie_id: Mapped[int] = mapped_column(
        ForeignKey("movies.id", ondelete="CASCADE"), nullable=False
    )
    hall_id: Mapped[int] = mapped_column(
        ForeignKey("halls.id", ondelete="CASCADE"), nullable=False
    )
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    ticket_price: Mapped[float] = mapped_column(Numeric(8, 2), default=0, nullable=False)

    movie: Mapped["Movie"] = relationship(back_populates="screenings")
    hall: Mapped["Hall"] = relationship(back_populates="screenings")
    reservations: Mapped[list["Reservation"]] = relationship(
        back_populates="screening", cascade="all, delete-orphan"
    )
