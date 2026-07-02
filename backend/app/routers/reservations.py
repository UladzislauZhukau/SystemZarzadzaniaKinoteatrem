from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.email import send_email
from app.crud import customer as customer_crud
from app.crud import reservation as reservation_crud
from app.db.session import get_db
from app.deps import get_current_user, require_admin
from app.models.customer import Customer
from app.models.reservation import Reservation
from app.schemas.reservation import (
    BulkReservationCreate,
    GuestBulkReservationCreate,
    GuestReservationCreate,
    ReservationCreate,
    ReservationDetail,
    ReservationRead,
)

router = APIRouter(prefix="/reservations", tags=["reservations"])


def _confirmation_html(reservation: Reservation) -> str:
    screening = reservation.screening
    movie = screening.movie
    seat = reservation.seat
    discount_pct = int(float(reservation.discount_applied) * 100)
    return f"""
    <h2>Potwierdzenie rezerwacji / Reservation confirmation</h2>
    <p>Dziekujemy za rezerwacje w naszym kinoteatrze!</p>
    <ul>
      <li><b>Film:</b> {movie.title}</li>
      <li><b>Data seansu:</b> {screening.start_time:%Y-%m-%d %H:%M}</li>
      <li><b>Sala:</b> {screening.hall.name}</li>
      <li><b>Miejsce:</b> rzad {seat.row}, nr {seat.number}</li>
      <li><b>Cena:</b> {reservation.price} PLN {'(rabat ' + str(discount_pct) + '%)' if discount_pct else ''}</li>
      <li><b>Status:</b> {reservation.status}</li>
    </ul>
    """


def _confirmation_html_multi(reservations: list[Reservation]) -> str:
    first = reservations[0]
    screening = first.screening
    movie = screening.movie
    total = sum(float(r.price) for r in reservations)
    discount_pct = int(float(first.discount_applied) * 100)
    seats_html = "".join(
        f"<li>rzad {r.seat.row}, nr {r.seat.number} - {r.price} PLN</li>"
        for r in reservations
    )
    return f"""
    <h2>Potwierdzenie rezerwacji / Reservation confirmation</h2>
    <p>Dziekujemy za rezerwacje w naszym kinoteatrze!</p>
    <ul>
      <li><b>Film:</b> {movie.title}</li>
      <li><b>Data seansu:</b> {screening.start_time:%Y-%m-%d %H:%M}</li>
      <li><b>Sala:</b> {screening.hall.name}</li>
    </ul>
    <p><b>Zarezerwowane miejsca:</b></p>
    <ul>{seats_html}</ul>
    <p><b>Razem:</b> {total:.2f} PLN {'(rabat ' + str(discount_pct) + '%)' if discount_pct else ''}</p>
    """


@router.get("", response_model=list[ReservationDetail])
def list_my_reservations(
    current_user: Customer = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return reservation_crud.get_reservations_for_customer(db, current_user.id)


@router.get("/all", response_model=list[ReservationDetail],
            dependencies=[Depends(require_admin)])
def list_all_reservations(db: Session = Depends(get_db)):
    return reservation_crud.get_all_reservations(db)


@router.post("", response_model=ReservationDetail, status_code=status.HTTP_201_CREATED)
def create_reservation(
    data: ReservationCreate,
    background_tasks: BackgroundTasks,
    current_user: Customer = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        reservation = reservation_crud.create_reservation(
            db, current_user, data.screening_id, data.seat_id
        )
    except reservation_crud.ReservationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    background_tasks.add_task(
        send_email,
        "Potwierdzenie rezerwacji - Kinoteatr",
        current_user.email,
        _confirmation_html(reservation),
    )
    return reservation


@router.post("/bulk", response_model=list[ReservationDetail],
             status_code=status.HTTP_201_CREATED)
def create_bulk_reservation(
    data: BulkReservationCreate,
    background_tasks: BackgroundTasks,
    current_user: Customer = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        reservations = reservation_crud.create_reservations(
            db, current_user, data.screening_id, data.seat_ids
        )
    except reservation_crud.ReservationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    background_tasks.add_task(
        send_email,
        "Potwierdzenie rezerwacji - Kinoteatr",
        current_user.email,
        _confirmation_html_multi(reservations),
    )
    return reservations


@router.post("/guest/bulk", response_model=list[ReservationDetail],
             status_code=status.HTTP_201_CREATED)
def create_guest_bulk_reservation(
    data: GuestBulkReservationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    customer = customer_crud.get_or_create_guest(db, data.email)
    try:
        reservations = reservation_crud.create_reservations(
            db, customer, data.screening_id, data.seat_ids
        )
    except reservation_crud.ReservationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    background_tasks.add_task(
        send_email,
        "Potwierdzenie rezerwacji - Kinoteatr",
        data.email,
        _confirmation_html_multi(reservations),
    )
    return reservations


@router.post("/guest", response_model=ReservationDetail, status_code=status.HTTP_201_CREATED)
def create_guest_reservation(
    data: GuestReservationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Allow booking without logging in. The provided email is used to send the
    ticket confirmation and to key a (guest) customer record."""
    customer = customer_crud.get_or_create_guest(db, data.email)
    try:
        reservation = reservation_crud.create_reservation(
            db, customer, data.screening_id, data.seat_id
        )
    except reservation_crud.ReservationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    background_tasks.add_task(
        send_email,
        "Potwierdzenie rezerwacji - Kinoteatr",
        data.email,
        _confirmation_html(reservation),
    )
    return reservation


@router.post("/{reservation_id}/cancel", response_model=ReservationRead)
def cancel_reservation(
    reservation_id: int,
    current_user: Customer = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reservation = reservation_crud.get_reservation(db, reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if reservation.customer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    return reservation_crud.cancel_reservation(db, reservation)
