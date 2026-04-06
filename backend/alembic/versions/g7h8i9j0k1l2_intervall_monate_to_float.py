"""Change pruef_intervall_monate from Integer to Float

Revision ID: g7h8i9j0k1l2
Revises: f6g7h8i9j0k1
Create Date: 2026-03-29
"""
from alembic import op
import sqlalchemy as sa

revision = 'g7h8i9j0k1l2'
down_revision = 'f6g7h8i9j0k1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        'arbeitsmittel',
        'pruef_intervall_monate',
        existing_type=sa.Integer(),
        type_=sa.Float(),
        existing_nullable=False,
        existing_server_default=sa.text('12'),
    )


def downgrade() -> None:
    op.alter_column(
        'arbeitsmittel',
        'pruef_intervall_monate',
        existing_type=sa.Float(),
        type_=sa.Integer(),
        existing_nullable=False,
        existing_server_default=sa.text('12'),
    )
