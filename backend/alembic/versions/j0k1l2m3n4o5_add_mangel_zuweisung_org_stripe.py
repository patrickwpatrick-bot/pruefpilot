"""Add mangel zuweisung/behoben_von + organisation stripe_subscription_id/plan_aktiv_seit

Revision ID: j0k1l2m3n4o5
Revises: i9j0k1l2m3n4
"""
from alembic import op
import sqlalchemy as sa

revision = 'j0k1l2m3n4o5'
down_revision = 'i9j0k1l2m3n4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Mangel: wer ist zugewiesen + wer hat behoben
    op.add_column('maengel', sa.Column('zugewiesen_an', sa.String(255), nullable=True))
    op.add_column('maengel', sa.Column('behoben_von_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True))

    # Organisation: Stripe Subscription ID + Plan-Aktivierungsdatum
    op.add_column('organisationen', sa.Column('stripe_subscription_id', sa.String(255), nullable=True))
    op.add_column('organisationen', sa.Column('plan_aktiv_seit', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('maengel', 'zugewiesen_an')
    op.drop_column('maengel', 'behoben_von_id')
    op.drop_column('organisationen', 'stripe_subscription_id')
    op.drop_column('organisationen', 'plan_aktiv_seit')
