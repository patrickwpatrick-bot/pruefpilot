"""Add audit_logs table

Revision ID: e5f6g7h8i9j0
Revises: d4e5f6g7h8i9
"""
from alembic import op
import sqlalchemy as sa


revision = 'e5f6g7h8i9j0'
down_revision = 'd4e5f6g7h8i9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('organisation_id', sa.String(36), sa.ForeignKey('organisationen.id'), nullable=False, index=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('user_name', sa.String(255), nullable=False),
        sa.Column('aktion', sa.String(50), nullable=False),
        sa.Column('entitaet', sa.String(100), nullable=False),
        sa.Column('entitaet_id', sa.String(36), nullable=False),
        sa.Column('entitaet_name', sa.String(255), nullable=True),
        sa.Column('aenderungen', sa.JSON(), nullable=True),
        sa.Column('vorher_snapshot', sa.JSON(), nullable=True),
        sa.Column('nachher_snapshot', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('audit_logs')
