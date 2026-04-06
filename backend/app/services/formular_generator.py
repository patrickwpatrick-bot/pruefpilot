"""
PDF Formular-Generator für professionelle Prüf-, Unterweisungs- und Verwaltungsdokumente.
Verwendet ReportLab für High-Quality PDF-Output mit Corporate Design.
"""
import io
from datetime import datetime
from typing import Optional, List, Dict, Any
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak,
    Image as RLImage, KeepTogether, PageTemplate, Frame
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from PIL import Image as PILImage
import requests
from io import BytesIO
import logging

logger = logging.getLogger(__name__)

# Farben
FARBE_PRIMÄR = colors.HexColor("#1e40af")  # Dunkelblau
FARBE_SEKUNDÄR = colors.HexColor("#f0f4ff")  # Hellblau
FARBE_GRÜN = colors.HexColor("#22c55e")  # Bestanden
FARBE_ORANGE = colors.HexColor("#f59e0b")  # Warnung/Mängel
FARBE_ROT = colors.HexColor("#ef4444")  # Nicht bestanden
FARBE_TEXT = colors.HexColor("#1f2937")  # Dunkelgrau
FARBE_BORDER = colors.HexColor("#d1d5db")  # Grau für Linien


class FormularGenerator:
    """Generiert professionelle PDF-Formulare mit Firmen-Corporate-Design."""

    def __init__(
        self,
        org_name: str,
        org_strasse: Optional[str] = None,
        org_plz: Optional[str] = None,
        org_ort: Optional[str] = None,
        org_telefon: Optional[str] = None,
        org_email: Optional[str] = None,
        logo_url: Optional[str] = None,
    ):
        """
        Initialisiert den Formular-Generator mit Firmendaten.

        Args:
            org_name: Firmenname
            org_strasse: Straße und Hausnummer
            org_plz: Postleitzahl
            org_ort: Ort
            org_telefon: Telefonnummer
            org_email: E-Mail-Adresse
            logo_url: URL zum Firmenlogo (optional)
        """
        self.org_name = org_name
        self.org_strasse = org_strasse
        self.org_plz = org_plz
        self.org_ort = org_ort
        self.org_telefon = org_telefon
        self.org_email = org_email
        self.logo_url = logo_url
        self.logo_image = None

        # Logo laden falls vorhanden
        if logo_url:
            self._load_logo()

    def _load_logo(self) -> None:
        """Lädt das Logo-Bild von der URL und speichert es."""
        try:
            response = requests.get(self.logo_url, timeout=5)
            if response.status_code == 200:
                self.logo_image = PILImage.open(BytesIO(response.content))
        except Exception as e:
            logger.warning(f"Fehler beim Laden des Logos: {e}")

    def _create_header(self, title: str, doc_number: Optional[str] = None) -> List:
        """
        Erstellt den Dokumentkopf mit Logo, Firmeninfo und Titel.

        Returns:
            Liste von Platypus-Elementen
        """
        elements = []

        # Firma Header Tabelle
        header_data = []

        # Logo und Firmeninfo nebeneinander
        logo_cell = ""
        if self.logo_image:
            try:
                # Logo in Speicher skalieren
                logo_io = BytesIO()
                self.logo_image.save(logo_io, format="PNG")
                logo_io.seek(0)
                logo_cell = RLImage(logo_io, width=25*mm, height=25*mm)
            except Exception as e:
                logger.warning(f"Fehler beim Rendern des Logos: {e}")
                logo_cell = ""

        # Firmentext
        firma_text = f"<b>{self.org_name}</b>"
        if self.org_strasse:
            firma_text += f"<br/>{self.org_strasse}"
        if self.org_plz and self.org_ort:
            firma_text += f"<br/>{self.org_plz} {self.org_ort}"
        if self.org_telefon or self.org_email:
            firma_text += "<br/>"
            if self.org_telefon:
                firma_text += f"Tel: {self.org_telefon}"
            if self.org_email:
                if self.org_telefon:
                    firma_text += " | "
                firma_text += f"E-Mail: {self.org_email}"

        style_firma = ParagraphStyle(
            "FirmaHeader",
            fontName="Helvetica-Bold",
            fontSize=11,
            textColor=FARBE_PRIMÄR,
            spaceAfter=6,
        )
        firma_para = Paragraph(firma_text, style_firma)

        # Header-Tabelle mit Logo und Firmeninfo
        if logo_cell:
            header_table_data = [
                [logo_cell, firma_para],
            ]
            header_table = Table(header_table_data, colWidths=[30*mm, 160*mm])
        else:
            header_table_data = [[firma_para]]
            header_table = Table(header_table_data, colWidths=[190*mm])

        header_table.setStyle(
            TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ])
        )
        elements.append(header_table)
        elements.append(Spacer(1, 3*mm))

        # Trennlinie
        from reportlab.platypus import HRFlowable
        hr = HRFlowable(width="100%", thickness=2, color=FARBE_PRIMÄR)
        elements.append(hr)
        elements.append(Spacer(1, 5*mm))

        # Dokumenttitel
        style_title = ParagraphStyle(
            "DocTitle",
            fontName="Helvetica-Bold",
            fontSize=18,
            textColor=FARBE_PRIMÄR,
            alignment=TA_CENTER,
            spaceAfter=6,
        )
        title_para = Paragraph(title, style_title)
        elements.append(title_para)

        # Datumszeile und Dokumentnummer
        doc_info = f"<font size=9>Datum: {datetime.now().strftime('%d.%m.%Y')}"
        if doc_number:
            doc_info += f" | Dokument-Nr: {doc_number}"
        doc_info += " | PrüfPilot</font>"

        style_info = ParagraphStyle(
            "DocInfo",
            fontName="Helvetica",
            fontSize=9,
            textColor=FARBE_TEXT,
            alignment=TA_CENTER,
            spaceAfter=10,
        )
        info_para = Paragraph(doc_info, style_info)
        elements.append(info_para)

        # Zweite Trennlinie
        hr2 = HRFlowable(width="100%", thickness=1, color=FARBE_BORDER)
        elements.append(hr2)
        elements.append(Spacer(1, 8*mm))

        return elements

    def _create_footer(self, doc) -> None:
        """Erstellt Fußzeile mit Seitenzahl."""
        # Dies wird in _add_page_footer implementiert
        pass

    async def pruefprotokoll(self, pruefung_data: Dict[str, Any]) -> bytes:
        """
        Generiert ein Prüfprotokoll-PDF.

        Args:
            pruefung_data: Dict mit Prüfungsdaten:
                - arbeitsmittel_name: Name des Arbeitsmittels
                - arbeitsmittel_typ: Typ (z.B. "Elektrowerkzeug")
                - seriennummer: Seriennummer
                - standort: Standort
                - pruefer_name: Name des Prüfers
                - pruef_punkte: Liste von Dicts mit {punkt, ok, mangel, na, bemerkung}
                - maengel: Liste von Dicts mit {nummer, beschreibung, schweregrad, frist}
                - gesamtergebnis: "bestanden", "maengel", "gesperrt"
                - unterschrift_name: Name des Unterzeichners

        Returns:
            PDF als Bytes
        """
        pdf_buffer = BytesIO()
        doc = SimpleDocTemplate(pdf_buffer, pagesize=A4)
        elements = []

        # Header mit Prüfprotokoll-Titel
        elements.extend(
            self._create_header(
                "PRÜFPROTOKOLL",
                doc_number=pruefung_data.get("pruefung_id", "---"),
            )
        )

        # Prüfungsdaten als Tabelle
        pruef_daten_table = Table(
            [
                ["Arbeitsmittel:", pruefung_data.get("arbeitsmittel_name", "---")],
                ["Typ:", pruefung_data.get("arbeitsmittel_typ", "---")],
                ["Seriennummer:", pruefung_data.get("seriennummer", "---")],
                ["Standort:", pruefung_data.get("standort", "---")],
                ["Prüfer:", pruefung_data.get("pruefer_name", "---")],
                ["Prüfdatum:", datetime.now().strftime("%d.%m.%Y")],
            ],
            colWidths=[50*mm, 140*mm],
        )
        pruef_daten_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (0, -1), FARBE_SEKUNDÄR),
                ("TEXTCOLOR", (0, 0), (-1, -1), FARBE_TEXT),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("GRID", (0, 0), (-1, -1), 1, FARBE_BORDER),
            ])
        )
        elements.append(pruef_daten_table)
        elements.append(Spacer(1, 8*mm))

        # Checkliste als Tabelle
        pruef_punkte = pruefung_data.get("pruef_punkte", [])
        if pruef_punkte:
            elements.append(Paragraph("<b>Prüfpunkte:</b>", ParagraphStyle("Heading", fontName="Helvetica-Bold", fontSize=11, textColor=FARBE_PRIMÄR, spaceAfter=6)))

            checklist_data = [["Nr.", "Prüfpunkt", "OK", "Mangel", "n.a.", "Bemerkung"]]
            for i, punkt in enumerate(pruef_punkte, 1):
                checklist_data.append([
                    str(i),
                    punkt.get("punkt", "---"),
                    "✓" if punkt.get("ok") else "",
                    "✓" if punkt.get("mangel") else "",
                    "✓" if punkt.get("na") else "",
                    punkt.get("bemerkung", ""),
                ])

            checklist_table = Table(
                checklist_data,
                colWidths=[12*mm, 90*mm, 15*mm, 20*mm, 15*mm, 48*mm],
            )
            checklist_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), FARBE_PRIMÄR),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("ALIGN", (1, 1), (1, -1), "LEFT"),
                    ("ALIGN", (5, 1), (5, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, FARBE_SEKUNDÄR]),
                    ("GRID", (0, 0), (-1, -1), 0.5, FARBE_BORDER),
                ])
            )
            elements.append(checklist_table)
            elements.append(Spacer(1, 8*mm))

        # Mängelliste
        maengel = pruefung_data.get("maengel", [])
        if maengel:
            elements.append(Paragraph("<b>Mängel:</b>", ParagraphStyle("Heading", fontName="Helvetica-Bold", fontSize=11, textColor=FARBE_PRIMÄR, spaceAfter=6)))

            for mangel in maengel:
                schweregrad = mangel.get("schweregrad", "mittel")
                if schweregrad == "kritisch":
                    farbe = FARBE_ROT
                elif schweregrad == "erheblich":
                    farbe = FARBE_ORANGE
                else:
                    farbe = FARBE_GRÜN

                mangel_text = f"""
                <b>Mangel {mangel.get('nummer', '---')}:</b> {mangel.get('beschreibung', '---')}<br/>
                <font color="{farbe.hexval()}">Schweregrad: {schweregrad}</font><br/>
                Frist: {mangel.get('frist', '---')}
                """
                elements.append(Paragraph(mangel_text, ParagraphStyle("Mangel", fontName="Helvetica", fontSize=9, spaceAfter=6, textColor=FARBE_TEXT)))

            elements.append(Spacer(1, 8*mm))

        # Gesamtergebnis
        gesamtergebnis = pruefung_data.get("gesamtergebnis", "---").upper()
        if gesamtergebnis == "BESTANDEN":
            farbe_result = FARBE_GRÜN
            symbol = "✓ BESTANDEN"
        elif gesamtergebnis == "MÄNGEL":
            farbe_result = FARBE_ORANGE
            symbol = "⚠ MÄNGEL VORHANDEN"
        else:
            farbe_result = FARBE_ROT
            symbol = "✗ NICHT BESTANDEN"

        result_para = Paragraph(
            f"<font size=14 color='{farbe_result.hexval()}'><b>{symbol}</b></font>",
            ParagraphStyle("Result", alignment=TA_CENTER, fontSize=14, spaceAfter=10),
        )
        elements.append(result_para)
        elements.append(Spacer(1, 10*mm))

        # Unterschriftenfelder
        sig_table = Table(
            [
                ["Prüfer", "", "Verantwortlicher"],
                ["__________________________", "", "__________________________"],
                [pruefung_data.get("pruefer_name", ""), "", pruefung_data.get("unterschrift_name", "")],
            ],
            colWidths=[60*mm, 10*mm, 60*mm],
        )
        sig_table.setStyle(
            TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ])
        )
        elements.append(sig_table)

        # PDF generieren
        doc.build(elements, onFirstPage=self._page_footer, onLaterPages=self._page_footer)
        return pdf_buffer.getvalue()

    async def unterweisungsnachweis(
        self, unterweisung_data: Dict[str, Any]
    ) -> bytes:
        """
        Generiert einen Unterweisungsnachweis als PDF.

        Args:
            unterweisung_data: Dict mit:
                - thema: Thema der Unterweisung
                - datum: Datum
                - unterweiser_name: Name des Unterweisters
                - rechtsgrundlage: z.B. "§ 12 ArbSchG"
                - inhalt_zusammenfassung: Text
                - teilnehmer: Liste von Dicts mit {name, abteilung}

        Returns:
            PDF als Bytes
        """
        pdf_buffer = BytesIO()
        doc = SimpleDocTemplate(pdf_buffer, pagesize=A4)
        elements = []

        # Header
        elements.extend(
            self._create_header(
                "UNTERWEISUNGSNACHWEIS",
                doc_number=unterweisung_data.get("unterweisung_id", "---"),
            )
        )

        # Unterweisungsdaten
        unterweis_table = Table(
            [
                ["Thema:", unterweisung_data.get("thema", "---")],
                ["Datum:", unterweisung_data.get("datum", datetime.now().strftime("%d.%m.%Y"))],
                ["Unterweiser:", unterweisung_data.get("unterweiser_name", "---")],
                ["Rechtsgrundlage:", unterweisung_data.get("rechtsgrundlage", "---")],
            ],
            colWidths=[50*mm, 140*mm],
        )
        unterweis_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (0, -1), FARBE_SEKUNDÄR),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 1, FARBE_BORDER),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ])
        )
        elements.append(unterweis_table)
        elements.append(Spacer(1, 8*mm))

        # Inhaltszusammenfassung
        if unterweisung_data.get("inhalt_zusammenfassung"):
            elements.append(
                Paragraph(
                    "<b>Inhaltszusammenfassung:</b>",
                    ParagraphStyle(
                        "Heading",
                        fontName="Helvetica-Bold",
                        fontSize=11,
                        textColor=FARBE_PRIMÄR,
                        spaceAfter=4,
                    ),
                )
            )
            elements.append(
                Paragraph(
                    unterweisung_data.get("inhalt_zusammenfassung", ""),
                    ParagraphStyle(
                        "Content",
                        fontName="Helvetica",
                        fontSize=10,
                        alignment=TA_JUSTIFY,
                        spaceAfter=8,
                    ),
                )
            )
            elements.append(Spacer(1, 8*mm))

        # Teilnehmerliste
        teilnehmer = unterweisung_data.get("teilnehmer", [])
        if teilnehmer:
            elements.append(
                Paragraph(
                    "<b>Teilnehmer:</b>",
                    ParagraphStyle(
                        "Heading",
                        fontName="Helvetica-Bold",
                        fontSize=11,
                        textColor=FARBE_PRIMÄR,
                        spaceAfter=4,
                    ),
                )
            )

            teilnehmer_data = [["Nr.", "Name", "Abteilung", "Unterschrift"]]
            for i, tn in enumerate(teilnehmer, 1):
                teilnehmer_data.append([
                    str(i),
                    tn.get("name", ""),
                    tn.get("abteilung", ""),
                    "____________________",
                ])

            teilnehmer_table = Table(
                teilnehmer_data,
                colWidths=[12*mm, 80*mm, 50*mm, 48*mm],
            )
            teilnehmer_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), FARBE_PRIMÄR),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, FARBE_SEKUNDÄR]),
                    ("GRID", (0, 0), (-1, -1), 0.5, FARBE_BORDER),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ])
            )
            elements.append(teilnehmer_table)
            elements.append(Spacer(1, 10*mm))

        # Unterschrift Unterweiser
        sig_table = Table(
            [
                ["Unterweiser", "", "Ort/Datum"],
                ["__________________________", "", "____________________"],
                [unterweisung_data.get("unterweiser_name", ""), "", ""],
            ],
            colWidths=[70*mm, 5*mm, 65*mm],
        )
        sig_table.setStyle(
            TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ])
        )
        elements.append(sig_table)

        # PDF generieren
        doc.build(elements, onFirstPage=self._page_footer, onLaterPages=self._page_footer)
        return pdf_buffer.getvalue()

    async def gefaehrdungsbeurteilung(self, gbu_data: Dict[str, Any]) -> bytes:
        """
        Generiert eine Gefährdungsbeurteilung als PDF.

        Args:
            gbu_data: Dict mit:
                - titel: Titel der GBU
                - abteilung: Betroffene Abteilung
                - erstellung_datum: Datum
                - verantwortlicher: Name
                - gefahren: Liste von Dicts mit {beschreibung, folgen, massnahmen, prioritaet}

        Returns:
            PDF als Bytes
        """
        pdf_buffer = BytesIO()
        doc = SimpleDocTemplate(pdf_buffer, pagesize=A4)
        elements = []

        # Header
        elements.extend(
            self._create_header(
                "GEFÄHRDUNGSBEURTEILUNG",
                doc_number=gbu_data.get("gbu_id", "---"),
            )
        )

        # GBU-Daten
        gbu_table = Table(
            [
                ["Thema:", gbu_data.get("titel", "---")],
                ["Abteilung:", gbu_data.get("abteilung", "---")],
                ["Erstellung:", gbu_data.get("erstellung_datum", datetime.now().strftime("%d.%m.%Y"))],
                ["Verantwortlich:", gbu_data.get("verantwortlicher", "---")],
            ],
            colWidths=[50*mm, 140*mm],
        )
        gbu_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (0, -1), FARBE_SEKUNDÄR),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 1, FARBE_BORDER),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ])
        )
        elements.append(gbu_table)
        elements.append(Spacer(1, 10*mm))

        # Gefährdungstabelle
        gefahren = gbu_data.get("gefahren", [])
        if gefahren:
            elements.append(
                Paragraph(
                    "<b>Identifizierte Gefährdungen und erforderliche Maßnahmen:</b>",
                    ParagraphStyle(
                        "Heading",
                        fontName="Helvetica-Bold",
                        fontSize=11,
                        textColor=FARBE_PRIMÄR,
                        spaceAfter=6,
                    ),
                )
            )

            gefahren_data = [["Gefährdung", "Mögliche Folgen", "Maßnahmen", "Priorität"]]
            for gefahr in gefahren:
                prioritaet = gefahr.get("prioritaet", "mittel").upper()
                if prioritaet == "HOCH":
                    prio_farbe = FARBE_ROT
                elif prioritaet == "MITTEL":
                    prio_farbe = FARBE_ORANGE
                else:
                    prio_farbe = FARBE_GRÜN

                gefahren_data.append([
                    gefahr.get("beschreibung", ""),
                    gefahr.get("folgen", ""),
                    gefahr.get("massnahmen", ""),
                    prioritaet,
                ])

            gefahren_table = Table(
                gefahren_data,
                colWidths=[50*mm, 45*mm, 55*mm, 40*mm],
            )
            gefahren_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), FARBE_PRIMÄR),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, FARBE_SEKUNDÄR]),
                    ("GRID", (0, 0), (-1, -1), 0.5, FARBE_BORDER),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ])
            )
            elements.append(gefahren_table)
            elements.append(Spacer(1, 10*mm))

        # Bestätigung und Unterschrift
        elements.append(
            Paragraph(
                "Ich bestätige, dass diese Gefährdungsbeurteilung nach bestem Wissen und Gewissen "
                "durchgeführt wurde und alle bekannten Gefährdungen berücksichtigt wurden.",
                ParagraphStyle(
                    "Confirm",
                    fontName="Helvetica",
                    fontSize=9,
                    alignment=TA_JUSTIFY,
                    spaceAfter=10,
                ),
            )
        )

        sig_table = Table(
            [
                ["Verantwortlicher", "", "Datum"],
                ["__________________________", "", "____________________"],
                [gbu_data.get("verantwortlicher", ""), "", ""],
            ],
            colWidths=[70*mm, 5*mm, 65*mm],
        )
        sig_table.setStyle(
            TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ])
        )
        elements.append(sig_table)

        # PDF generieren
        doc.build(elements, onFirstPage=self._page_footer, onLaterPages=self._page_footer)
        return pdf_buffer.getvalue()

    async def checkliste_leer(self, checkliste_data: Dict[str, Any]) -> bytes:
        """
        Generiert eine leere, druckbare Checkliste zum Ausfüllen vor Ort.

        Args:
            checkliste_data: Dict mit:
                - name: Name der Checkliste
                - beschreibung: Kurzbeschreibung
                - punkte: Liste von Strings (Prüfpunkte)

        Returns:
            PDF als Bytes
        """
        pdf_buffer = BytesIO()
        doc = SimpleDocTemplate(pdf_buffer, pagesize=A4)
        elements = []

        # Header
        elements.extend(
            self._create_header(
                "CHECKLISTE ZUM AUSFÜLLEN",
                doc_number=checkliste_data.get("checkliste_id", "---"),
            )
        )

        # Checklistenname
        if checkliste_data.get("name"):
            elements.append(
                Paragraph(
                    f"<b>{checkliste_data.get('name')}</b>",
                    ParagraphStyle(
                        "ChecklisteName",
                        fontName="Helvetica-Bold",
                        fontSize=12,
                        textColor=FARBE_PRIMÄR,
                        spaceAfter=6,
                    ),
                )
            )

        # Beschreibung
        if checkliste_data.get("beschreibung"):
            elements.append(
                Paragraph(
                    checkliste_data.get("beschreibung"),
                    ParagraphStyle(
                        "Description",
                        fontName="Helvetica",
                        fontSize=9,
                        spaceAfter=10,
                    ),
                )
            )

        elements.append(Spacer(1, 5*mm))

        # Leere Checkliste
        punkte = checkliste_data.get("punkte", [])
        if punkte:
            checklist_data = [["Nr.", "Prüfpunkt", "OK", "Mangel", "n.a.", "Bemerkungen"]]
            for i, punkt in enumerate(punkte, 1):
                checklist_data.append([
                    str(i),
                    punkt,
                    "☐",
                    "☐",
                    "☐",
                    "",
                ])

            checklist_table = Table(
                checklist_data,
                colWidths=[12*mm, 90*mm, 15*mm, 20*mm, 15*mm, 48*mm],
            )
            checklist_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), FARBE_PRIMÄR),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("ALIGN", (1, 1), (1, -1), "LEFT"),
                    ("ALIGN", (5, 1), (5, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, FARBE_SEKUNDÄR]),
                    ("GRID", (0, 0), (-1, -1), 0.5, FARBE_BORDER),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("MINHEIGHT", (0, 1), (-1, -1), 15),
                ])
            )
            elements.append(checklist_table)
            elements.append(Spacer(1, 10*mm))

        # Unterschriftenfelder
        elements.append(Spacer(1, 5*mm))
        sig_table = Table(
            [
                ["Geprüft von", "", "Datum", "", "Unterschrift"],
                ["____________________", "", "____________________", "", "____________________"],
            ],
            colWidths=[40*mm, 5*mm, 40*mm, 5*mm, 40*mm],
        )
        sig_table.setStyle(
            TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ])
        )
        elements.append(sig_table)

        # PDF generieren
        doc.build(elements, onFirstPage=self._page_footer, onLaterPages=self._page_footer)
        return pdf_buffer.getvalue()

    async def betriebsanweisung(self, data: Dict[str, Any]) -> bytes:
        """
        Generiert eine Betriebsanweisung (blau/orange/rot je nach Gefahrstoff).

        Args:
            data: Dict mit:
                - titel: Titel/Gefahrstoff-Name
                - gefahrenklasse: z.B. "Ätzend", "Giftig", "Explosiv"
                - symbole: Liste von Gefahrensymbolen
                - anwendungsbereich: Wo wird der Stoff verwendet
                - schutzausruestung: Erforderliche PSA
                - verhalten_im_notfall: Maßnahmen im Notfall
                - erste_hilfe: Erste-Hilfe-Maßnahmen
                - lagerung: Lagerbedingungen

        Returns:
            PDF als Bytes
        """
        pdf_buffer = BytesIO()
        doc = SimpleDocTemplate(pdf_buffer, pagesize=A4)
        elements = []

        # Gefahrenklasse bestimmen
        gefahrenklasse = data.get("gefahrenklasse", "").lower()
        if "giftig" in gefahrenklasse or "tödlich" in gefahrenklasse:
            kopf_farbe = FARBE_ROT
            text_farbe = colors.white
        elif "ätzend" in gefahrenklasse or "reiz" in gefahrenklasse:
            kopf_farbe = FARBE_ORANGE
            text_farbe = colors.white
        else:
            kopf_farbe = FARBE_PRIMÄR
            text_farbe = colors.white

        # Spezial-Header für Betriebsanweisung mit Gefahrenfarbe
        elements.append(Spacer(1, 3*mm))
        header_para = Paragraph(
            f"<b>BETRIEBSANWEISUNG</b>",
            ParagraphStyle(
                "BetriebsHeader",
                fontName="Helvetica-Bold",
                fontSize=16,
                textColor=kopf_farbe,
                alignment=TA_CENTER,
                spaceAfter=6,
            ),
        )
        elements.append(header_para)

        # Gefahrstoff-Name
        if data.get("titel"):
            elements.append(
                Paragraph(
                    f"Gefahrstoff: <b>{data.get('titel')}</b>",
                    ParagraphStyle(
                        "Gefahrstoff",
                        fontName="Helvetica",
                        fontSize=12,
                        textColor=kopf_farbe,
                        alignment=TA_CENTER,
                        spaceAfter=2,
                    ),
                )
            )

        # Gefahrenklasse
        if data.get("gefahrenklasse"):
            elements.append(
                Paragraph(
                    f"Gefahrenklasse: {data.get('gefahrenklasse')}",
                    ParagraphStyle(
                        "Gefahrenklasse",
                        fontName="Helvetica-Bold",
                        fontSize=10,
                        textColor=kopf_farbe,
                        alignment=TA_CENTER,
                        spaceAfter=8,
                    ),
                )
            )

        elements.append(Spacer(1, 5*mm))

        # Verschiedene Abschnitte
        if data.get("anwendungsbereich"):
            elements.append(
                Paragraph(
                    "<b>1. Anwendungsbereich</b>",
                    ParagraphStyle(
                        "SectionTitle",
                        fontName="Helvetica-Bold",
                        fontSize=11,
                        textColor=kopf_farbe,
                        spaceAfter=3,
                    ),
                )
            )
            elements.append(
                Paragraph(
                    data.get("anwendungsbereich"),
                    ParagraphStyle(
                        "SectionText",
                        fontName="Helvetica",
                        fontSize=9,
                        spaceAfter=6,
                    ),
                )
            )

        if data.get("schutzausruestung"):
            elements.append(
                Paragraph(
                    "<b>2. Erforderliche Schutzausrüstung (PSA)</b>",
                    ParagraphStyle(
                        "SectionTitle",
                        fontName="Helvetica-Bold",
                        fontSize=11,
                        textColor=kopf_farbe,
                        spaceAfter=3,
                    ),
                )
            )
            psa_items = data.get("schutzausruestung", [])
            if isinstance(psa_items, list):
                psa_text = "<br/>".join([f"• {item}" for item in psa_items])
            else:
                psa_text = psa_items
            elements.append(
                Paragraph(
                    psa_text,
                    ParagraphStyle(
                        "SectionText",
                        fontName="Helvetica",
                        fontSize=9,
                        spaceAfter=6,
                    ),
                )
            )

        if data.get("lagerung"):
            elements.append(
                Paragraph(
                    "<b>3. Lagerbedingungen</b>",
                    ParagraphStyle(
                        "SectionTitle",
                        fontName="Helvetica-Bold",
                        fontSize=11,
                        textColor=kopf_farbe,
                        spaceAfter=3,
                    ),
                )
            )
            elements.append(
                Paragraph(
                    data.get("lagerung"),
                    ParagraphStyle(
                        "SectionText",
                        fontName="Helvetica",
                        fontSize=9,
                        spaceAfter=6,
                    ),
                )
            )

        if data.get("verhalten_im_notfall"):
            elements.append(
                Paragraph(
                    "<b>4. Verhalten im Notfall</b>",
                    ParagraphStyle(
                        "SectionTitle",
                        fontName="Helvetica-Bold",
                        fontSize=11,
                        textColor=kopf_farbe,
                        spaceAfter=3,
                    ),
                )
            )
            elements.append(
                Paragraph(
                    data.get("verhalten_im_notfall"),
                    ParagraphStyle(
                        "SectionText",
                        fontName="Helvetica",
                        fontSize=9,
                        spaceAfter=6,
                    ),
                )
            )

        if data.get("erste_hilfe"):
            elements.append(
                Paragraph(
                    "<b>5. Erste Hilfe</b>",
                    ParagraphStyle(
                        "SectionTitle",
                        fontName="Helvetica-Bold",
                        fontSize=11,
                        textColor=kopf_farbe,
                        spaceAfter=3,
                    ),
                )
            )
            elements.append(
                Paragraph(
                    data.get("erste_hilfe"),
                    ParagraphStyle(
                        "SectionText",
                        fontName="Helvetica",
                        fontSize=9,
                        spaceAfter=6,
                    ),
                )
            )

        # Unterschrift
        elements.append(Spacer(1, 10*mm))
        sig_table = Table(
            [
                ["Aktualisiert", "", "Verantwortlicher"],
                ["____________________", "", "____________________"],
            ],
            colWidths=[70*mm, 5*mm, 65*mm],
        )
        sig_table.setStyle(
            TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ])
        )
        elements.append(sig_table)

        # PDF generieren
        doc.build(elements, onFirstPage=self._page_footer, onLaterPages=self._page_footer)
        return pdf_buffer.getvalue()

    async def maengelbericht(self, maengel_data: Dict[str, Any]) -> bytes:
        """
        Generiert einen Mängelbericht mit Details und Fristen.

        Args:
            maengel_data: Dict mit:
                - pruefung_id: ID der Prüfung
                - pruefer_name: Name des Prüfers
                - arbeitsmittel_name: Name des Geräts
                - maengel: Liste von Dicts mit {nr, beschreibung, schweregrad, frist, massnahme}

        Returns:
            PDF als Bytes
        """
        pdf_buffer = BytesIO()
        doc = SimpleDocTemplate(pdf_buffer, pagesize=A4)
        elements = []

        # Header
        elements.extend(
            self._create_header(
                "MÄNGELBERICHT",
                doc_number=maengel_data.get("pruefung_id", "---"),
            )
        )

        # Kopfdaten
        kopf_table = Table(
            [
                ["Arbeitsmittel:", maengel_data.get("arbeitsmittel_name", "---")],
                ["Geprüft von:", maengel_data.get("pruefer_name", "---")],
                ["Prüfdatum:", datetime.now().strftime("%d.%m.%Y")],
            ],
            colWidths=[50*mm, 140*mm],
        )
        kopf_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (0, -1), FARBE_SEKUNDÄR),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 1, FARBE_BORDER),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ])
        )
        elements.append(kopf_table)
        elements.append(Spacer(1, 10*mm))

        # Mängel
        maengel = maengel_data.get("maengel", [])
        if maengel:
            for i, mangel in enumerate(maengel, 1):
                schweregrad = mangel.get("schweregrad", "mittel").upper()
                if schweregrad == "KRITISCH":
                    farbe = FARBE_ROT
                elif schweregrad == "ERHEBLICH":
                    farbe = FARBE_ORANGE
                else:
                    farbe = FARBE_GRÜN

                # Mängel-Box mit Hintergrund
                mangel_content = f"""
                <b>Mangel {mangel.get('nr', i)}:</b><br/>
                <b>Beschreibung:</b> {mangel.get('beschreibung', '---')}<br/>
                <font color="{farbe.hexval()}"><b>Schweregrad: {schweregrad}</b></font><br/>
                <b>Abhilfe-Frist:</b> {mangel.get('frist', '---')}<br/>
                <b>Erforderliche Maßnahme:</b> {mangel.get('massnahme', '---')}
                """
                elements.append(
                    Paragraph(
                        mangel_content,
                        ParagraphStyle(
                            f"MangelBox{i}",
                            fontName="Helvetica",
                            fontSize=9,
                            textColor=FARBE_TEXT,
                            borderColor=farbe,
                            borderWidth=2,
                            borderPadding=8,
                            borderRadius=4,
                            spaceAfter=8,
                            leftIndent=10,
                            rightIndent=10,
                        ),
                    )
                )

            elements.append(Spacer(1, 10*mm))

        # Bestätigung
        elements.append(
            Paragraph(
                "<b>Bestätigung der Behebung:</b>",
                ParagraphStyle(
                    "ConfirmTitle",
                    fontName="Helvetica-Bold",
                    fontSize=11,
                    textColor=FARBE_PRIMÄR,
                    spaceAfter=6,
                ),
            )
        )

        confirm_table = Table(
            [
                ["Mangel", "Behoben am", "Bestätigung durch"],
                *[
                    [
                        f"Mangel {mangel.get('nr', i)}",
                        "____________________",
                        "____________________",
                    ]
                    for i, mangel in enumerate(maengel, 1)
                ],
            ],
            colWidths=[50*mm, 50*mm, 50*mm],
        )
        confirm_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), FARBE_PRIMÄR),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, FARBE_SEKUNDÄR]),
                ("GRID", (0, 0), (-1, -1), 0.5, FARBE_BORDER),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ])
        )
        elements.append(confirm_table)

        # PDF generieren
        doc.build(elements, onFirstPage=self._page_footer, onLaterPages=self._page_footer)
        return pdf_buffer.getvalue()

    def _page_footer(self, canvas_obj, doc):
        """Callback für Seitenfußzeile."""
        canvas_obj.saveState()
        canvas_obj.setFont("Helvetica", 8)
        canvas_obj.setFillColor(FARBE_TEXT)

        # Fußzeile zentriert
        footer_text = f"Generiert: {datetime.now().strftime('%d.%m.%Y %H:%M')} | PrüfPilot"
        canvas_obj.drawCentredString(A4[0]/2, 10*mm, footer_text)

        # Seitenzahl
        page_num = f"Seite {doc.page}"
        canvas_obj.drawRightString(A4[0] - 15*mm, 10*mm, page_num)

        canvas_obj.restoreState()
