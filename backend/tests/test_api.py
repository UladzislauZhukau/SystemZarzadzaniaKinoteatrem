def auth_headers(client, email, password):
    resp = client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def test_health(client):
    assert client.get("/health").json() == {"status": "healthy"}


def test_register_and_login(client, db_session):
    resp = client.post(
        "/auth/register",
        json={"name": "New User", "email": "new@example.com", "password": "pass123"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["user"]["email"] == "new@example.com"
    assert "access_token" in body


def test_list_movies_public(client, seeded):
    resp = client.get("/movies")
    assert resp.status_code == 200
    assert any(m["title"] == "Inception" for m in resp.json())


def test_create_movie_requires_admin(client, seeded):
    # Customer cannot create
    headers = auth_headers(client, "jan@example.com", "test123")
    resp = client.post("/movies", json={"title": "X"}, headers=headers)
    assert resp.status_code == 403

    # Admin can create
    headers = auth_headers(client, "admin@example.com", "admin123")
    resp = client.post("/movies", json={"title": "New Movie"}, headers=headers)
    assert resp.status_code == 201
    assert resp.json()["title"] == "New Movie"


def test_reservation_flow_and_email(client, seeded):
    headers = auth_headers(client, "jan@example.com", "test123")
    screening = seeded["screening"]
    seat = seeded["seats"][0]

    resp = client.post(
        "/reservations",
        json={"screening_id": screening.id, "seat_id": seat.id},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["status"] == "confirmed"
    assert data["seat"]["id"] == seat.id

    # Booking same seat again fails
    resp2 = client.post(
        "/reservations",
        json={"screening_id": screening.id, "seat_id": seat.id},
        headers=headers,
    )
    assert resp2.status_code == 400

    # Seat no longer in available list
    avail = client.get(f"/screenings/{screening.id}/available-seats").json()
    assert all(s["id"] != seat.id for s in avail)


def test_seatmap_reflects_taken_seats(client, seeded):
    screening = seeded["screening"]
    seat = seeded["seats"][0]

    # Initially all seats are free.
    seatmap = client.get(f"/screenings/{screening.id}/seatmap").json()
    assert len(seatmap) == len(seeded["seats"])
    assert all(s["taken"] is False for s in seatmap)

    # Book one seat as a guest.
    resp = client.post(
        "/reservations/guest",
        json={
            "screening_id": screening.id,
            "seat_id": seat.id,
            "email": "guest@example.com",
        },
    )
    assert resp.status_code == 201, resp.text

    seatmap = client.get(f"/screenings/{screening.id}/seatmap").json()
    taken = [s for s in seatmap if s["taken"]]
    assert len(taken) == 1
    assert taken[0]["id"] == seat.id


def test_guest_reservation_creates_booking(client, seeded):
    screening = seeded["screening"]
    seat = seeded["seats"][1]

    resp = client.post(
        "/reservations/guest",
        json={
            "screening_id": screening.id,
            "seat_id": seat.id,
            "email": "newguest@example.com",
        },
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["status"] == "confirmed"
    assert data["seat"]["id"] == seat.id

    # Same seat cannot be booked again.
    resp2 = client.post(
        "/reservations/guest",
        json={
            "screening_id": screening.id,
            "seat_id": seat.id,
            "email": "another@example.com",
        },
    )
    assert resp2.status_code == 400


def test_bulk_reservation_books_multiple_seats(client, seeded):
    headers = auth_headers(client, "jan@example.com", "test123")
    screening = seeded["screening"]
    seat_ids = [seeded["seats"][0].id, seeded["seats"][2].id]

    resp = client.post(
        "/reservations/bulk",
        json={"screening_id": screening.id, "seat_ids": seat_ids},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert len(data) == 2
    assert {r["seat"]["id"] for r in data} == set(seat_ids)

    # All booked seats now show as taken.
    seatmap = client.get(f"/screenings/{screening.id}/seatmap").json()
    taken_ids = {s["id"] for s in seatmap if s["taken"]}
    assert set(seat_ids).issubset(taken_ids)


def test_bulk_reservation_is_atomic(client, seeded):
    headers = auth_headers(client, "jan@example.com", "test123")
    screening = seeded["screening"]
    free_seat = seeded["seats"][3].id
    taken_seat = seeded["seats"][4].id

    # Pre-book one seat as a guest.
    client.post(
        "/reservations/guest",
        json={
            "screening_id": screening.id,
            "seat_id": taken_seat,
            "email": "occupier@example.com",
        },
    )

    # Bulk request including the already-taken seat must fail entirely.
    resp = client.post(
        "/reservations/bulk",
        json={"screening_id": screening.id, "seat_ids": [free_seat, taken_seat]},
        headers=headers,
    )
    assert resp.status_code == 400

    # The free seat must NOT have been booked (atomic rollback).
    seatmap = client.get(f"/screenings/{screening.id}/seatmap").json()
    free_status = next(s for s in seatmap if s["id"] == free_seat)
    assert free_status["taken"] is False


def test_movie_lookup_autofill(client, seeded, monkeypatch):
    from app.services import omdb

    def fake_lookup(title=None, imdb_id=None):
        return {
            "title": "Inception",
            "genre": "Sci-Fi, Action",
            "description": "A thief who steals corporate secrets...",
            "duration_min": 148,
            "rating": 8.8,
            "poster_url": "https://example.com/inception.jpg",
        }

    monkeypatch.setattr(omdb, "lookup_movie", fake_lookup)

    headers = auth_headers(client, "admin@example.com", "admin123")
    resp = client.get("/movies/lookup", params={"title": "Inception"}, headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["title"] == "Inception"
    assert data["duration_min"] == 148
    assert data["poster_url"] == "https://example.com/inception.jpg"


def test_movie_lookup_includes_trailer(client, seeded, monkeypatch):
    from app.services import omdb, tmdb

    def fake_lookup(title=None, imdb_id=None):
        return {
            "title": "Inception",
            "genre": "Sci-Fi",
            "description": "...",
            "duration_min": 148,
            "rating": 8.8,
            "poster_url": "https://example.com/inception.jpg",
        }

    monkeypatch.setattr(omdb, "lookup_movie", fake_lookup)
    monkeypatch.setattr(
        tmdb, "find_trailer", lambda title: "https://www.youtube.com/embed/abc123"
    )

    headers = auth_headers(client, "admin@example.com", "admin123")
    resp = client.get("/movies/lookup", params={"title": "Inception"}, headers=headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["trailer_url"] == "https://www.youtube.com/embed/abc123"


def test_movie_lookup_requires_admin(client, seeded):
    headers = auth_headers(client, "jan@example.com", "test123")
    resp = client.get("/movies/lookup", params={"title": "Inception"}, headers=headers)
    assert resp.status_code == 403


def test_imdb_search_suggestions(client, seeded, monkeypatch):
    from app.services import omdb

    def fake_search(query, limit=8):
        return [
            {
                "title": "Inception",
                "year": "2010",
                "imdb_id": "tt1375666",
                "poster_url": "https://example.com/inception.jpg",
            }
        ]

    monkeypatch.setattr(omdb, "search_movies", fake_search)

    headers = auth_headers(client, "admin@example.com", "admin123")
    resp = client.get(
        "/movies/imdb-search", params={"query": "incep"}, headers=headers
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data[0]["imdb_id"] == "tt1375666"
    assert data[0]["year"] == "2010"


def test_imdb_search_requires_admin(client, seeded):
    headers = auth_headers(client, "jan@example.com", "test123")
    resp = client.get(
        "/movies/imdb-search", params={"query": "incep"}, headers=headers
    )
    assert resp.status_code == 403


def test_movie_lookup_by_imdb_id(client, seeded, monkeypatch):
    from app.services import omdb, tmdb

    captured = {}

    def fake_lookup(title=None, imdb_id=None):
        captured["title"] = title
        captured["imdb_id"] = imdb_id
        return {
            "title": "Inception",
            "genre": "Sci-Fi",
            "description": "...",
            "duration_min": 148,
            "rating": 8.8,
            "poster_url": "https://example.com/inception.jpg",
        }

    monkeypatch.setattr(omdb, "lookup_movie", fake_lookup)
    monkeypatch.setattr(tmdb, "find_trailer", lambda title: None)

    headers = auth_headers(client, "admin@example.com", "admin123")
    resp = client.get(
        "/movies/lookup", params={"imdb_id": "tt1375666"}, headers=headers
    )
    assert resp.status_code == 200, resp.text
    assert captured["imdb_id"] == "tt1375666"
    assert captured["title"] is None


def test_movie_lookup_not_found(client, seeded, monkeypatch):
    from app.services import omdb

    def fake_lookup(title=None, imdb_id=None):
        raise omdb.OMDbError("Movie not found.")

    monkeypatch.setattr(omdb, "lookup_movie", fake_lookup)

    headers = auth_headers(client, "admin@example.com", "admin123")
    resp = client.get("/movies/lookup", params={"title": "zzzzz"}, headers=headers)
    assert resp.status_code == 404


def test_screening_overlap_rejected(client, seeded):
    from datetime import timedelta

    admin = auth_headers(client, "admin@example.com", "admin123")
    screening = seeded["screening"]  # movie is 148 min long

    # New screening in the same hall starting 1h in, while the first is still
    # running, must be rejected.
    overlap_start = screening.start_time + timedelta(minutes=60)
    resp = client.post(
        "/screenings",
        json={
            "movie_id": seeded["movie"].id,
            "hall_id": seeded["hall"].id,
            "start_time": overlap_start.isoformat(),
            "ticket_price": 25,
        },
        headers=admin,
    )
    assert resp.status_code == 400, resp.text


def test_screening_non_overlap_allowed(client, seeded):
    from datetime import timedelta

    admin = auth_headers(client, "admin@example.com", "admin123")
    screening = seeded["screening"]

    # Starting 3h later (after the 148-min film ends) is fine.
    later_start = screening.start_time + timedelta(hours=3)
    resp = client.post(
        "/screenings",
        json={
            "movie_id": seeded["movie"].id,
            "hall_id": seeded["hall"].id,
            "start_time": later_start.isoformat(),
            "ticket_price": 25,
        },
        headers=admin,
    )
    assert resp.status_code == 201, resp.text


def test_screening_accepts_utc_aware_timestamp(client, seeded):
    from datetime import timezone, timedelta

    admin = auth_headers(client, "admin@example.com", "admin123")
    # A different day, sent as a timezone-aware UTC string exactly like the
    # admin UI does via new Date(...).toISOString() ("...Z"). Must not clash
    # with the naive seeded screening.
    start = (seeded["screening"].start_time + timedelta(days=1)).replace(
        tzinfo=timezone.utc
    )
    resp = client.post(
        "/screenings",
        json={
            "movie_id": seeded["movie"].id,
            "hall_id": seeded["hall"].id,
            "start_time": start.isoformat(),
            "ticket_price": 20,
        },
        headers=admin,
    )
    assert resp.status_code == 201, resp.text


def test_screening_overlap_allowed_in_other_hall(client, seeded, db_session):
    from datetime import timezone

    from app.models.hall import Hall

    other_hall = Hall(name="Sala 2", capacity=4)
    db_session.add(other_hall)
    db_session.commit()

    admin = auth_headers(client, "admin@example.com", "admin123")
    screening = seeded["screening"]

    # Exact same instant as the seeded screening, sent as a timezone-aware UTC
    # string like the admin UI does, but in a different hall -> allowed.
    start = screening.start_time.replace(tzinfo=timezone.utc)
    resp = client.post(
        "/screenings",
        json={
            "movie_id": seeded["movie"].id,
            "hall_id": other_hall.id,
            "start_time": start.isoformat(),
            "ticket_price": 25,
        },
        headers=admin,
    )
    assert resp.status_code == 201, resp.text

    # ...while the SAME hall at that instant is still rejected.
    resp = client.post(
        "/screenings",
        json={
            "movie_id": seeded["movie"].id,
            "hall_id": seeded["hall"].id,
            "start_time": start.isoformat(),
            "ticket_price": 25,
        },
        headers=admin,
    )
    assert resp.status_code == 400, resp.text


def test_post_review_requires_auth(client, seeded):
    movie = seeded["movie"]
    resp = client.post(f"/movies/{movie.id}/reviews", json={"rating": 8})
    assert resp.status_code == 401


def test_post_review_invalid_rating(client, seeded):
    movie = seeded["movie"]
    headers = auth_headers(client, "jan@example.com", "test123")
    resp = client.post(
        f"/movies/{movie.id}/reviews", json={"rating": 11}, headers=headers
    )
    assert resp.status_code == 422


def test_post_and_get_review(client, seeded):
    movie = seeded["movie"]
    headers = auth_headers(client, "jan@example.com", "test123")

    resp = client.post(
        f"/movies/{movie.id}/reviews",
        json={"rating": 9, "comment": "Świetny film"},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["rating"] == 9
    assert body["author_name"] == "Jan Kowalski"

    listing = client.get(f"/movies/{movie.id}/reviews").json()
    assert listing["count"] == 1
    assert listing["average"] == 9.0
    assert listing["items"][0]["comment"] == "Świetny film"


def test_review_upsert_updates_existing(client, seeded):
    movie = seeded["movie"]
    headers = auth_headers(client, "jan@example.com", "test123")

    client.post(
        f"/movies/{movie.id}/reviews", json={"rating": 5}, headers=headers
    )
    client.post(
        f"/movies/{movie.id}/reviews",
        json={"rating": 10, "comment": "Zmieniam zdanie"},
        headers=headers,
    )

    listing = client.get(f"/movies/{movie.id}/reviews").json()
    assert listing["count"] == 1
    assert listing["average"] == 10.0
    assert listing["items"][0]["comment"] == "Zmieniam zdanie"


def test_review_average_across_users(client, seeded):
    movie = seeded["movie"]

    jan = auth_headers(client, "jan@example.com", "test123")
    admin = auth_headers(client, "admin@example.com", "admin123")

    client.post(f"/movies/{movie.id}/reviews", json={"rating": 6}, headers=jan)
    client.post(f"/movies/{movie.id}/reviews", json={"rating": 10}, headers=admin)

    listing = client.get(f"/movies/{movie.id}/reviews").json()
    assert listing["count"] == 2
    assert listing["average"] == 8.0


def _post_review(client, movie_id, headers, rating=7, comment="Original"):
    resp = client.post(
        f"/movies/{movie_id}/reviews",
        json={"rating": rating, "comment": comment},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_author_can_edit_own_review(client, seeded):
    movie = seeded["movie"]
    jan = auth_headers(client, "jan@example.com", "test123")
    review = _post_review(client, movie.id, jan, rating=6, comment="Meh")

    resp = client.put(
        f"/movies/{movie.id}/reviews/{review['id']}",
        json={"rating": 10, "comment": "Actually great"},
        headers=jan,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["rating"] == 10
    assert body["comment"] == "Actually great"
    assert body["author_name"] == "Jan Kowalski"


def test_author_can_delete_own_review(client, seeded):
    movie = seeded["movie"]
    jan = auth_headers(client, "jan@example.com", "test123")
    review = _post_review(client, movie.id, jan)

    resp = client.delete(
        f"/movies/{movie.id}/reviews/{review['id']}", headers=jan
    )
    assert resp.status_code == 204, resp.text
    assert client.get(f"/movies/{movie.id}/reviews").json()["count"] == 0


def test_non_author_cannot_edit_or_delete(client, seeded, db_session):
    from app.core.security import hash_password
    from app.models.customer import Customer

    # Another regular customer who did NOT write the review.
    other = Customer(
        name="Other", email="other@example.com",
        hashed_password=hash_password("pw12345"), role="customer",
    )
    db_session.add(other)
    db_session.commit()

    movie = seeded["movie"]
    jan = auth_headers(client, "jan@example.com", "test123")
    review = _post_review(client, movie.id, jan)

    other_h = auth_headers(client, "other@example.com", "pw12345")
    assert client.put(
        f"/movies/{movie.id}/reviews/{review['id']}",
        json={"rating": 1}, headers=other_h,
    ).status_code == 403
    assert client.delete(
        f"/movies/{movie.id}/reviews/{review['id']}", headers=other_h
    ).status_code == 403


def test_admin_can_edit_and_delete_any_review(client, seeded):
    movie = seeded["movie"]
    jan = auth_headers(client, "jan@example.com", "test123")
    admin = auth_headers(client, "admin@example.com", "admin123")
    review = _post_review(client, movie.id, jan, comment="By Jan")

    # Admin edits someone else's review; author_name stays the original author.
    resp = client.put(
        f"/movies/{movie.id}/reviews/{review['id']}",
        json={"rating": 3, "comment": "Moderated"},
        headers=admin,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["author_name"] == "Jan Kowalski"

    # Admin deletes it.
    resp = client.delete(
        f"/movies/{movie.id}/reviews/{review['id']}", headers=admin
    )
    assert resp.status_code == 204
    assert client.get(f"/movies/{movie.id}/reviews").json()["count"] == 0


def test_edit_missing_review_returns_404(client, seeded):
    movie = seeded["movie"]
    jan = auth_headers(client, "jan@example.com", "test123")
    resp = client.put(
        f"/movies/{movie.id}/reviews/9999", json={"rating": 5}, headers=jan
    )
    assert resp.status_code == 404


def test_cancel_reservation(client, seeded):
    headers = auth_headers(client, "jan@example.com", "test123")
    screening = seeded["screening"]
    seat = seeded["seats"][1]

    res = client.post(
        "/reservations",
        json={"screening_id": screening.id, "seat_id": seat.id},
        headers=headers,
    ).json()

    resp = client.post(f"/reservations/{res['id']}/cancel", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "cancelled"
