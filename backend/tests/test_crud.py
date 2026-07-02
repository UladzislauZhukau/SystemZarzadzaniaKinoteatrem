from decimal import Decimal

from app.crud import reservation as reservation_crud


def test_discount_rate_below_threshold():
    assert reservation_crud.discount_rate_for(0) == Decimal("0")
    assert reservation_crud.discount_rate_for(4) == Decimal("0")


def test_discount_rate_at_threshold():
    assert reservation_crud.discount_rate_for(5) == Decimal("0.1")
    assert reservation_crud.discount_rate_for(10) == Decimal("0.1")


def test_calculate_price_no_discount():
    final, rate = reservation_crud.calculate_price(Decimal("30.00"), 0)
    assert final == Decimal("30.00")
    assert rate == Decimal("0")


def test_calculate_price_with_loyalty_discount():
    final, rate = reservation_crud.calculate_price(Decimal("30.00"), 5)
    assert final == Decimal("27.00")
    assert rate == Decimal("0.1")


def test_seat_availability_and_booking(db_session, seeded):
    customer = seeded["customer"]
    screening = seeded["screening"]
    seat = seeded["seats"][0]

    assert reservation_crud.is_seat_available(db_session, screening.id, seat.id) is True

    reservation_crud.create_reservation(db_session, customer, screening.id, seat.id)

    # Seat is now taken
    assert reservation_crud.is_seat_available(db_session, screening.id, seat.id) is False
    assert customer.total_reservations == 1


def test_double_booking_raises(db_session, seeded):
    customer = seeded["customer"]
    screening = seeded["screening"]
    seat = seeded["seats"][0]

    reservation_crud.create_reservation(db_session, customer, screening.id, seat.id)
    try:
        reservation_crud.create_reservation(db_session, customer, screening.id, seat.id)
        assert False, "Expected ReservationError"
    except reservation_crud.ReservationError:
        pass


def test_cancel_frees_seat(db_session, seeded):
    customer = seeded["customer"]
    screening = seeded["screening"]
    seat = seeded["seats"][0]

    res = reservation_crud.create_reservation(db_session, customer, screening.id, seat.id)
    reservation_crud.cancel_reservation(db_session, res)

    assert res.status == "cancelled"
    assert reservation_crud.is_seat_available(db_session, screening.id, seat.id) is True
    assert customer.total_reservations == 0
