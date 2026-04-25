"""Add rate_limit_buckets table (SEC M1 Block 15 — Rate-Limit Memory-Leak fix)

Revision ID: k1l2m3n4o5p6
Revises: j0k1l2m3n4o5
"""
from alembic import op
import sqlalchemy as sa

revision = 'k1l2m3n4o5p6'
down_revision = 'j0k1l2m3n4o5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Zähler-Bucket pro Key (IP + Auth-Token-Prefix). window_start_ts ist
    # Unix-Sekunden als BIGINT — portabler + schneller für die Hot-Path-Query
    # als TIMESTAMPTZ.
    op.create_table(
        'rate_limit_buckets',
        sa.Column('bucket_key', sa.String(255), primary_key=True),
        sa.Column('hit_count', sa.Integer, nullable=False, server_default='0'),
        sa.Column('window_start_ts', sa.BigInteger, nullable=False),
    )
    op.create_index(
        'ix_rate_limit_buckets_window_start',
        'rate_limit_buckets',
        ['window_start_ts'],
    )


def downgrade() -> None:
    op.drop_index('ix_rate_limit_buckets_window_start', table_name='rate_limit_buckets')
    op.drop_table('rate_limit_buckets')
