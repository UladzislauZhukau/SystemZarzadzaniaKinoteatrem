from app.db.base_class import Base  # noqa: F401

# Import all models here so that Alembic's autogenerate and Base.metadata
# can discover them.
from app.models.customer import Customer  # noqa: E402,F401
from app.models.movie import Movie  # noqa: E402,F401
from app.models.hall import Hall  # noqa: E402,F401
from app.models.seat import Seat  # noqa: E402,F401
from app.models.screening import Screening  # noqa: E402,F401
from app.models.reservation import Reservation  # noqa: E402,F401
from app.models.review import Review  # noqa: E402,F401
