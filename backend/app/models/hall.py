from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class Hall(Base):
    __tablename__ = "halls"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    seats: Mapped[list["Seat"]] = relationship(
        back_populates="hall", cascade="all, delete-orphan"
    )
    screenings: Mapped[list["Screening"]] = relationship(
        back_populates="hall", cascade="all, delete-orphan"
    )
