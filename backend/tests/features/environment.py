from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base


def before_scenario(context, scenario):
    context.engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=context.engine)
    context.Session = sessionmaker(bind=context.engine)
    context.db = context.Session()
    context.customers = {}
    context.last_error = None
    context.reservations = {}


def after_scenario(context, scenario):
    context.db.close()
    Base.metadata.drop_all(bind=context.engine)
