from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class Seat(Base):
    __tablename__ = "seats"
    __table_args__ = (
        UniqueConstraint("hall_id", "row", "number", name="uq_seat_position"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    hall_id: Mapped[int] = mapped_column(
        ForeignKey("halls.id", ondelete="CASCADE"), nullable=False
    )
    row: Mapped[str] = mapped_column(String(5), nullable=False)
    number: Mapped[int] = mapped_column(Integer, nullable=False)

    hall: Mapped["Hall"] = relationship(back_populates="seats")
    reservations: Mapped[list["Reservation"]] = relationship(back_populates="seat")
