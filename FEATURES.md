# Neue Features — Kamera & Leitfaden

## 1. KameraCapture-Komponente

**Datei:** `frontend/src/components/ui/KameraCapture.tsx`

Eine vollständige Foto-Aufnahme-Komponente mit Browser MediaDevices API. Perfect für die Schnellstart-Seite und überall wo Nutzer direkt Fotos aufnehmen sollen.

### Features
- Live Kamera-Stream mit HTML5 `<video>`
- Rückwärts-Kamera auf Mobile (`facingMode: "environment"`)
- Foto-Aufnahme via Canvas mit konfigurierbarer Kompression
- Preview des Fotos mit "Verwenden" & "Nochmal" Buttons
- Datei-Upload Fallback mit Drag & Drop
- Error-Handling (Kamera nicht verfügbar, Berechtigungen verweigert)
- Mobile-first responsive Design
- Alle Icons aus lucide-react

### Verwendung

```typescript
import { KameraCapture } from '@/components/ui/KameraCapture'

function MyComponent() {
  const handleCapture = (imageDataUrl: string) => {
    console.log('Foto aufgenommen:', imageDataUrl)
    // imageDataUrl ist ein Base64 Data URL: "data:image/jpeg;base64,..."
  }

  return (
    <KameraCapture
      onCapture={handleCapture}
      onCancel={() => console.log('Abgebrochen')}
      maxWidth={1280}
      quality={0.8}
    />
  )
}
```

### Props

```typescript
interface KameraCaptureProps {
  onCapture: (imageDataUrl: string) => void  // Base64 DataURL
  onCancel?: () => void                        // Optional Abbrechen-Callback
  maxWidth?: number                           // Canvas Breite, default 1280
  quality?: number                            // JPEG Qualität 0-1, default 0.8
}
```

### States

Die Komponente hat interne States:
- `idle` — Warten auf Benutzer-Aktion
- `requesting` — Kamera-Zugriff wird angefordert
- `streaming` — Kamera-Stream läuft, Live-Preview sichtbar
- `captured` — Foto wurde aufgenommen, Preview zeigt Foto
- `error` — Fehler (Kamera nicht verfügbar, Berechtigung verweigert)

---

## 2. Leitfaden-Modus (Guided Tour)

**Dateien:**
- `frontend/src/contexts/LeitfadenContext.tsx` — Context für State-Management
- `frontend/src/components/ui/LeitfadenTooltip.tsx` — Tooltip-Komponente
- `frontend/src/data/leitfaden-texte.ts` — Alle Erklärungstexte
- `frontend/src/components/layout/AppLayout.tsx` — Integration (Toggle-Button + Info-Banner)

### Wie es funktioniert

1. **App starten** → `LeitfadenProvider` (in App.tsx) wraps die ganze App
2. **Leitfaden aktivieren** → Toggle-Button in der Sidebar (BookOpen-Icon)
3. **Infos anschauen** → LeitfadenTooltip zeigt pulsierendes Info-Icon neben UI-Elementen
4. **Klick auf Icon** → Popover mit Erklärung + "Verstanden"-Button
5. **"Verstanden" klicken** → Abschnitt wird als completed markiert (Pulsieren stoppt)
6. **State speichern** → Alles wird in localStorage gespeichert

### Komponenten

#### 1. LeitfadenProvider

Muss um die ganze App gewickelt werden (wird in App.tsx importiert):

```typescript
<LeitfadenProvider>
  <BrowserRouter>
    {/* Alle Routes */}
  </BrowserRouter>
</LeitfadenProvider>
```

#### 2. useLeitfaden Hook

In jeder Komponente verfügbar:

```typescript
const { state, toggleLeitfaden, setCurrentSection, markCompleted, reset } = useLeitfaden()

// state:
// - isActive: boolean
// - currentSection: string | null
// - completedSections: string[]

// Beispiel:
toggleLeitfaden() // Ein/Aus
markCompleted('dashboard.ampel') // Markiere als verstanden
setCurrentSection('dashboard') // Aktuelle Sektion setzen
reset() // Alles zurücksetzen
```

#### 3. LeitfadenTooltip-Komponente

Wraps beliebige Elemente um sie zu erklären:

```typescript
import { LeitfadenTooltip } from '@/components/ui/LeitfadenTooltip'
import { LEITFADEN_TEXTE } from '@/data/leitfaden-texte'

export function DashboardPage() {
  return (
    <LeitfadenTooltip
      section="dashboard.ampel"
      title={LEITFADEN_TEXTE['dashboard.ampel'].title}
      description={LEITFADEN_TEXTE['dashboard.ampel'].description}
      position="right" // 'top' | 'bottom' | 'left' | 'right'
    >
      {/* Beliebiger Content */}
      <div className="...">Ampel Status anzeigen</div>
    </LeitfadenTooltip>
  )
}
```

#### 4. Leitfaden-Texte

Alle Texte sind zentral in `leitfaden-texte.ts` definiert. Format:

```typescript
'section.id': {
  title: 'Kurzer Titel',
  description: 'Längere Erklärung...'
}
```

Neue Texte einfach hinzufügen:

```typescript
'meine_neue_sektion': {
  title: 'Mein Titel',
  description: 'Meine Erklärung'
}
```

### Integration in AppLayout

Der Leitfaden ist bereits in `AppLayout.tsx` integriert:

1. **Toggle-Button** — BookOpen-Icon in der Sidebar
2. **Info-Banner** — Zeigt wenn Leitfaden aktiv ist (oben im Main-Content)

```typescript
import { useLeitfaden } from '@/contexts/LeitfadenContext'

export function AppLayout() {
  const { state, toggleLeitfaden } = useLeitfaden()

  return (
    <>
      {/* Toggle-Button in Header */}
      <button onClick={toggleLeitfaden}>
        {leitfadenState.isActive ? '✓' : 'Info'}
      </button>

      {/* Info-Banner wenn aktiv */}
      {leitfadenState.isActive && (
        <div>Leitfaden aktiv...</div>
      )}
    </>
  )
}
```

### Visuelles Verhalten

**Wenn Leitfaden INAKTIV:**
- Kein Info-Icon, kein blauer Rahmen
- Alles sieht normal aus

**Wenn Leitfaden AKTIV:**
- 🔵 Info-Icon erscheint neben Element (pulsiert wenn nicht completed)
- 🟦 Blauer Rahmen um das Element (ring-2 ring-blue-500)
- Klick auf Icon → Popover mit Erklärung
- "Verstanden"-Button → markiert als completed, Pulsieren stoppt

**Bereits Verstandene Tooltips:**
- Info-Icon sichtbar aber dezent (opacity-60)
- Kein Pulsieren
- Hovern zeigt immer noch das Popover

### Styling

Alles mit Tailwind CSS:
- Blau (#3b82f6) als primary Leitfaden-Farbe
- Pulsieren via `animate-pulse`
- Übergänge via `transition-all`
- Ring-Rahmen via `ring-2 ring-offset-2`

### localStorage

Alles wird automatisch in localStorage gespeichert unter Schlüssel `pruefpilot_leitfaden`:

```javascript
// Format in localStorage
{
  isActive: true,
  currentSection: 'dashboard',
  completedSections: ['dashboard.ampel', 'dashboard.bg_score']
}
```

Wenn localStorage beschädigt ist, wird automatisch auf DEFAULT_STATE zurückgegriffen.

---

## Integration Beispiel

Hier ein komplettes Beispiel wie man beide Features zusammen nutzt:

```typescript
import { useState } from 'react'
import { KameraCapture } from '@/components/ui/KameraCapture'
import { LeitfadenTooltip } from '@/components/ui/LeitfadenTooltip'
import { LEITFADEN_TEXTE } from '@/data/leitfaden-texte'

export function PruefScreen() {
  const [foto, setFoto] = useState<string | null>(null)

  return (
    <LeitfadenTooltip
      section="pruefungen.durchfuehren"
      title={LEITFADEN_TEXTE['pruefungen.durchfuehren'].title}
      description={LEITFADEN_TEXTE['pruefungen.durchfuehren'].description}
    >
      <div className="space-y-4">
        <h2>Prüfung durchführen</h2>

        {/* Kamera zum Foto aufnehmen */}
        {!foto && (
          <KameraCapture
            onCapture={setFoto}
            onCancel={() => {}}
            quality={0.9}
          />
        )}

        {/* Foto Preview */}
        {foto && (
          <img src={foto} alt="Aufgenommenes Foto" />
        )}
      </div>
    </LeitfadenTooltip>
  )
}
```

---

## Nächste Schritte

1. **KameraCapture integrieren** in Prüf-Screen oder wo Fotos aufgenommen werden
2. **Mehr LeitfadenTooltips hinzufügen** auf wichtigen Seiten (Dashboard, Arbeitsmittel, etc.)
3. **A/B Testing** — Leitfaden-Mode für neue Nutzer anbieten vs. optional
4. **Analytics** — Trackings wann Nutzer Leitfaden nutzen und welche Sektionen
