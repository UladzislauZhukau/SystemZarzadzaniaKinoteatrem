from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.customer import Customer
from app.models.reservation import Reservation
from app.models.screening import Screening
from app.models.seat import Seat


class ReservationError(Exception):
    """Raised for business-rule violations while booking."""


def discount_rate_for(total_reservations: int) -> Decimal:
    """Loyalty discount: customers with >= LOYALTY_THRESHOLD confirmed
    reservations get a discount on the next booking."""
    if total_reservations >= settings.LOYALTY_THRESHOLD:
        return Decimal(str(settings.LOYALTY_DISCOUNT_RATE))
    return Decimal("0")


def calculate_price(base_price: Decimal, total_reservations: int) -> tuple[Decimal, Decimal]:
    """Return (final_price, discount_rate) after applying loyalty discount."""
    rate = discount_rate_for(total_reservations)
    final = (base_price * (Decimal("1") - rate)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    return final, rate


def is_seat_available(db: Session, screening_id: int, seat_id: int) -> bool:
    existing = db.scalar(
        select(Reservation).where(
            Reservation.screening_id == screening_id,
            Reservation.seat_id == seat_id,
            Reservation.status == "confirmed",
        )
    )
    return existing is None


def get_reservations_for_customer(db: Session, customer_id: int) -> list[Reservation]:
    return list(
        db.scalars(
            select(Reservation)
            .where(Reservation.customer_id == customer_id)
            .order_by(Reservation.created_at.desc())
        )
    )


def get_all_reservations(db: Session) -> list[Reservation]:
    return list(db.scalars(select(Reservation).order_by(Reservation.created_at.desc())))


def get_reservation(db: Session, reservation_id: int) -> Reservation | None:
    return db.get(Reservation, reservation_id)


def create_reservation(
    db: Session, customer: Customer, screening_id: int, seat_id: int
) -> Reservation:
    screening = db.get(Screening, screening_id)
    if screening is None:
        raise ReservationError("Screening not found.")

    seat = db.get(Seat, seat_id)
    if seat is None:
        raise ReservationError("Seat not found.")
    if seat.hall_id != screening.hall_id:
        raise ReservationError("Seat does not belong to the screening's hall.")

    if not is_seat_available(db, screening_id, seat_id):
        raise ReservationError("Seat is already reserved for this screening.")

    base_price = Decimal(str(screening.ticket_price))
    final_price, rate = calculate_price(base_price, customer.total_reservations)

    reservation = Reservation(
        customer_id=customer.id,
        screening_id=screening_id,
        seat_id=seat_id,
        status="confirmed",
        price=final_price,
        discount_applied=rate,
    )
    db.add(reservation)
    customer.total_reservations += 1
    db.commit()
    db.refresh(reservation)
    return reservation


def create_reservations(
    db: Session, customer: Customer, screening_id: int, seat_ids: list[int]
) -> list[Reservation]:
    """Book several seats for one screening atomically (all-or-nothing).

    Validates the whole batch first; if any seat is invalid or already taken,
    nothing is committed. The loyalty discount rate is determined once for the
    whole batch based on the customer's current reservation count."""
    unique_ids = list(dict.fromkeys(seat_ids))  # dedupe, preserve order
    if not unique_ids:
        raise ReservationError("No seats selected.")

    screening = db.get(Screening, screening_id)
    if screening is None:
        raise ReservationError("Screening not found.")

    base_price = Decimal(str(screening.ticket_price))
    final_price, rate = calculate_price(base_price, customer.total_reservations)

    reservations: list[Reservation] = []
    for seat_id in unique_ids:
        seat = db.get(Seat, seat_id)
        if seat is None:
            raise ReservationError(f"Seat {seat_id} not found.")
        if seat.hall_id != screening.hall_id:
            raise ReservationError("Seat does not belong to the screening's hall.")
        if not is_seat_available(db, screening_id, seat_id):
            raise ReservationError(
                f"Seat {seat.row}{seat.number} is already reserved for this screening."
            )
        reservations.append(
            Reservation(
                customer_id=customer.id,
                screening_id=screening_id,
                seat_id=seat_id,
                status="confirmed",
                price=final_price,
                discount_applied=rate,
            )
        )

    db.add_all(reservations)
    customer.total_reservations += len(reservations)
    db.commit()
    for reservation in reservations:
        db.refresh(reservation)
    return reservations


def cancel_reservation(db: Session, reservation: Reservation) -> Reservation:
    if reservation.status == "cancelled":
        return reservation
    reservation.status = "cancelled"
    customer = db.get(Customer, reservation.customer_id)
    if customer and customer.total_reservations > 0:
        customer.total_reservations -= 1
    db.commit()
    db.refresh(reservation)
    return reservation
