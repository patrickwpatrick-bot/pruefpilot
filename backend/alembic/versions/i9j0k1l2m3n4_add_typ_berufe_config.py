"""Add typ/unternehmen to mitarbeiter, berufe_config to organisation

Revision ID: i9j0k1l2m3n4
Revises: h8i9j0k1l2m3
"""
from alembic import op
import sqlalchemy as sa

revision = 'i9j0k1l2m3n4'
down_revision = 'h8i9j0k1l2m3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Mitarbeiter: add typ and unternehmen columns
    op.add_column('mitarbeiter', sa.Column('typ', sa.String(20), server_default='intern'))
    op.add_column('mitarbeiter', sa.Column('unternehmen', sa.String(255)))

    # Organisation: add berufe_config JSON column
    op.add_column('organisationen', sa.Column('berufe_config', sa.Text()))


def downgrade() -> None:
    op.drop_column('mitarbeiter', 'typ')
    op.drop_column('mitarbeiter', 'unternehmen')
    op.drop_column('organisationen', 'berufe_config')
