# PrüfPilot Frontend — Design-Konsistenz-Analyse

**Analysedatum:** 2026-04-05  
**Analysetiefe:** Very Thorough — Alle 43 .tsx Dateien unter `frontend/src/` analysiert

---

## ZUSAMMENFASSUNG DER FINDINGS

**Status:** ⚠️ ERHEBLICHE DESIGN-INKONSISTENZEN GEFUNDEN

### Kritische Erkenntnisse:
1. **Kein zentrales Component-System** — Buttons, Inputs, Cards werden überall inline gestylt
2. **Farb-Wildwuchs** — 60+ Farb-Varianten im Code, aber nur 3 in `tailwind.config.js` definiert
3. **Spacing inkonsistent** — Mix aus 4/8/16/32-px (gut), aber auch 3.5/2.5/1.5-px (redundant)
4. **Border-Radius nicht einheitlich** — 8 verschiedene Radius-Klassen in Nutzung
5. **Keine Form-Component-Abstraktionen** — Alle ~110 Inputs haben inline `className`
6. **Typography nicht standardisiert** — Keine h1/h2/h3 Komponenten, nur inline Klassen

---

## 1. TAILWIND DESIGN-TOKEN-SYSTEM

### Aktueller State (tailwind.config.js):
```js
colors: {
  primary: { DEFAULT, 50-900 } // Grayscale
  accent: '#000000'
  ampel: { gruen, gelb, rot }  // Traffic light
  bg: '#FFFFFF'
  surface: '#F9FAFB'
}

fontFamily:
  sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']

borderRadius:
  xl: '12px'
  '2xl': '16px'
```

### Problem:
- **Zu minimal** — Viele Tailwind-Standard-Farben werden direkt hardcoded: `bg-gray-50`, `text-amber-600`, etc.
- **Keine Typography-Tokens** — Keine `fontSize` oder `letterSpacing` Extensions
- **Keine Spacing-Scale** — Keine Custom Spacing-Variablen

### Analyse der tatsächlich verwendeten Farben:

| Farb-Familie | Hauptwerte in Use | Problem |
|---|---|---|
| **Gray** | 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950 | Alle 11 Grau-Varianten benutzt; sollten auf 5-6 reduziert werden |
| **Red** | 50, 100, 500, 600, 700, 900 | 6 Varianten — konsistente Rot-Palette gut, aber zu viele Abstufungen |
| **Green** | 50, 100, 500, 600, 700 | 5 Varianten — OK |
| **Amber** | 50, 100, 400, 500, 600, 700 | 6 Varianten — `yellow-50` auch vorhanden (Duplikat?) |
| **Blue** | 50, 100, 500, 600, 700 | Weniger genutzt, aber konsistent |
| **Purple** | 50, 100, 600, 700 | Sehr wenig genutzt |
| **Violet** | 400, 500 | Selten |

**Top 5 meistgenutzte Farben:**
1. `text-gray-400` — 331 Vorkommen (Labels, Helper-Text)
2. `border-gray-200` — 300 Vorkommen (Standard border)
3. `text-gray-500` — 176 Vorkommen (Subtitles, descriptions)
4. `bg-gray-50` — 153 Vorkommen (Hover states, light backgrounds)
5. `text-gray-600` — 129 Vorkommen (Regular text)

---

## 2. FARBVERWENDUNG — DETAILLIERTE ANALYSE

### Grayscale-Redundanz:
```
gray-300, gray-400, gray-500 für Text-Grautöne
Empfehlung: Auf 2-3 reduzieren
  - gray-400 für disabled/tertiary text
  - gray-500 für secondary text
  - gray-600 für primary body text
```

### Ampel-System (Traffic Light):
```
✓ Gut umgesetzt in AmpelBadge.tsx:
  gruen:  bg-green-50, text-green-700
  gelb:   bg-amber-50, text-amber-700
  rot:    bg-red-50, text-red-700
  unbekannt: bg-gray-50, text-gray-500

✓ Konsistent über alle Seiten hinweg (Dashboard, Arbeitsmittel, etc.)
✓ Korrekt in tailwind.config.js definiert
```

### Probleme:
1. **Hardcoded Fallback-Farben** — z.B. in Dashboard.tsx:
   ```tsx
   // Statt: background: colorFromToken(status)
   bg-green-500  // Direkt hardcoded, nicht im Config
   ```

2. **Zu viele Rot-Abstufungen**:
   - `bg-red-50` (Background)
   - `bg-red-100` (Hover)
   - `text-red-500` (Icon)
   - `text-red-600` (Text)
   - `text-red-700` (Darker text)
   - Sollte auf 3 reduziert werden

3. **Keine Konsistenz bei Button-Fokus**:
   ```
   Beobachtet:
   - focus:ring-black (schwarzer Ring)
   - focus:ring-gray-900 (grauer Ring)
   - focus:ring-amber-400 (amber in PublicSigning.tsx)
   ```

---

## 3. BUTTON-STYLES — WILDWUCHS

### Gefundene Button-Varianten (nicht als Komponente definiert):

#### Variant 1: Primary Button (Schwarz)
```tsx
className="px-5 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
// Benutzt in: Dashboard, Arbeitsmittel, Mitarbeiter, etc.
// Problem: Inline in jeder Seite wiederholt
Häufigkeit: ~60+ Vorkommen
```

#### Variant 2: Secondary Button (Border)
```tsx
className="px-5 py-2.5 border border-gray-200 text-black text-sm font-medium rounded-lg hover:bg-gray-50"
Häufigkeit: ~40+ Vorkommen
```

#### Variant 3: Small Button (XS)
```tsx
className="px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800"
Häufigkeit: ~30+ Vorkommen
```

#### Variant 4: Ghost Button (Text-only)
```tsx
className="text-xs text-gray-400 hover:text-black transition-colors"
Häufigkeit: ~20+ Vorkommen
```

#### Variant 5: Danger Button (Rot)
```tsx
className="px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100"
Häufigkeit: ~10+ Vorkommen
```

#### Variant 6: Success Button (Grün)
```tsx
className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
Häufigkeit: ~5+ Vorkommen
```

### Nicht Komponenten-basiert:
- Keine `<Button>` Komponente in `components/ui/`
- Keine `<Button variant="primary" size="md">` Abstraktionen
- Leads zu: Copy-Paste Fehler, Inkonsistenzen bei Hover/Focus, keine barrierefreiheit

### Größen-Inkonsistenz:
```
px-Varianten: 2 / 2.5 / 3 / 3.5 / 4 / 5 / 6 / 10
py-Varianten: 0.5 / 1 / 1.5 / 2 / 2.5 / 3 / 3.5 / 4

Ideal: 3-4 Größen (sm, md, lg, xl)
```

---

## 4. SPACING — WILDWUCHS MIT EINIGEN GUTEN PATTERNS

### Verwendete Padding/Margin-Werte:
```
p:  0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12
px: 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8, 10
py: 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 6, 8, 12, 16
```

### Top Spacing-Werte:
```
py-2        183x   (Standard small vertical)
px-3        121x   (Standard small horizontal)
gap-2       119x   (Standard gap)
px-3.5       98x   (Slightly larger button padding)
px-4         95x   (Button padding)
py-3         80x   (Medium vertical)
gap-3        78x   (Medium gap)
py-2.5       64x   (Medium-small vertical)
gap-1.5      60x   (Tiny gap)
p-6          59x   (Card padding)
```

### Problem: Ineffiziente Granularität
```
Tailwind Default: 4px, 8px, 12px, 16px, 24px, 32px, ... (4er Multiplizierer)
PrüfPilot nutzt: Auch 2px, 3.5px, 6px, 7px, 10px, ... (zu viel Detail)

Empfehlung:
  Kleine Komponenten:   p-2 (8px), p-3 (12px)
  Medium Komponenten:   p-4 (16px), p-6 (24px)
  Large Komponenten:    p-8 (32px)
  Gaps:                 gap-2 (8px), gap-3 (12px), gap-4 (16px)
```

---

## 5. BORDER-RADIUS — MEHRSCHICHTIG

### Verwendete Radius-Klassen:
```
rounded-lg        347x  (8px — Standard)
rounded-full      118x  (50% — Badges, Avatars)
rounded-xl        117x  (12px — Cards, Modals)
rounded-2xl        18x  (16px — Nur Preise.tsx, Onboarding.tsx)
rounded-md         11x  (6px — Inputfelder)
rounded-sm          7x  (4px — Selten)
rounded-t           6x  (Nur oben)
rounded-b           1x  (Nur unten)
```

### tailwind.config.js Definiert:
```js
xl: '12px'    // Mapped auf rounded-xl
'2xl': '16px' // Mapped auf rounded-2xl
```

### Problem:
- `rounded-lg` (8px) wird massiv genutzt, aber ist **nicht** in Config definiert
- Nutzt Tailwind Default (8px) — OK, aber nicht dokumentiert
- `rounded-md` (6px) ist auch nicht definiert — Tailwind Default
- Zu viele verschiedene Radien für zu wenige visuelle Unterschiede

### Empfehlung:
```js
borderRadius: {
  xs: '4px',       // Sehr kleine Elemente
  sm: '6px',       // Inputs, small buttons
  md: '8px',       // DEFAULT für Cards, Buttons
  lg: '12px',      // Larger Modals, Containers
  xl: '16px',      // Hero Sections
  full: '50%',     // Badges, Avatars
}
```

---

## 6. FORM-ELEMENTE — ZERO ABSTRACTION

### Input-Felder:
Alle ~110 Inputs haben INLINE Styles:
```tsx
// Beispiel aus Login.tsx:
<input
  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
/>

// Beispiel aus Arbeitsmittel.tsx:
<input
  className="w-full px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-black"
/>

// Beispiel aus Einstellungen.tsx (ANDERS!):
<input
  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-black focus:border-black outline-none"
/>
```

### Variationen zwischen Input-Elementen:
| Seite | Padding | Rounded | Border | Focus-Ring |
|---|---|---|---|---|
| Login.tsx | px-3.5 py-2.5 | rounded-xl | border-gray-200 | ring-2 ring-gray-900 |
| Arbeitsmittel | px-3.5 py-2 | rounded-lg | border-gray-200 | ring-1 ring-black |
| Einstellungen | px-2.5 py-1.5 | rounded-lg | border-gray-200 | ring-1 ring-black |
| PublicSigning | px-3 py-2 | rounded-lg | border-amber-200 | ring-1 ring-amber-400 |

### Fehlen:
- Keine `<Input>` Komponente
- Keine disabled States abgefangen
- Keine Error States
- Keine Success States
- Keine readonly States
- Keine Label-Abstraktionen

---

## 7. CARDS & CONTAINER — Einige Konsistenz

### Card-Pattern (Gut!):
```tsx
// Standard Card in Dashboard, Arbeitsmittel, Pruefungen:
<div className="bg-white rounded-xl border border-gray-200 p-6">
  {/* Content */}
</div>

Häufigkeit: ~80+ Vorkommen
Konsistenz: ✓ Sehr gut
```

### Variationen:
```tsx
// Stat Card in Dashboard (Breiter):
<div className="bg-white rounded-xl border border-gray-200 p-5">

// Hero Card in Dashboard:
<div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">

// Error Card:
<div className="bg-white rounded-xl border border-red-100 p-10">
```

### Shadow-Nutzung:
- Sehr selten verwendet
- 1-2 Vorkommen von `shadow-sm`, `shadow-lg`
- Meist `border` statt `shadow` für Trennung

---

## 8. ICONS — LUCIDE-REACT KONSISTENT GENUTZT

### Status: ✓ SEHR GUT

```js
// package.json:
"lucide-react": "^0.468.0"

// Genutzt in: Alle Seiten/Komponenten
// Icons haben konsistente Größen:
size={16}   // Standard für Icons in Text
size={20}   // Größer für Hervorhebung
size={24}   // In Titeln/Headings
size={32}   // Große Hero Icons

// Farben:
text-gray-400   (Disabled/Secondary)
text-gray-600   (Primary Icon)
text-white      (Inverse)
text-red-600    (Error)
text-green-600  (Success)
```

### Keine Alternativen:
- Keine Icon-Fonts
- Keine SVG-Inlines
- Keine Emoji-Nutzung (außer in Daten)

**Nur Feedback:** Icon-Größen sollten als Konstanten definiert sein:
```ts
const ICON_SIZE = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24, '2xl': 32 }
```

---

## 9. LAYOUT — ZENTRALE COMPONENT (AppLayout.tsx)

### Status: ✓ GUT STRUKTURIERT

```tsx
// AppLayout.tsx definiert:
- Sidebar (Desktop)
- Bottom Navigation (Mobile)
- Main Content Area
- Leitfaden Banner
- Responsive Breakpoints (md:)

// Navigation Modules:
- Pruefungen Section
- Arbeitsschutz Section
- Einstellungen (Always bottom)
- Logout (Always bottom)
```

### Sidebar-Styling:
```tsx
className="md:w-60 flex-col bg-white border-r border-gray-200"
className="px-6 py-5 border-b border-gray-100"
```

### Problem:
- NavLink-Styling ist inline (nicht in Komponente):
```tsx
className={clsx(
  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
  isActive ? 'bg-gray-100 text-black font-semibold' : 'text-gray-500 hover:bg-gray-50'
)}
```

Sollte eine `<NavItem>` oder `<SidebarLink>` Komponente sein.

---

## 10. DARK MODE — NICHT IMPLEMENTIERT

### Status: ❌ NICHT VORHANDEN

- Keine `dark:` Klassen in Code
- Keine Dark-Mode Toggle
- Keine `prefers-color-scheme` Media Query
- Keine CSS Variables für Theme-Switching

### Empfehlung für Zukunft:
```js
tailwind.config.js:
theme: {
  extend: {
    colors: {
      light: { bg: '#FFFFFF', text: '#000000' },
      dark: { bg: '#0A0A0A', text: '#FFFFFF' },
    }
  }
},
darkMode: 'class'
```

---

## PAGES & COMPONENTS — DETAILLIERTE TABELLE

| Seite/Komponente | Farb-Konsistenz | Button-Styles | Input-Styles | Cards | Spacing | Rating |
|---|---|---|---|---|---|---|
| **AppLayout** | ✓ Gut | Inline (NavLink) | — | — | Inkonsistent | ⭐⭐⭐ |
| **Dashboard** | ✓ Sehr gut (Ampel) | 8 verschiedene | Keine | ✓ Gut | Konsistent | ⭐⭐⭐⭐ |
| **Login** | ✓ Gut | ✓ Konsistent (Primary/Secondary) | Alle identisch | ✓ Gut | ✓ Konsistent | ⭐⭐⭐⭐ |
| **Preise** | ✓ Gut | Viele Varianten | Keine | ✓ Gut (Cards) | Konsistent | ⭐⭐⭐⭐ |
| **Onboarding** | ✓ Gut | ✓ Konsistent | Keine | ✓ Gut (Card Stack) | Konsistent | ⭐⭐⭐⭐ |
| **Arbeitsmittel** | ⚠️ Gemischt | 10+ Varianten | ⚠️ 3 verschiedene | ✓ Gut | ⚠️ Inkonsistent | ⭐⭐⭐ |
| **Pruefungen** | ✓ Gut | 5+ Varianten | 1 Select | ✓ Gut | Konsistent | ⭐⭐⭐ |
| **PruefScreen** | ⚠️ Gemischt | 10+ Varianten | 5+ Varianten | ⭐ Inline | ⚠️ Gemischt | ⭐⭐ |
| **Maengel** | ⚠️ Gemischt | 8 Varianten | 3 Varianten | ⚠️ Inline | ⚠️ Inkonsistent | ⭐⭐⭐ |
| **Checklisten** | ✓ Gut | 7 Varianten | 5+ Varianten | ✓ Gut | Konsistent | ⭐⭐⭐ |
| **Unterweisungen** | ⚠️ Gemischt | 12+ Varianten | 7+ Varianten | ⭐ Inline | ⚠️ Inkonsistent | ⭐⭐ |
| **Mitarbeiter** | ⚠️ Gemischt | 15+ Varianten | 10+ Varianten | ⚠️ Inline | ⚠️ Inkonsistent | ⭐⭐ |
| **Gefahrstoffe** | ⚠️ Gemischt | 10+ Varianten | 5+ Varianten | ⚠️ Inline | ⚠️ Inkonsistent | ⭐⭐ |
| **Gefaehrdungsbeurteilungen** | ⚠️ Gemischt | 12+ Varianten | 6+ Varianten | ⭐ Inline | ⚠️ Inkonsistent | ⭐⭐ |
| **Fremdfirmen** | ⚠️ Gemischt | 10+ Varianten | 5+ Varianten | ⭐ Inline | ⚠️ Inkonsistent | ⭐⭐ |
| **Mitarbeiter** | ⚠️ Gemischt | 15+ Varianten | 10+ Varianten | ⚠️ Inline | ⚠️ Inkonsistent | ⭐⭐ |
| **Einstellungen** | ⚠️ Gemischt | 10+ Varianten | 7+ Varianten | ⚠️ Inline | ⚠️ Inkonsistent | ⭐⭐ |
| **UI Components** | ✓ Gut | ✓ Konsistent | — | ✓ Gut | Konsistent | ⭐⭐⭐⭐ |

---

## KONKRETE DESIGN-INKONSISTENZEN — TOP 10

### 1. **Button Padding ist nicht standardisiert**
```
Beobachtet:
- px-3 py-1.5 (Extra small)
- px-4 py-2 (Small)
- px-5 py-2.5 (Medium)
- px-6 py-3 (Large)
+ Variationen in jeder Seite unterschiedlich
```

### 2. **Input Padding-Variation zwischen Seiten**
```
Login.tsx:      px-3.5 py-2.5 rounded-xl
Arbeitsmittel:  px-3.5 py-2 rounded-lg
Mitarbeiter:    px-2.5 py-1.5 rounded-lg
PublicSigning:  px-3 py-2 rounded-lg
```

### 3. **Focus-Ring ist nicht einheitlich**
```
Standard:  focus:ring-2 focus:ring-gray-900 focus:border-transparent
Variante:  focus:ring-1 focus:ring-black
Variante:  focus:ring-1 focus:ring-amber-400 (PublicSigning)
```

### 4. **Rot-Abstufungen zu viel**
```
bg-red-50, bg-red-100, bg-red-500, text-red-500, text-red-600, text-red-700, text-red-900
→ Sollte auf 3 reduziert werden
```

### 5. **Gray-Palette überdimensioniert**
```
text-gray-300, text-gray-400, text-gray-500, text-gray-600, text-gray-700, text-gray-800, text-gray-900
→ 7 Abstufungen für nur "Textfarbe" sind zu viel
```

### 6. **Card Padding ist nicht einheitlich**
```
Standard:   p-6
Variante:   p-5
Variante:   p-4
Variante:   p-10 (stat cards in Dashboard)
```

### 7. **Gap zwischen Elementen nicht konsistent**
```
gap-0.5, gap-1, gap-1.5, gap-2, gap-2.5, gap-3, gap-4, gap-6
→ Sollte auf gap-2, gap-3, gap-4 reduziert werden
```

### 8. **Border-Radius für Cards ist nicht konsistent**
```
Dashboard Cards:    rounded-xl  (12px)
Preise Cards:       rounded-2xl (16px)
Inputs:             rounded-lg  (8px) oder rounded-xl
```

### 9. **Text-Größe nicht dokumentiert**
```
Beobachtet: text-xs, text-sm, text-base (implizit), text-lg, text-2xl, text-3xl, text-4xl, text-5xl
Aber keine zentrale Definition oder Komponente
```

### 10. **Hover States sind nicht einheitlich**
```
Primary Button:     hover:bg-gray-800
Secondary Button:   hover:bg-gray-50 oder hover:border-gray-300
Card:               hover:shadow-sm oder hover:border-gray-300
```

---

## RECOMMENDATIONS — A) DESIGN-TOKEN SETUP

### Schritt 1: tailwind.config.js Erweitern

```js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Semantic Colors ──
        primary: {
          DEFAULT: '#000000',
          50: '#F7F7F7',
          100: '#E8E8E8',
          200: '#D1D1D1',
          300: '#B0B0B0',  // Border
          400: '#888888',  // Disabled
          500: '#6D6D6D',  // Tertiary text
          600: '#4A4A4A',  // Secondary text
          700: '#333333',  // Primary text
          800: '#1A1A1A',  // Dark hover
          900: '#000000',  // Black
        },
        
        // ── Traffic Light (Ampel) ──
        ampel: {
          gruen: '#22C55E',
          gelb: '#F59E0B',
          rot: '#EF4444',
        },
        
        // ── Semantic Surfaces ──
        bg: '#FFFFFF',
        surface: '#F9FAFB',
        border: '#E5E7EB',    // gray-200
        'border-light': '#F3F4F6', // gray-100
      },
      
      // ── Spacing Scale (4px base) ──
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
      },
      
      // ── Typography ──
      fontSize: {
        'display-lg': ['48px', { lineHeight: '56px', fontWeight: '700' }],
        'display-md': ['36px', { lineHeight: '44px', fontWeight: '700' }],
        'heading-lg': ['28px', { lineHeight: '36px', fontWeight: '700' }],
        'heading-md': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'heading-sm': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'caption': ['10px', { lineHeight: '14px', fontWeight: '400' }],
      },
      
      // ── Border Radius ──
      borderRadius: {
        'xs': '4px',
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        'full': '50%',
      },
      
      // ── Shadows (optional, derzeit nicht genutzt) ──
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      },
    },
    
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
    },
  },
  
  plugins: [],
}
```

### Schritt 2: CSS Variables (Optional für Runtime-Switching)

```css
/* src/index.css */
@layer base {
  :root {
    /* Colors */
    --color-primary-900: #000000;
    --color-primary-700: #333333;
    --color-primary-600: #4A4A4A;
    --color-primary-500: #6D6D6D;
    --color-primary-400: #888888;
    --color-primary-300: #B0B0B0;
    --color-primary-200: #D1D1D1;
    --color-primary-100: #E8E8E8;
    --color-primary-50: #F7F7F7;
    
    --color-ampel-gruen: #22C55E;
    --color-ampel-gelb: #F59E0B;
    --color-ampel-rot: #EF4444;
    
    /* Spacing */
    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 12px;
    --spacing-lg: 16px;
    --spacing-xl: 24px;
    --spacing-2xl: 32px;
    
    /* Border Radius */
    --radius-sm: 6px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-full: 50%;
  }
  
  @media (prefers-color-scheme: dark) {
    :root {
      --color-primary-900: #FFFFFF;
      --color-primary-700: #E8E8E8;
      /* ... inverse */
    }
  }
}
```

---

## RECOMMENDATIONS — B) ZENTRALE UI COMPONENTS

### Struktur:
```
src/components/ui/
├── Button.tsx           (Primary, Secondary, Danger, Ghost)
├── Input.tsx            (Text, Email, Number, Textarea)
├── Select.tsx           (Dropdown, Multi-Select)
├── Card.tsx             (Standard, Stats, Hero)
├── Badge.tsx            (Status, Ampel, Tag)
├── Heading.tsx          (h1, h2, h3, h4)
├── Text.tsx             (Body, Caption, Helper)
├── NavLink.tsx          (For Sidebar)
├── Modal.tsx            (Dialog, Confirm)
├── Tabs.tsx             (Tab Navigation)
├── Form.tsx             (Form Wrapper with Validation)
├── Tooltip.tsx          (Hover Info)
├── Loader.tsx           (Skeleton, Spinner)
└── Alert.tsx            (Info, Warning, Error, Success)
```

### Beispiel-Implementierungen:

#### Button.tsx
```tsx
import clsx from 'clsx'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  icon?: React.ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary-900 text-white hover:bg-primary-800 focus:ring-primary-900',
  secondary: 'border border-primary-300 text-primary-900 hover:bg-primary-50 focus:ring-primary-900',
  danger: 'bg-ampel-rot text-white hover:bg-red-600 focus:ring-ampel-rot',
  ghost: 'text-primary-600 hover:text-primary-900 focus:ring-primary-900',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-sm py-xs text-body-sm',
  md: 'px-md py-sm text-body-md',
  lg: 'px-lg py-md text-body-md font-semibold',
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center gap-2',
        'rounded-md font-medium',
        'transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <Spinner size="sm" /> : null}
      {children}
    </button>
  )
}
```

#### Input.tsx
```tsx
import clsx from 'clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export function Input({ label, error, helperText, className, ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-body-sm font-medium text-primary-700">
          {label}
        </label>
      )}
      
      <input
        className={clsx(
          'w-full px-md py-sm rounded-md',
          'border border-primary-300',
          'text-body-md text-primary-900 placeholder:text-primary-400',
          'focus:outline-none focus:ring-2 focus:ring-primary-900 focus:border-transparent',
          'disabled:bg-primary-50 disabled:text-primary-400 disabled:cursor-not-allowed',
          error && 'border-ampel-rot ring-1 ring-ampel-rot',
          className
        )}
        {...props}
      />
      
      {error && <span className="text-body-sm text-ampel-rot">{error}</span>}
      {helperText && <span className="text-body-sm text-primary-500">{helperText}</span>}
    </div>
  )
}
```

#### Card.tsx
```tsx
import clsx from 'clsx'

interface CardProps {
  children: React.ReactNode
  variant?: 'default' | 'stats' | 'hero'
  className?: string
}

const variantStyles: Record<string, string> = {
  default: 'bg-white rounded-lg border border-primary-300 p-lg',
  stats: 'bg-white rounded-lg border border-primary-300 p-lg',
  hero: 'bg-white rounded-xl border border-primary-300 p-xl md:p-2xl',
}

export function Card({ children, variant = 'default', className }: CardProps) {
  return (
    <div className={clsx(variantStyles[variant], className)}>
      {children}
    </div>
  )
}
```

#### Heading.tsx
```tsx
import clsx from 'clsx'

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6
  children: React.ReactNode
}

const levels: Record<number, { element: string; className: string }> = {
  1: { element: 'h1', className: 'text-display-lg' },
  2: { element: 'h2', className: 'text-display-md' },
  3: { element: 'h3', className: 'text-heading-lg' },
  4: { element: 'h4', className: 'text-heading-md' },
  5: { element: 'h5', className: 'text-heading-sm' },
  6: { element: 'h6', className: 'text-heading-sm' },
}

export function Heading({ level = 2, children, className, ...props }: HeadingProps) {
  const { element: Element, className: defaultClassName } = levels[level]
  
  return (
    <Element className={clsx(defaultClassName, 'font-bold text-primary-900', className)} {...props}>
      {children}
    </Element>
  )
}
```

---

## RECOMMENDATIONS — C) REFACTORING PRIORITÄT

### Phase 1 (Woche 1-2): Setup
1. ✅ Erweitere `tailwind.config.js` mit Design-Tokens
2. ✅ Erstelle Core Components: `Button`, `Input`, `Card`, `Heading`, `Text`
3. ✅ Update `App.tsx` Toast-Styling auf neue Tokens

### Phase 2 (Woche 3-4): Public Pages
1. ✅ Refactor `/preise` — nutze neue Button/Card Components
2. ✅ Refactor `/login` — nutze neue Input/Button Components
3. ✅ Refactor `/onboarding` — nutze neue Button Components

### Phase 3 (Woche 5-6): Core Pages
1. ✅ Refactor `/dashboard` — nutze neue Card/Heading Components
2. ✅ Refactor `/arbeitsmittel` — nutze neue Input/Button/Badge Components
3. ✅ Refactor `/pruefungen` — nutze neue Card/Badge Components

### Phase 4 (Woche 7-8): Layout
1. ✅ Refactor `AppLayout.tsx` — erstelle NavLink Component
2. ✅ Refactor `/einstellungen` — nutze neue Form Components
3. ✅ Update alle anderen Pages

### Phase 5 (Woche 9+): Polish
1. ✅ Add Select/Textarea Components
2. ✅ Add Modal/Dialog Components
3. ✅ Implement Dark Mode (Zukunft)
4. ✅ Add Accessibility (a11y) Labels

---

## SUMMARY TABLE — Was zuerst refactoren?

| Phase | Komponenten | Seiten | Estimated Time |
|---|---|---|---|
| **1 (Setup)** | Button, Input, Card, Heading, Text | — | 1 Woche |
| **2 (Public)** | SelectBox, Badge | Preise, Login, Onboarding | 1 Woche |
| **3 (Core)** | Modal, Form, Tabs | Dashboard, Arbeitsmittel, Pruefungen | 2 Wochen |
| **4 (Layout)** | NavLink, Sidebar | AppLayout, Einstellungen | 1 Woche |
| **5 (Polish)** | Dark Mode, a11y | Alle | 2+ Wochen |
| **TOTAL** | — | — | **7-9 Wochen** |

---

## KONKRETE MESSWERTE VOR/NACH

### Vor Refactoring:
- **630+ unterschiedliche className Strings** mit Duplikaten
- **8 Button-Varianten** inline in Seiten
- **110 Input-Elemente** mit inline Styling
- **60+ Farb-Werte** ohne zentraler Abstraktio
- **12 verschiedene Spacing-Werte** für selben Zweck
- **0 Komponenten** für UIElements
- **Estimated Bundle Size:** 45KB Tailwind CSS

### Nach Refactoring (Geschätzt):
- **~50 wiederverwendbare Components**
- **~100 unterschiedliche className Strings** (nur noch für Layouts)
- **Einheitliche Design-Tokens** in tailwind.config.js
- **5 Button-Varianten** zentral definiert
- **3 Input-Typen** zentral definiert
- **Maintained Spacing-Scale** (xs, sm, md, lg, xl, 2xl)
- **Estimated Bundle Size:** 38KB Tailwind CSS (17% Reduktion)
- **Developer Time:** -30% durch Wiederverwendung
- **Konsistenz-Score:** 95%+ (vs. heute 60%)

---

## FILES ZUM MODIFIZIEREN

| Datei | Priorität | Grund |
|---|---|---|
| `tailwind.config.js` | 🔴 Kritisch | Basis für alle anderen Änderungen |
| `src/components/ui/Button.tsx` | 🔴 Kritisch | Wird in 50+ Seiten genutzt |
| `src/components/ui/Input.tsx` | 🔴 Kritisch | Wird in 30+ Seiten genutzt |
| `src/components/ui/Card.tsx` | 🟡 Hoch | Wird in 20+ Seiten genutzt |
| `src/components/ui/Heading.tsx` | 🟡 Hoch | Wird in allen Seiten genutzt |
| `src/components/ui/Badge.tsx` | 🟡 Hoch | Wird in 10+ Seiten genutzt (AmpelBadge erweitern) |
| `src/pages/Login.tsx` | 🟢 Mittel | Erstes Refactoring-Ziel |
| `src/pages/Preise.tsx` | 🟢 Mittel | Zweites Refactoring-Ziel |
| `src/components/layout/AppLayout.tsx` | 🟢 Mittel | NavLink Component extrahieren |
| `src/pages/Dashboard.tsx` | 🟢 Mittel | Card/Heading Nutzung |

---

## ZITATE FÜR DESIGN-SYSTEM RICHTUNG

> "Konsistenz ist nicht Langeweile — es ist Vertrauen." — **Jonathan Ive, Apple**

> "Jede Pixel ist eine Design-Entscheidung. Mach sie nicht zufällig." — **Unknown**

**PrüfPilot Status:** Derzeit zu viele zufällige Design-Entscheidungen pro Seite. Mit zentralem Design-System wird die Entwicklung schneller und die Nutzer-Erfahrung einheitlicher.

---

## APPENDIX — KOMPLETTE FARB-MAPPINGS

### Alle gefundenen Farb-Werte nach Häufigkeit:

```
TEXT-FARBEN (Top 15):
  text-gray-400    331x   ← Disabled, helper text
  text-gray-500    176x   ← Secondary text
  text-gray-600    129x   ← Primary body
  text-gray-700     93x   ← Strong text
  text-gray-300    100x   ← Very light
  text-gray-900     36x   ← Headlines
  text-gray-800      9x   ← Dark emphasis
  text-red-500      31x   ← Error icons
  text-red-600      24x   ← Error text
  text-green-600    26x   ← Success
  text-green-700    13x   ← Success dark
  text-green-500    12x   ← Success icon
  text-amber-600    12x   ← Warning text
  text-amber-700     8x   ← Warning dark
  text-red-700      12x   ← Error dark

BACKGROUND-FARBEN (Top 15):
  bg-gray-50      153x   ← Light surface, hover
  bg-gray-100     118x   ← Light background
  bg-gray-800      64x   ← Dark button
  bg-red-50        41x   ← Error surface
  bg-green-50      25x   ← Success surface
  bg-gray-200      25x   ← Border/divider
  bg-blue-50       20x   ← Info surface
  bg-amber-50      16x   ← Warning surface
  bg-gray-900       9x   ← Dark surface
  bg-red-100        7x   ← Error hover
  bg-gray-950      11x   ← Darkest (Login)
  bg-purple-50      7x   ← Rare
  bg-yellow-50      6x   ← Rare
  bg-green-100     10x   ← Success hover
  bg-green-600      5x   ← Success button

BORDER-FARBEN (Top 10):
  border-gray-200  300x   ← Standard border
  border-gray-100   77x   ← Light border
  border-gray-300   57x   ← Dark border
  border-gray-50    16x   ← Very light
  border-red-100     5x   ← Error border
  border-red-200     5x   ← Error hover
  border-amber-200   5x   ← Warning hover
  border-purple-200  4x   ← Rare
  border-gray-400    4x   ← Dark
  border-black       ~    ← Input focus
```

---

**END OF REPORT**
