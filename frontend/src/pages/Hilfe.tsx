/**
 * Hilfe-Center — 8 Haupt-Artikel mit Symbolen
 */
import { useState } from 'react'
import {
  ChevronDown, ChevronRight,
  BookOpen, Wrench, CheckCircle, Upload,
  QrCode, AlertTriangle, FileText, Users,
  Search
} from 'lucide-react'

interface HilfeArtikel {
  id: string
  titel: string
  kategorie: string
  icon: React.ReactNode
  inhalt: string
}

const ARTIKEL: HilfeArtikel[] = [
  {
    id: 'erste-schritte',
    titel: 'Erste Schritte mit PrüfPilot',
    kategorie: 'Grundlagen',
    icon: <BookOpen size={18} />,
    inhalt: `Nach der Registrierung führt dich PrüfPilot durch die Einrichtung. So geht es:

1. **Firmenprofil einrichten**
   - Wähle deine Branche (z. B. Metallverarbeitung, Handwerk, Landwirtschaft)
   - Gib Firmennamen und Standort ein
   - PrüfPilot schlägt dir basierend darauf passende Arbeitsmittel und Checklisten vor

2. **Arbeitsmittel hinzufügen**
   - Gehe zum Bereich "Arbeitsmittel" und klicke "+Neues Arbeitsmittel"
   - Trage Daten ein: Name, Typ, Hersteller, Seriennummer, Baujahr
   - Optional: Mehrere Arbeitsmittel per CSV-Import hochladen

3. **Erste Prüfung durchführen**
   - Wähle ein Arbeitsmittel aus und klicke "Neue Prüfung"
   - PrüfPilot schlägt die passende Checkliste vor
   - Bewerte die Prüfpunkte mit OK, Mangel oder Nicht anwendbar
   - Schließe die Prüfung ab — das PDF wird automatisch generiert

4. **Dashboard verstehen**
   - Der BG-Ready-Score zeigt die Sicherheit deines Betriebs (0–100%)
   - Kommende Prüftermine werden automatisch angezeigt
   - Kritische Mängel landen in der Alerting-Zone

**Tipp:** Lade dir das PDF-Prüfprotokoll herunter und archiviere es für die BG-Prüfung!`,
  },
  {
    id: 'arbeitsmittel-erfassen',
    titel: 'Arbeitsmittel erfassen und verwalten',
    kategorie: 'Arbeitsmittel',
    icon: <Wrench size={18} />,
    inhalt: `So erfasst und verwaltest du deine Arbeitsmittel in PrüfPilot:

**Manuelles Erfassen:**
1. Klicke auf "Arbeitsmittel" → "+Neues Arbeitsmittel"
2. Fülle die wichtigsten Felder aus:
   - Name: z. B. "Drehmaschine Modell XYZ"
   - Typ: z. B. Drehmaschine, Bohrmaschine, Prüfmaschine
   - Hersteller: z. B. Siemens, Bosch, EMCO
   - Modell: z. B. "DMU 50" (optional)
   - Seriennummer: für Identifikation wichtig
   - Baujahr: Alter des Arbeitsmittels
   - Standort: Wo steht das Arbeitsmittel im Betrieb?
   - Prüfintervall: z. B. "12 Monate" (wird automatisch an Normen gekoppelt)
3. Speichere das Arbeitsmittel

**Per CSV importieren:**
- Verwende die Vorlage unter "Arbeitsmittel" → "CSV-Import"
- Spalten: Name, Typ, Hersteller, Modell, Seriennummer, Baujahr, Standort, Prüfintervall
- Max. 5.000 Arbeitsmittel pro Import
- PrüfPilot erkennt deutsche und englische Spaltennamen automatisch

**Bearbeiten und Löschen:**
- Klicke auf ein Arbeitsmittel, um Details zu bearbeiten
- Die Prüfhistorie bleibt erhalten, auch wenn du Daten aktualisierst
- Lösche Arbeitsmittel nur, wenn sie außer Betrieb sind

**Kategorisierung:**
- Weise Arbeitsmittel Kategorien zu (z. B. "Hochrisiko", "Regelprüfung")
- So siehst du schneller, welche Geräte häufiger geprüft werden müssen`,
  },
  {
    id: 'pruefung-durchfuehren',
    titel: 'Prüfung durchführen und dokumentieren',
    kategorie: 'Prüfungen',
    icon: <CheckCircle size={18} />,
    inhalt: `So führst du eine Prüfung in PrüfPilot durch:

**Prüfung starten:**
1. Wähle ein Arbeitsmittel aus deiner Liste
2. Klicke auf "Neue Prüfung starten"
3. PrüfPilot schlägt eine passende Checkliste vor (basierend auf Typ und Branche)
4. Du kannst auch eine andere Checkliste wählen oder eine eigene Vorlage verwenden

**Prüfpunkte bewerten:**
Für jeden Prüfpunkt hast du drei Optionen:
- **OK (Grün):** Das Arbeitsmittel erfüllt den Prüfpunkt
- **Mangel (Orange/Rot):** Der Prüfpunkt ist nicht erfüllt oder kritisch
- **Nicht anwendbar (Grau):** Der Punkt gilt für dieses Gerät nicht

**Mängel dokumentieren:**
Wenn du einen Mangel findest:
1. Wähle den Schweregrad (Orange = mittelschwer, Rot = kritisch)
2. Füge eine Beschreibung ein: z. B. "Verschleiß an Schleifbelag"
3. Lade ein Foto hoch (Kamera-Icon) — das ist für die Dokumentation sehr wichtig
4. Gib einen Lösungstermin an (wann muss der Mangel behoben sein?)

**Unterschrift und Abschluss:**
1. Nach Bewertung aller Punkte musst du unterschreiben (Digital-Signatur oder Tablet)
2. Gib deinen Namen und das Prüfdatum ein
3. Klicke "Prüfung abschließen"
4. Das PDF-Prüfprotokoll wird automatisch erstellt und ist ab sofort unveränderbar

**Wichtig:** Abgeschlossene Prüfungen können nicht mehr geändert werden — das ist für die BG-Compliance und Revisionssicherheit erforderlich!

**Tipp:** Du kannst Prüfungen als Entwurf speichern und später fortsetzen.`,
  },
  {
    id: 'csv-import',
    titel: 'CSV-Import: Schnelles Hochladen von Arbeitsmitteln',
    kategorie: 'Arbeitsmittel',
    icon: <Upload size={18} />,
    inhalt: `Hast du eine Excel-Datei mit deinen Arbeitsmitteln? Mit dem CSV-Import sparst du Zeit:

**Vorbereitung der Excel-Datei:**
1. Öffne deine Excel-Liste mit Arbeitsmitteln
2. Stelle sicher, dass folgende Spalten vorhanden sind:
   - Name (erforderlich): z. B. "Drehmaschine ABC"
   - Typ (erforderlich): z. B. "Drehmaschine"
   - Hersteller (optional)
   - Modell (optional)
   - Seriennummer (empfohlen)
   - Baujahr (optional)
   - Standort (empfohlen)
   - Prüfintervall (optional): z. B. "12 Monate"
3. Speichere die Datei als CSV (Semikolon- oder Komma-getrennt)

**Upload durchführen:**
1. Gehe zu "Arbeitsmittel" → "CSV-Import"
2. Klicke "Datei auswählen" und wähle deine CSV-Datei
3. PrüfPilot zeigt eine Vorschau mit allen erkannten Spalten
4. Wenn nötig: Ordne die Spalten den PrüfPilot-Feldern zu
5. Überprüfe die ersten Zeilen der Vorschau
6. Klicke "Importieren"

**Nach dem Import:**
- Du siehst einen Fortschrittsbalken
- Danach eine Zusammenfassung: "X von Y Arbeitsmittel erfolgreich importiert"
- Fehlerhafte Zeilen werden gelistet — überprüfen und manuell nacherfassen
- Alle importierten Arbeitsmittel erscheinen sofort in deiner Liste

**Häufige Fehler und Lösungen:**
- Spaltenüberschriften in Deutsch oder Englisch? → PrüfPilot erkennt beide automatisch
- Seriennummern-Format falsch? → Name und Typ reichen — Seriennummer ist optional
- Zu viele Arbeitsmittel (>5.000)? → Teile die Datei auf und importiere sie einzeln

**Tipp:** Lade dir zuerst eine Vorlage herunter ("Vorlage herunterladen") und nutze diese als Struktur.`,
  },
  {
    id: 'qr-codes',
    titel: 'QR-Codes erstellen und nutzen',
    kategorie: 'Arbeitsmittel',
    icon: <QrCode size={18} />,
    inhalt: `QR-Codes machen deine Prüfungen mobiler und schneller:

**Was ist der QR-Code?**
Jedes Arbeitsmittel erhält automatisch einen eindeutigen QR-Code. Dieser Code verlinkt direkt auf das Arbeitsmittel in PrüfPilot und spart Zeit auf Tablet oder Smartphone.

**QR-Code generieren:**
1. Gehe zu einem Arbeitsmittel
2. Im Bereich "Details" findest du den QR-Code
3. Du kannst ihn direkt speichern oder ausdrucken

**QR-Etiketten drucken:**
1. Wähle mehrere Arbeitsmittel aus (Checkboxen links)
2. Klicke "QR-Codes drucken"
3. Du erhältst ein PDF im Etikettenformat (z. B. A4 mit 24 Labels à 4x4 cm)
4. Drucke das PDF auf Etikettenpapier
5. Schneide die Etiketten aus und klebe sie auf deine Arbeitsmittel

**QR-Code scannen (bei Prüfung):**
1. Öffne PrüfPilot auf deinem Tablet oder Smartphone
2. Gehe zu "Prüfung" und klicke das Kamera-Symbol
3. Halte die Kamera auf den QR-Code des Arbeitsmittels
4. PrüfPilot erkennt das Gerät automatisch und öffnet die Prüfansicht

**Vorteile der QR-Codes:**
- Schnellere Identifikation von Arbeitsmitteln
- Weniger Tippfehler bei der Geräteauswahl
- Perfekt für Prüfungen vor Ort auf Tablet oder Smartphone
- Keine Verwechslung von ähnlichen Geräten

**Sicherheit:**
- Die QR-Codes sind eindeutig pro Arbeitsmittel
- Nur angemeldete Nutzer können über den QR-Code zugreifen
- Die Codes werden verschlüsselt übertragen`,
  },
  {
    id: 'mangel-verfolgen',
    titel: 'Mängel verfolgen und beheben',
    kategorie: 'Mängel',
    icon: <AlertTriangle size={18} />,
    inhalt: `Systematische Übersicht und Nachverfolgung von Mängeln:

**Mängel-Übersicht:**
1. Gehe zum Dashboard oder zum Bereich "Mängel"
2. Hier siehst du alle offenen Mängel aus allen Prüfungen
3. Sortiere nach:
   - Schweregrad (Rot = kritisch, Orange = mittelschwer)
   - Arbeitsmittel
   - Prüfdatum
   - Status (Offen, In Bearbeitung, Behoben)

**Mängel bearbeiten:**
1. Klicke auf einen Mangel, um Details zu sehen
2. Du siehst: Beschreibung, Foto, Lösungstermin, Verantwortlicher
3. Aktualisiere den Status:
   - **Offen:** Mangel wurde gerade entdeckt
   - **In Bearbeitung:** Jemand arbeitet daran
   - **Behoben:** Maßnahme ist abgeschlossen
   - **Nicht zu beheben:** Gerät wird stillgelegt
4. Füge Bemerkungen hinzu, z. B. "Verschleißteil bestellt am 15.03.2026"

**Lösungstermine:**
- PrüfPilot erinnert dich automatisch an Mängel, deren Lösungsfrist näher rückt
- Kritische Mängel (Rot) sollten innerhalb von 48 Stunden behoben sein
- Mittelschwere Mängel (Orange) sollten innerhalb von 2–4 Wochen behoben sein

**Nachverfolgung:**
1. Nach Behebung eines Mangels: Lade ein Foto der reparierten Stelle hoch
2. Dies dokumentiert die erfolgreiche Maßnahme
3. Du kannst eine neue Prüfung durchführen, um zu bestätigen, dass der Mangel behoben ist

**Zuständigkeiten zuweisen:**
- Bei kritischen Mängeln kannst du einen Verantwortlichen zuweisen
- Diese Person erhält automatisch eine Benachrichtigung per E-Mail`,
  },
  {
    id: 'pdf-protokoll',
    titel: 'PDF-Prüfprotokoll verstehen und nutzen',
    kategorie: 'Prüfungen',
    icon: <FileText size={18} />,
    inhalt: `Das PDF-Prüfprotokoll ist die offizielle Dokumentation deiner Prüfung:

**Aufbau des Protokolls:**

1. **Kopfbereich:**
   - Firmenname und Logo (aus deinem Profil)
   - "Prüfprotokoll" als Titel
   - Eindeutige Prüf-ID (für Archivierung)
   - Prüfdatum und Uhrzeit

2. **Allgemeine Informationen:**
   - Arbeitsmittel: Name, Typ, Seriennummer
   - Hersteller, Modell, Baujahr
   - Standort und Inventarnummer
   - Geprüft durch: Name des Prüfers
   - Checklisten-Vorlage: Welche Norm/Standard wurde angewendet?

3. **Checklisten-Seiten:**
   - Jeden Prüfpunkt mit Ampel-Farbgebung:
     * Grün = OK
     * Orange/Rot = Mangel
     * Grau = Nicht anwendbar
   - Jeder Punkt hat Nummer, Beschreibung und Bewertung
   - Ggf. Notizen des Prüfers

4. **Mängel-Seite:**
   - Alle gefundenen Mängel mit Details:
     * Beschreibung des Mangels
     * Schweregrad (farblich gekennzeichnet)
     * Foto (falls hochgeladen)
     * Lösungstermin
     * Verantwortlicher für Behebung

5. **Unterschrift und Bestätigung:**
   - Digitale Unterschrift des Prüfers (Datum, Name)
   - Stempel "Revisionssicher erstellt mit PrüfPilot"
   - Hash-Code für Fälschungsprävention

**Was macht das Protokoll revisionssicher?**
- Zeitstempel aller Einträge
- Digitale Signatur des Prüfers
- Hash-Code macht Veränderungen erkennbar
- Einhaltung von DSGVO und BetrSichV

**Verwendung des Protokolls:**

1. **Für die BG-Prüfung:**
   - Drucke das PDF und hefte es zu den Prüfunterlagen
   - Die BG akzeptiert dieses als offizielles Prüfprotokoll
   - Aufbewahrungsfrist: mindestens 10 Jahre

2. **Für Auftragnehmer/Kunden:**
   - Versende das PDF direkt aus PrüfPilot per E-Mail
   - Der Empfänger sieht das originale Prüfprotokoll mit Unterschrift

3. **Archivierung:**
   - Alle Protokolle werden automatisch in PrüfPilot archiviert
   - Du kannst jederzeit nach Datum, Arbeitsmittel oder Prüfer suchen
   - Download auch möglich, um lokal zu speichern

**Tipp:** Speichere Protokolle digital als Backup und drucke auch Papier-Ausdrucke für das Archiv. So hast du doppelte Sicherheit!`,
  },
  {
    id: 'unterweisungen',
    titel: 'Unterweisungen verwalten und durchführen',
    kategorie: 'Unterweisungen',
    icon: <Users size={18} />,
    inhalt: `Unterweisungen dokumentieren und das Wissen deiner Mitarbeiter sichern:

**Was ist eine Unterweisung in PrüfPilot?**
Eine Unterweisung dokumentiert, dass ein Mitarbeiter geschult wurde zur sicheren Nutzung eines bestimmten Arbeitsmittels. Dies ist rechtlich erforderlich nach BetrSichV und Arbeitsschutzgesetz.

**Unterweisung erstellen:**

1. Gehe zum Bereich "Unterweisungen"
2. Klicke "+Neue Unterweisung"
3. Fülle aus:
   - Arbeitsmittel: Welches Gerät wird trainiert?
   - Thema: z. B. "Sicherheitsprüfung Drehmaschine"
   - Beschreibung: z. B. Gefahren, Bedienungsanleitung, Schutzausrüstung
   - Schulungsdatum
   - Dauer (in Minuten)

4. **Inhalte hinzufügen:**
   - Lade Schulungsmaterialien hoch (PDF, Bilder)
   - Du kannst Richtlinien-Links einfügen
   - Schreibe kurze Lernziele auf

**Mitarbeiter zur Unterweisung einladen:**

1. Wähle die Unterweisung aus
2. Klicke "Mitarbeiter einladen"
3. Wähle Mitarbeiter aus deiner Liste (oder lade neue ein)
4. PrüfPilot sendet eine E-Mail mit dem Trainings-Link

**Mitarbeiter-Fortschritt verfolgen:**

1. Jeder Mitarbeiter erhält einen Link zur Unterweisung
2. Er muss die Schulung durchgehen und am Ende bestätigen: "Ich habe alles verstanden"
3. Du siehst in PrüfPilot: Wer hat die Unterweisung abgeschlossen? Wann?
4. Automatische Erinnerungen an nicht abgeschlossene Trainings

**Unterweisung bestätigen:**

1. Nach Durchführung unterschreibst du als Schulungsleiter
2. PrüfPilot erstellt ein Unterweisungs-Zertifikat mit:
   - Name des Mitarbeiters
   - Arbeitsmittel und Thema
   - Datum und Unterschrift
   - Gültig für: meistens 2–3 Jahre (je nach Vorschrift)

3. Der Mitarbeiter erhält das Zertifikat per E-Mail

**Wiederholungsplan:**

- PrüfPilot erinnert automatisch, wenn Unterweisungen erneuert werden müssen
- Du siehst auf dem Dashboard: "5 Unterweisungen verfallen in den nächsten 30 Tagen"
- Vereinbare rechtzeitig neue Schulungstermine

**Best Practice:**
- Weise neue Mitarbeiter in den ersten 3 Tagen ein
- Erneuere Unterweisungen mindestens alle 2 Jahre
- Kombiniere Unterweisungen mit praktischen Prüfungen am Arbeitsmittel`,
  },
]

export function HilfePage() {
  const [openId, setOpenId] = useState<string | null>('erste-schritte')
  const [suche, setSuche] = useState('')

  const filtered = ARTIKEL.filter(a =>
    a.titel.toLowerCase().includes(suche.toLowerCase()) ||
    a.inhalt.toLowerCase().includes(suche.toLowerCase()) ||
    a.kategorie.toLowerCase().includes(suche.toLowerCase())
  )

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black">Hilfe-Center</h1>
        <p className="text-sm text-gray-400 mt-2">Schritt-für-Schritt Anleitungen für alle Funktionen von PrüfPilot</p>
      </div>

      {/* Suchleiste */}
      <div className="relative mb-8">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
        <input
          type="text"
          placeholder="Nach Artikel durchsuchen..."
          value={suche}
          onChange={e => setSuche(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm placeholder:text-gray-300 focus:ring-1 focus:ring-black focus:border-black outline-none"
        />
      </div>

      {/* Artikel-Liste */}
      <div className="space-y-3">
        {filtered.map(artikel => (
          <div key={artikel.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors">
            <button
              onClick={() => setOpenId(openId === artikel.id ? null : artikel.id)}
              className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-600">
                {artikel.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-medium text-black">{artikel.titel}</p>
                <p className="text-xs text-gray-400 mt-0.5">{artikel.kategorie}</p>
              </div>
              {openId === artikel.id
                ? <ChevronDown size={18} className="text-gray-400 flex-shrink-0" />
                : <ChevronRight size={18} className="text-gray-400 flex-shrink-0" />
              }
            </button>
            {openId === artikel.id && (
              <div className="px-5 pb-5 pt-0 border-t border-gray-50 bg-gray-50">
                <div className="pl-14 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap space-y-3">
                  {artikel.inhalt.split('\n\n').map((paragraph, idx) => (
                    <p
                      key={idx}
                      dangerouslySetInnerHTML={{
                        __html: paragraph.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400">Keine Artikel gefunden. Versuch einen anderen Suchbegriff.</p>
        </div>
      )}

      {/* Footer mit weiteren Ressourcen */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="font-medium text-sm text-black mb-2">Weitere Hilfe benötigt?</p>
            <p className="text-xs text-gray-600">Schreib uns an: support@pruefpilot.de</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="font-medium text-sm text-black mb-2">Video-Tutorials</p>
            <p className="text-xs text-gray-600">Findest du unter Einstellungen → Einführungstour</p>
          </div>
        </div>
      </div>
    </div>
  )
}
