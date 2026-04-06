# Integration Beispiele — Kamera & Leitfaden

Quick Copy-Paste Beispiele für die Integration in andere Seiten/Komponenten.

---

## 1. KameraCapture in Prüf-Screen

```typescript
// frontend/src/pages/PruefScreen.tsx

import { useState } from 'react'
import { KameraCapture } from '@/components/ui/KameraCapture'

export function PruefScreen() {
  const [fotos, setFotos] = useState<string[]>([])
  const [showCamera, setShowCamera] = useState(false)

  const handleFotoCapture = (imageDataUrl: string) => {
    setFotos([...fotos, imageDataUrl])
    setShowCamera(false)
  }

  return (
    <div className="space-y-6">
      <h1>Prüfung durchführen</h1>

      {/* Checkpoints... */}

      {/* Foto-Aufnahme */}
      <div className="border rounded-lg p-4">
        <h3>Fotos hinzufügen</h3>

        {showCamera ? (
          <KameraCapture
            onCapture={handleFotoCapture}
            onCancel={() => setShowCamera(false)}
            quality={0.9}
          />
        ) : (
          <button
            onClick={() => setShowCamera(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Foto aufnehmen
          </button>
        )}

        {/* Galerie */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {fotos.map((foto, i) => (
            <img key={i} src={foto} alt={`Foto ${i + 1}`} />
          ))}
        </div>
      </div>
    </div>
  )
}
```

---

## 2. Leitfaden-Tooltips hinzufügen

### Einfaches Beispiel

```typescript
// frontend/src/pages/Dashboard.tsx

import { LeitfadenTooltip } from '@/components/ui/LeitfadenTooltip'
import { LEITFADEN_TEXTE } from '@/data/leitfaden-texte'

export function Dashboard() {
  return (
    <div>
      {/* Ampel mit Leitfaden */}
      <LeitfadenTooltip
        section="dashboard.ampel"
        title={LEITFADEN_TEXTE['dashboard.ampel'].title}
        description={LEITFADEN_TEXTE['dashboard.ampel'].description}
        position="right"
      >
        <div className="p-6 bg-white rounded-lg border">
          {/* Ampel Status anzeigen */}
          <AmpelStatus />
        </div>
      </LeitfadenTooltip>

      {/* Score mit Leitfaden */}
      <LeitfadenTooltip
        section="dashboard.bg_score"
        title={LEITFADEN_TEXTE['dashboard.bg_score'].title}
        description={LEITFADEN_TEXTE['dashboard.bg_score'].description}
        position="bottom"
      >
        <div className="p-6 bg-white rounded-lg border">
          <BGReadyScore score={85} />
        </div>
      </LeitfadenTooltip>
    </div>
  )
}
```

### Mit Custom Position

```typescript
<LeitfadenTooltip
  section="my.section"
  title="Mein Titel"
  description="Meine Erklärung..."
  position="left"  // 'top' | 'bottom' | 'left' | 'right'
>
  <YourComponent />
</LeitfadenTooltip>
```

---

## 3. Neue Leitfaden-Texte hinzufügen

Einfach in `frontend/src/data/leitfaden-texte.ts`:

```typescript
export const LEITFADEN_TEXTE: Record<string, { title: string; description: string }> = {
  // ... existing...

  // Meine neue Sektion
  'maengel.schweregrad': {
    title: 'Schweregrad-Klassifizierung',
    description: 'Grün = geringfügig (Betrieb möglich), Orange = erheblich (eingeschränkt), Rot = Sperrung erforderlich!'
  },
}
```

Dann in Komponente verwenden:

```typescript
import { LEITFADEN_TEXTE } from '@/data/leitfaden-texte'

<LeitfadenTooltip
  section="maengel.schweregrad"
  title={LEITFADEN_TEXTE['maengel.schweregrad'].title}
  description={LEITFADEN_TEXTE['maengel.schweregrad'].description}
>
  {/* Your Component */}
</LeitfadenTooltip>
```

---

## 4. Leitfaden-Context direkt nutzen

```typescript
import { useLeitfaden } from '@/contexts/LeitfadenContext'

export function MyComponent() {
  const {
    state,                    // { isActive, currentSection, completedSections }
    toggleLeitfaden,          // () => void
    setCurrentSection,        // (section: string | null) => void
    markCompleted,            // (section: string) => void
    reset,                    // () => void
  } = useLeitfaden()

  return (
    <div>
      {state.isActive && (
        <button onClick={() => markCompleted('my.section')}>
          Verstanden!
        </button>
      )}
    </div>
  )
}
```

---

## 5. Leitfaden nur für neue Nutzer anzeigen

```typescript
import { useEffect } from 'react'
import { useLeitfaden } from '@/contexts/LeitfadenContext'

export function App() {
  const { toggleLeitfaden, state } = useLeitfaden()

  useEffect(() => {
    // Nutzer zum ersten Mal?
    const isFirstVisit = !localStorage.getItem('pruefpilot_visited')

    if (isFirstVisit) {
      localStorage.setItem('pruefpilot_visited', 'true')
      // Leitfaden automatisch aktivieren
      if (!state.isActive) {
        toggleLeitfaden()
      }
    }
  }, [])

  return null
}
```

---

## 6. Leitfaden für spezifische Seite aktivieren

```typescript
import { useEffect } from 'react'
import { useLeitfaden } from '@/contexts/LeitfadenContext'

export function ArbeitsmittelPage() {
  const { setCurrentSection } = useLeitfaden()

  useEffect(() => {
    // Setze aktuelle Section wenn Seite geladen
    setCurrentSection('arbeitsmittel')

    return () => {
      // Cleanup
      setCurrentSection(null)
    }
  }, [setCurrentSection])

  return <div>{/* ... */}</div>
}
```

---

## 7. Multiple Fotos in einer Form

```typescript
import { useState } from 'react'
import { KameraCapture } from '@/components/ui/KameraCapture'
import { Trash2, Plus } from 'lucide-react'

export function PhotoGallery() {
  const [fotos, setFotos] = useState<{ id: string; data: string }[]>([])
  const [cameraOpen, setCameraOpen] = useState(false)

  const addFoto = (imageData: string) => {
    setFotos([...fotos, { id: Date.now().toString(), data: imageData }])
    setCameraOpen(false)
  }

  const removeFoto = (id: string) => {
    setFotos(fotos.filter(f => f.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* Galerie */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {fotos.map(foto => (
          <div key={foto.id} className="relative group">
            <img
              src={foto.data}
              alt="Mängel-Foto"
              className="w-full h-32 object-cover rounded-lg"
            />
            <button
              onClick={() => removeFoto(foto.id)}
              className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Kamera */}
      {!cameraOpen ? (
        <button
          onClick={() => setCameraOpen(true)}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center gap-2 hover:border-blue-500 transition"
        >
          <Plus size={18} />
          Foto hinzufügen
        </button>
      ) : (
        <KameraCapture
          onCapture={addFoto}
          onCancel={() => setCameraOpen(false)}
          quality={0.85}
        />
      )}
    </div>
  )
}
```

---

## 8. Leitfaden-Status in Analytics

```typescript
import { useLeitfaden } from '@/contexts/LeitfadenContext'

export function AnalyticsTracker() {
  const { state } = useLeitfaden()

  useEffect(() => {
    // Tracking wenn Nutzer Leitfaden aktiviert
    if (state.isActive) {
      analytics.track('leitfaden_activated', {
        completedSections: state.completedSections.length,
      })
    }
  }, [state.isActive, state.completedSections])

  return null
}
```

---

## 9. Bedingte Leitfaden-Anzeige

```typescript
<LeitfadenTooltip
  section="arbeitsmittel.anlegen"
  title="..."
  description="..."
>
  {/* Nur zeigen wenn weniger als 5 Arbeitsmittel */}
  {arbeitsmittel.length < 5 && (
    <button>Arbeitsmittel anlegen</button>
  )}
</LeitfadenTooltip>
```

---

## 10. Komplettes Beispiel: Mängel-Formular mit Kamera & Leitfaden

```typescript
import { useState } from 'react'
import { KameraCapture } from '@/components/ui/KameraCapture'
import { LeitfadenTooltip } from '@/components/ui/LeitfadenTooltip'
import { LEITFADEN_TEXTE } from '@/data/leitfaden-texte'

export function MaengelFormular() {
  const [beschreibung, setBeschreibung] = useState('')
  const [schweregrad, setSchweregrad] = useState<'gruen' | 'orange' | 'rot'>('orange')
  const [fotos, setFotos] = useState<string[]>([])
  const [frist, setFrist] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // API Call mit fotos (Base64 Array)
    await api.post('/maengel', {
      beschreibung,
      schweregrad,
      fotos,
      frist,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold">Neuen Mangel erfassen</h2>

      {/* Beschreibung */}
      <LeitfadenTooltip
        section="maengel.uebersicht"
        title={LEITFADEN_TEXTE['maengel.uebersicht'].title}
        description={LEITFADEN_TEXTE['maengel.uebersicht'].description}
      >
        <div>
          <label className="block text-sm font-medium mb-2">Mangelbeschreibung</label>
          <textarea
            value={beschreibung}
            onChange={e => setBeschreibung(e.target.value)}
            placeholder="Beschreiben Sie den Mangel..."
            className="w-full px-4 py-2 border rounded-lg"
            rows={3}
            required
          />
        </div>
      </LeitfadenTooltip>

      {/* Schweregrad */}
      <LeitfadenTooltip
        section="maengel.schweregrad"
        title={LEITFADEN_TEXTE['maengel.schweregrad'].title}
        description={LEITFADEN_TEXTE['maengel.schweregrad'].description}
      >
        <div>
          <label className="block text-sm font-medium mb-2">Schweregrad</label>
          <div className="flex gap-4">
            {['gruen', 'orange', 'rot'].map(grad => (
              <label key={grad} className="flex items-center gap-2">
                <input
                  type="radio"
                  value={grad}
                  checked={schweregrad === grad}
                  onChange={e => setSchweregrad(e.target.value as any)}
                />
                <span className="capitalize">{grad}</span>
              </label>
            ))}
          </div>
        </div>
      </LeitfadenTooltip>

      {/* Fotos */}
      <div>
        <label className="block text-sm font-medium mb-2">Fotos hinzufügen</label>
        <div className="space-y-4">
          <KameraCapture
            onCapture={foto => setFotos([...fotos, foto])}
            quality={0.9}
          />

          {/* Fotos-Galerie */}
          {fotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {fotos.map((foto, i) => (
                <div key={i} className="relative group">
                  <img src={foto} alt={`Foto ${i + 1}`} className="w-full h-24 object-cover rounded" />
                  <button
                    type="button"
                    onClick={() => setFotos(fotos.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Frist */}
      <div>
        <label className="block text-sm font-medium mb-2">Behebungsfrist</label>
        <input
          type="date"
          value={frist}
          onChange={e => setFrist(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
      >
        Mangel speichern
      </button>
    </form>
  )
}
```

---

**Alle Beispiele sind sofort einsatzbereit — einfach copy-pasten und anpassen!**
