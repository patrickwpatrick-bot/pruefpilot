"""Add Mitarbeiter system, Abteilungen, Zuweisungen

Revision ID: c3d4e5f6g7h8
Revises: b2f3a4c5d6e7
"""
from alembic import op
import sqlalchemy as sa

revision = 'c3d4e5f6g7h8'
down_revision = 'b2f3a4c5d6e7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Abteilungen
    op.create_table(
        'abteilungen',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('organisation_id', sa.String(36), sa.ForeignKey('organisationen.id'), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Mitarbeiter
    op.create_table(
        'mitarbeiter',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('organisation_id', sa.String(36), sa.ForeignKey('organisationen.id'), nullable=False, index=True),
        sa.Column('abteilung_id', sa.String(36), sa.ForeignKey('abteilungen.id'), index=True),
        sa.Column('vorname', sa.String(100), nullable=False),
        sa.Column('nachname', sa.String(100), nullable=False),
        sa.Column('email', sa.String(255)),
        sa.Column('telefon', sa.String(50)),
        sa.Column('beruf', sa.String(255)),
        sa.Column('personalnummer', sa.String(50)),
        sa.Column('eintrittsdatum', sa.Date()),
        sa.Column('ist_aktiv', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Mitarbeiter Dokumente
    op.create_table(
        'mitarbeiter_dokumente',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('mitarbeiter_id', sa.String(36), sa.ForeignKey('mitarbeiter.id'), nullable=False, index=True),
        sa.Column('typ', sa.String(50), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('gueltig_bis', sa.Date()),
        sa.Column('bemerkung', sa.Text()),
        sa.Column('status', sa.String(20), server_default='gueltig'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Unterweisungs-Zuweisungen
    op.create_table(
        'unterweisungs_zuweisungen',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('vorlage_id', sa.String(36), sa.ForeignKey('unterweisungs_vorlagen.id'), nullable=False, index=True),
        sa.Column('mitarbeiter_id', sa.String(36), sa.ForeignKey('mitarbeiter.id'), nullable=False, index=True),
        sa.Column('organisation_id', sa.String(36), sa.ForeignKey('organisationen.id'), nullable=False, index=True),
        sa.Column('status', sa.String(20), server_default='offen'),
        sa.Column('faellig_am', sa.Date(), nullable=False),
        sa.Column('unterschrieben_am', sa.DateTime(timezone=True)),
        sa.Column('unterschrift_name', sa.String(255)),
        sa.Column('ip_adresse', sa.String(45)),
        sa.Column('user_agent', sa.Text()),
        sa.Column('gelesen_bestaetigt', sa.Boolean(), server_default='false'),
        sa.Column('sign_token', sa.String(64), unique=True, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Add new columns to unterweisungs_vorlagen
    op.add_column('unterweisungs_vorlagen', sa.Column('norm_referenz', sa.String(100)))
    op.add_column('unterweisungs_vorlagen', sa.Column('betroffene_qualifikationen', sa.Text()))
    op.add_column('unterweisungs_vorlagen', sa.Column('ist_pflicht_fuer_alle', sa.Boolean(), server_default='false'))


def downgrade() -> None:
    op.drop_column('unterweisungs_vorlagen', 'ist_pflicht_fuer_alle')
    op.drop_column('unterweisungs_vorlagen', 'betroffene_qualifikationen')
    op.drop_column('unterweisungs_vorlagen', 'norm_referenz')
    op.drop_table('unterweisungs_zuweisungen')
    op.drop_table('mitarbeiter_dokumente')
    op.drop_table('mitarbeiter')
    op.drop_table('abteilungen')
