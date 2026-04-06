/**
 * Leitfaden-Texte für alle Bereiche der App
 * Format: section-ID → { title, description }
 */

export const LEITFADEN_TEXTE: Record<string, { title: string; description: string }> = {
  // Schnellstart
  'schnellstart.setup': {
    title: 'Schnellstart-Assistent',
    description: 'Der Schnellstart-Assistent führt dich durch die erste Einrichtung. Du hinterlegst deine Firmendaten, Standorte und Branche. Danach bist du startklar!',
  },

  // Dashboard
  'dashboard.ampel': {
    title: 'Ampel-Status',
    description: 'Der Ampel-Status zeigt auf einen Blick, wie es um deine Prüfungen steht. Grün = alles in Ordnung, Gelb = Prüfung steht bald an, Rot = überfällig. Klicke auf eine Farbe, um die betroffenen Arbeitsmittel zu sehen.',
  },
  'dashboard.bg_score': {
    title: 'BG-Ready-Score',
    description: 'Der BG-Ready-Score zeigt in Prozent, wie gut dein Betrieb auf eine Prüfung durch die Berufsgenossenschaft vorbereitet ist. 100% bedeutet: Alle Prüfungen aktuell, alle Unterweisungen durchgeführt, alle Mängel behoben.',
  },
  'dashboard.kalender': {
    title: 'Prüfkalender',
    description: 'Der Kalender zeigt alle anstehenden Prüftermine. Klicke auf einen Tag, um die Details zu sehen. Rote Markierungen bedeuten überfällige Prüfungen.',
  },

  // Arbeitsmittel
  'arbeitsmittel.liste': {
    title: 'Arbeitsmittel-Übersicht',
    description: 'Hier siehst du alle deine prüfpflichtigen Arbeitsmittel — von Leitern über Regale bis zu Maschinen. Jedes Arbeitsmittel hat einen Ampel-Status und einen QR-Code für die schnelle Identifikation vor Ort.',
  },
  'arbeitsmittel.anlegen': {
    title: 'Arbeitsmittel anlegen',
    description: 'Lege ein neues Arbeitsmittel an. Wähle den Typ (z.B. Leiter, Regal), gib Hersteller und Seriennummer ein. PrüfPilot schlägt automatisch die passende Checkliste und das Prüfintervall vor.',
  },
  'arbeitsmittel.qr': {
    title: 'QR-Code',
    description: 'Jedes Arbeitsmittel bekommt einen einzigartigen QR-Code. Drucke diesen aus und klebe ihn auf das Gerät. Beim Scannen öffnet sich direkt die Prüfansicht — ideal für Rundgänge.',
  },

  // Prüfungen
  'pruefungen.uebersicht': {
    title: 'Prüfungen',
    description: 'Die Prüfungsübersicht zeigt alle durchgeführten und geplanten Prüfungen. Filtere nach Status (offen, bestanden, nicht bestanden) oder nach Arbeitsmittel.',
  },
  'pruefungen.starten': {
    title: 'Prüfung starten',
    description: 'Starte eine neue Prüfung, indem du ein Arbeitsmittel und die passende Checkliste wählst. Die App führt dich Schritt für Schritt durch alle Prüfpunkte.',
  },
  'pruefungen.durchfuehren': {
    title: 'Prüfung durchführen',
    description: 'Bewerte jeden Prüfpunkt mit OK, Mangel oder Nicht anwendbar. Bei Mängeln kannst du direkt Fotos aufnehmen und den Schweregrad festlegen. Am Ende unterschreibst du digital.',
  },
  'pruefungen.protokoll': {
    title: 'Prüfprotokoll',
    description: 'Nach Abschluss wird automatisch ein PDF-Prüfprotokoll mit deinem Firmenlogo, allen Ergebnissen, Fotos und deiner digitalen Unterschrift erstellt. Du kannst es herunterladen oder direkt per E-Mail versenden.',
  },

  // Mängel
  'maengel.uebersicht': {
    title: 'Mängelverwaltung',
    description: 'Alle bei Prüfungen erfassten Mängel auf einen Blick. Filtere nach Schweregrad (grün/orange/rot), Status (offen/in Bearbeitung/erledigt) oder Frist.',
  },
  'maengel.schweregrad': {
    title: 'Schweregrad',
    description: 'Grün = geringfügiger Mangel (Betrieb möglich), Orange = erheblicher Mangel (Betrieb eingeschränkt, Frist setzen), Rot = gefährlicher Mangel (Betrieb sofort einstellen, Sperrung!).',
  },

  // Checklisten
  'checklisten.templates': {
    title: 'Checklisten-Vorlagen',
    description: 'PrüfPilot liefert branchenübliche Checklisten nach DIN/DGUV-Normen. Du kannst diese anpassen oder eigene erstellen. Jede Checkliste enthält Prüfpunkte mit Hinweisen für den Prüfer.',
  },

  // Unterweisungen
  'unterweisungen.uebersicht': {
    title: 'Unterweisungen',
    description: 'Verwalte alle Pflichtunterweisungen deiner Mitarbeiter. PrüfPilot erinnert automatisch an fällige Unterweisungen und dokumentiert die Durchführung revisionssicher.',
  },
  'unterweisungen.durchfuehren': {
    title: 'Unterweisung durchführen',
    description: 'Wähle eine Vorlage, lade die Teilnehmer ein und führe die Unterweisung durch. Die Teilnehmer unterschreiben digital — fertig. Alles wird dokumentiert.',
  },

  // Mitarbeiter
  'mitarbeiter.verwaltung': {
    title: 'Mitarbeiterverwaltung',
    description: 'Pflege deine Mitarbeiterdaten: Name, Abteilung, Qualifikationen. PrüfPilot prüft automatisch, welche Unterweisungen jeder Mitarbeiter benötigt.',
  },

  // Einstellungen
  'einstellungen.firma': {
    title: 'Firmeneinstellungen',
    description: 'Hinterlege dein Firmenlogo und deine Daten. Diese erscheinen automatisch auf allen Prüfprotokollen, Unterweisungsnachweisen und Formularen.',
  },
  'einstellungen.abo': {
    title: 'Abonnement',
    description: 'Wähle den passenden Plan für deinen Betrieb. Im Free-Plan kannst du bis zu 10 Arbeitsmittel und 50 Prüfungen pro Monat verwalten.',
  },

  // Compliance
  'compliance.bg_ready': {
    title: 'BG-Bereitschaft',
    description: 'Der Compliance-Bereich zeigt dir, wie gut du auf eine Prüfung durch die Berufsgenossenschaft oder Gewerbeaufsicht vorbereitet bist. Folge den Empfehlungen, um deinen Score zu verbessern.',
  },

  // Gefährdungsbeurteilungen
  'gefaehrdungsbeurteilungen.uebersicht': {
    title: 'Gefährdungsbeurteilungen',
    description: 'Erstelle und verwalte Gefährdungsbeurteilungen nach § 5 ArbSchG. Jeder Arbeitsplatz und jede Tätigkeit muss beurteilt werden. PrüfPilot führt dich durch den Prozess.',
  },

  // Gefahrstoffe
  'gefahrstoffe.verzeichnis': {
    title: 'Gefahrstoffverzeichnis',
    description: 'Das Gefahrstoffverzeichnis nach GefStoffV § 6 listet alle im Betrieb verwendeten Gefahrstoffe mit GHS-Kennzeichnung, H-/P-Sätzen und Schutzmaßnahmen.',
  },

  // Fremdfirmen
  'fremdfirmen.verwaltung': {
    title: 'Fremdfirmenmanagement',
    description: 'Verwalte externe Firmen, die in deinem Betrieb arbeiten. Dokumentiere Unterweisungen und koordiniere Arbeitsschutzmaßnahmen nach § 8 ArbSchG.',
  },
}
