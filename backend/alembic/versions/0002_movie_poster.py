"""add poster_url to movies

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("movies", sa.Column("poster_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("movies", "poster_url")
