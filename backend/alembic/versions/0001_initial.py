"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-04-04 13:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("timezone", sa.String(length=64), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("refresh_token_hash", sa.String(length=128), nullable=False),
        sa.Column("user_agent", sa.String(length=255), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "recurrence_rules",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("frequency", sa.String(length=32), nullable=False),
        sa.Column("interval", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("by_weekdays", sa.JSON(), nullable=True),
        sa.Column("day_of_month", sa.Integer(), nullable=True),
        sa.Column("ends_on", sa.Date(), nullable=True),
        sa.Column("occurrence_count", sa.Integer(), nullable=True),
        sa.Column("timezone", sa.String(length=64), nullable=False),
    )

    op.create_table(
        "planner_items",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item_type", sa.String(length=16), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("all_day", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("color", sa.String(length=32), nullable=True),
        sa.Column("is_recurring", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("recurrence_rule_id", sa.String(length=36), sa.ForeignKey("recurrence_rules.id", ondelete="SET NULL"), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_planner_items_user_id", "planner_items", ["user_id"])

    op.create_table(
        "reminders",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("planner_item_id", sa.String(length=36), sa.ForeignKey("planner_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("trigger_mode", sa.String(length=16), nullable=False),
        sa.Column("offset_minutes", sa.Integer(), nullable=True),
        sa.Column("absolute_trigger_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("channel", sa.String(length=16), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("last_fired_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "occurrence_states",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("planner_item_id", sa.String(length=36), sa.ForeignKey("planner_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("occurrence_date", sa.Date(), nullable=False),
        sa.Column("completion_status", sa.String(length=32), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_skipped", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.UniqueConstraint("planner_item_id", "occurrence_date", name="uq_occurrence_item_date"),
    )

    op.create_table(
        "parsed_drafts",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("raw_text", sa.Text(), nullable=False),
        sa.Column("parsed_payload_json", sa.JSON(), nullable=False),
        sa.Column("warnings_json", sa.JSON(), nullable=False),
        sa.Column("parse_status", sa.String(length=32), nullable=False),
        sa.Column("parse_source", sa.String(length=32), nullable=False),
        sa.Column("model_name", sa.String(length=128), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "integration_metadata",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(length=64), nullable=False),
        sa.Column("provider_email", sa.String(length=255), nullable=True),
        sa.Column("encrypted_refresh_token", sa.Text(), nullable=True),
        sa.Column("scopes", sa.JSON(), nullable=False),
        sa.Column("default_calendar_id", sa.String(length=255), nullable=True),
        sa.Column("connected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "sync_state",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("planner_item_id", sa.String(length=36), sa.ForeignKey("planner_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("integration_id", sa.String(length=36), sa.ForeignKey("integration_metadata.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(length=64), nullable=False),
        sa.Column("external_object_id", sa.String(length=255), nullable=True),
        sa.Column("sync_status", sa.String(length=32), nullable=False),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.UniqueConstraint("planner_item_id", "integration_id", name="uq_sync_item_integration"),
    )


def downgrade() -> None:
    op.drop_table("sync_state")
    op.drop_table("integration_metadata")
    op.drop_table("parsed_drafts")
    op.drop_table("occurrence_states")
    op.drop_table("reminders")
    op.drop_index("ix_planner_items_user_id", table_name="planner_items")
    op.drop_table("planner_items")
    op.drop_table("recurrence_rules")
    op.drop_table("auth_sessions")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
