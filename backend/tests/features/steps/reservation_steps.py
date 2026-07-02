from datetime import datetime, timedelta
from decimal import Decimal

from behave import given, then, when

from app.core.security import hash_password
from app.crud import reservation as reservation_crud
from app.models.customer import Customer
from app.models.hall import Hall
from app.models.movie import Movie
from app.models.screening import Screening
from app.models.seat import Seat


def _get_or_create_customer(context, name):
    if name in context.customers:
        return context.customers[name]
    email = name.lower().replace(" ", ".") + "@example.com"
    customer = Customer(
        name=name, email=email, hashed_password=hash_password("test123"), role="customer"
    )
    context.db.add(customer)
    context.db.commit()
    context.customers[name] = customer
    return customer


def _get_seat(context, label):
    row = label[0]
    number = int(label[1:])
    return (
        context.db.query(Seat)
        .filter(Seat.hall_id == context.hall.id, Seat.row == row, Seat.number == number)
        .first()
    )


@given('a screening exists for movie "{title}" priced at {price:d} PLN')
def step_create_screening(context, title, price):
    movie = Movie(title=title, genre="Sci-Fi", duration_min=148, rating=8.8)
    hall = Hall(name="Sala 1", capacity=6)
    context.db.add_all([movie, hall])
    context.db.flush()
    for r in ["A", "B"]:
        for n in range(1, 4):
            context.db.add(Seat(hall_id=hall.id, row=r, number=n))
    screening = Screening(
        movie_id=movie.id, hall_id=hall.id,
        start_time=datetime.now() + timedelta(days=1),
        ticket_price=Decimal(str(price)),
    )
    context.db.add(screening)
    context.db.commit()
    context.hall = hall
    context.screening = screening


@given('seat "{label}" is available')
def step_seat_available(context, label):
    seat = _get_seat(context, label)
    assert reservation_crud.is_seat_available(context.db, context.screening.id, seat.id)


@given('customer "{name}" already has {count:d} confirmed reservations')
def step_customer_history(context, name, count):
    customer = _get_or_create_customer(context, name)
    customer.total_reservations = count
    context.db.commit()


@when('customer "{name}" reserves seat "{label}"')
def step_reserve(context, name, label):
    customer = _get_or_create_customer(context, name)
    seat = _get_seat(context, label)
    context.last_reservation = reservation_crud.create_reservation(
        context.db, customer, context.screening.id, seat.id
    )
    context.reservations[name] = context.last_reservation


@when('customer "{name}" tries to reserve seat "{label}"')
def step_try_reserve(context, name, label):
    customer = _get_or_create_customer(context, name)
    seat = _get_seat(context, label)
    try:
        reservation_crud.create_reservation(
            context.db, customer, context.screening.id, seat.id
        )
        context.last_error = None
    except reservation_crud.ReservationError as exc:
        context.last_error = exc


@when('customer "{name}" cancels the reservation')
def step_cancel(context, name):
    reservation = context.reservations[name]
    reservation_crud.cancel_reservation(context.db, reservation)


@then('the reservation is created with status "{status}"')
def step_check_status(context, status):
    assert context.last_reservation.status == status


@then("the reservation price is {price:f} PLN")
def step_check_price(context, price):
    assert Decimal(str(context.last_reservation.price)) == Decimal(str(price))


@then("a discount of {pct:d} percent is applied")
def step_check_discount(context, pct):
    assert Decimal(str(context.last_reservation.discount_applied)) == Decimal(pct) / 100


@then("the second reservation is rejected")
def step_check_rejected(context):
    assert context.last_error is not None


@then('seat "{label}" is available again')
def step_seat_available_again(context, label):
    seat = _get_seat(context, label)
    assert reservation_crud.is_seat_available(context.db, context.screening.id, seat.id)
