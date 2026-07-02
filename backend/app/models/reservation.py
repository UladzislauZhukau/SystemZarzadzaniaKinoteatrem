from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class Reservation(Base):
    __tablename__ = "reservations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"), nullable=False
    )
    screening_id: Mapped[int] = mapped_column(
        ForeignKey("screenings.id", ondelete="CASCADE"), nullable=False
    )
    seat_id: Mapped[int] = mapped_column(
        ForeignKey("seats.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), default="confirmed", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    price: Mapped[float] = mapped_column(Numeric(8, 2), default=0, nullable=False)
    discount_applied: Mapped[float] = mapped_column(Numeric(4, 2), default=0, nullable=False)

    customer: Mapped["Customer"] = relationship(back_populates="reservations")
    screening: Mapped["Screening"] = relationship(back_populates="reservations")
    seat: Mapped["Seat"] = relationship(back_populates="reservations")
