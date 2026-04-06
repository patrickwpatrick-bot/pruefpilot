"""Expand Standort model with additional address fields

Revision ID: f6g7h8i9j0k1
Revises: e5f6g7h8i9j0
"""
from alembic import op
import sqlalchemy as sa


revision = 'f6g7h8i9j0k1'
down_revision = 'e5f6g7h8i9j0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('standorte', sa.Column('hausnummer', sa.String(255), nullable=True))
    op.add_column('standorte', sa.Column('gebaeude', sa.String(255), nullable=True))
    op.add_column('standorte', sa.Column('abteilung', sa.String(255), nullable=True))
    op.add_column('standorte', sa.Column('etage', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('standorte', 'etage')
    op.drop_column('standorte', 'abteilung')
    op.drop_column('standorte', 'gebaeude')
    op.drop_column('standorte', 'hausnummer')
