"""Add Verantwortlicher fields to Organisation

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6g7h8
"""
from alembic import op
import sqlalchemy as sa

revision = 'd4e5f6g7h8i9'
down_revision = 'c3d4e5f6g7h8'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('organisationen', sa.Column('verantwortlicher_name', sa.String(255)))
    op.add_column('organisationen', sa.Column('verantwortlicher_email', sa.String(255)))
    op.add_column('organisationen', sa.Column('verantwortlicher_telefon', sa.String(50)))

def downgrade() -> None:
    op.drop_column('organisationen', 'verantwortlicher_telefon')
    op.drop_column('organisationen', 'verantwortlicher_email')
    op.drop_column('organisationen', 'verantwortlicher_name')
