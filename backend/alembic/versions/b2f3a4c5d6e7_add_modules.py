"""add unterweisungen, gbu, gefahrstoffe, fremdfirmen modules

Revision ID: b2f3a4c5d6e7
Revises: 270a181cbfaa
Create Date: 2026-03-28 22:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision: str = 'b2f3a4c5d6e7'
down_revision: Union[str, None] = '270a181cbfaa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Unterweisungs-Vorlagen
    op.create_table(
        'unterweisungs_vorlagen',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('organisation_id', sa.String(36), sa.ForeignKey('organisationen.id'), nullable=True, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('beschreibung', sa.Text, nullable=True),
        sa.Column('kategorie', sa.String(100), nullable=False, server_default='allgemein'),
        sa.Column('inhalt', sa.Text, nullable=True),
        sa.Column('ist_system_template', sa.Boolean, server_default='false'),
        sa.Column('intervall_monate', sa.Integer, server_default='12'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Unterweisungs-Durchführungen
    op.create_table(
        'unterweisungs_durchfuehrungen',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('vorlage_id', sa.String(36), sa.ForeignKey('unterweisungs_vorlagen.id'), nullable=False, index=True),
        sa.Column('organisation_id', sa.String(36), sa.ForeignKey('organisationen.id'), nullable=False, index=True),
        sa.Column('durchgefuehrt_von_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('teilnehmer_name', sa.String(255), nullable=False),
        sa.Column('teilnehmer_email', sa.String(255), nullable=True),
        sa.Column('datum', sa.Date, nullable=False),
        sa.Column('unterschrift_name', sa.String(255), nullable=True),
        sa.Column('bemerkung', sa.Text, nullable=True),
        sa.Column('naechste_unterweisung_am', sa.Date, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Gefährdungsbeurteilungen
    op.create_table(
        'gefaehrdungsbeurteilungen',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('organisation_id', sa.String(36), sa.ForeignKey('organisationen.id'), nullable=False, index=True),
        sa.Column('titel', sa.String(255), nullable=False),
        sa.Column('arbeitsbereich', sa.String(255), nullable=False),
        sa.Column('erstellt_von_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('status', sa.String(20), server_default='entwurf'),
        sa.Column('datum', sa.Date, nullable=False),
        sa.Column('naechste_ueberpruefung_am', sa.Date, nullable=True),
        sa.Column('bemerkung', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # GBU Gefährdungen
    op.create_table(
        'gbu_gefaehrdungen',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('gbu_id', sa.String(36), sa.ForeignKey('gefaehrdungsbeurteilungen.id'), nullable=False, index=True),
        sa.Column('gefaehrdung', sa.Text, nullable=False),
        sa.Column('risikoklasse', sa.String(20), nullable=False, server_default='mittel'),
        sa.Column('bestehende_massnahmen', sa.Text, nullable=True),
        sa.Column('weitere_massnahmen', sa.Text, nullable=True),
        sa.Column('verantwortlich', sa.String(255), nullable=True),
        sa.Column('frist', sa.Date, nullable=True),
        sa.Column('status', sa.String(20), server_default='offen'),
        sa.Column('reihenfolge', sa.Integer, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Gefahrstoffe
    op.create_table(
        'gefahrstoffe',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('organisation_id', sa.String(36), sa.ForeignKey('organisationen.id'), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('hersteller', sa.String(255), nullable=True),
        sa.Column('cas_nummer', sa.String(50), nullable=True),
        sa.Column('gefahrenklasse', sa.String(100), nullable=True),
        sa.Column('h_saetze', sa.Text, nullable=True),
        sa.Column('p_saetze', sa.Text, nullable=True),
        sa.Column('signalwort', sa.String(50), nullable=True),
        sa.Column('lagerort', sa.String(255), nullable=True),
        sa.Column('menge', sa.String(100), nullable=True),
        sa.Column('sicherheitsdatenblatt_url', sa.Text, nullable=True),
        sa.Column('betriebsanweisung_text', sa.Text, nullable=True),
        sa.Column('letzte_aktualisierung', sa.Date, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Fremdfirmen
    op.create_table(
        'fremdfirmen',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('organisation_id', sa.String(36), sa.ForeignKey('organisationen.id'), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('ansprechpartner', sa.String(255), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('telefon', sa.String(50), nullable=True),
        sa.Column('taetigkeit', sa.String(255), nullable=True),
        sa.Column('status', sa.String(20), server_default='aktiv'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Fremdfirma-Dokumente
    op.create_table(
        'fremdfirma_dokumente',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('fremdfirma_id', sa.String(36), sa.ForeignKey('fremdfirmen.id'), nullable=False, index=True),
        sa.Column('typ', sa.String(100), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('gueltig_bis', sa.Date, nullable=True),
        sa.Column('status', sa.String(20), server_default='aktuell'),
        sa.Column('bemerkung', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('fremdfirma_dokumente')
    op.drop_table('fremdfirmen')
    op.drop_table('gefahrstoffe')
    op.drop_table('gbu_gefaehrdungen')
    op.drop_table('gefaehrdungsbeurteilungen')
    op.drop_table('unterweisungs_durchfuehrungen')
    op.drop_table('unterweisungs_vorlagen')
