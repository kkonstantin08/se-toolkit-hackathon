"""add parse_source to parsed_drafts

Revision ID: 0002_add_parse_source
Revises: 0001_initial
Create Date: 2026-04-04 12:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0002_add_parse_source"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("parsed_drafts")}
    if "parse_source" in existing_columns:
        return

    op.add_column(
        "parsed_drafts",
        sa.Column("parse_source", sa.String(length=32), nullable=False, server_default="fallback"),
    )
    op.alter_column("parsed_drafts", "parse_source", server_default=None)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("parsed_drafts")}
    if "parse_source" not in existing_columns:
        return

    op.drop_column("parsed_drafts", "parse_source")

