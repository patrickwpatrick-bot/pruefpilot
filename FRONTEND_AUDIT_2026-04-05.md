# PrüfPilot Frontend Audit — 2026-04-05

Kritischer Code-Review des Frontends (React + TypeScript + Vite + Tailwind).

---

## 🔴 KRITISCH

| # | Kategorie | Datei:Zeile | Problem | Fix |
|---|-----------|-------------|---------|-----|
| 1 | API-Layer | `lib/api.ts` | Token-Refresh Race Condition — 2 parallele 401er refreshen doppelt, User wird ausgeloggt | Singleton-Promise: `let refreshPromise: Promise<string>\|null = null` |
| 2 | Components | `pages/Arbeitsmittel.tsx` (2289 LOC) | MEGA-Component unmaintainable, 8+ useState, alles inline | Aufspalten: `ArbeitsmittelList.tsx`, `ArbeitsmittelForm.tsx`, `PruefplanungEditor.tsx`, `useArbeitsmittel.ts` |
| 3 | Components | `pages/Unterweisungen.tsx` (2045 LOC) | MEGA-Component | Aufspalten analog Arbeitsmittel |
| 4 | Components | `pages/Einstellungen.tsx` (1266 LOC) | MEGA-Component | Aufspalten nach Settings-Sektionen |
| 5 | State-Management | Projektweit | Kein Server-State-Management — überall manuelles `useState+useEffect+axios`, keine Cache-Invalidation, keine Retry | TanStack Query einführen, Server-State raus aus useState |
| 6 | Data-Consistency | `pages/PruefScreen.tsx:62-94` | Optimistic Update **ohne Rollback** bei API-Fehler | React-Query mutation mit `onError`-Rollback |
| 7 | TypeScript | `pages/{Login,Dashboard,PruefScreen}.tsx` | `any`-Types bei API-Responses, unsichere Casts | Zentrale `types/api.ts` mit allen Response-Interfaces |
| 8 | Routing | `App.tsx` | Keine Error-Boundary — eine Page crasht = ganze App weiß | `ErrorBoundary` wrapper um `<Routes>` |
| 9 | Access-Control | `components/ProtectedRoute.tsx` | Nur Token-Check, keine RBAC, kein Expiry-Check | `useAuth` + Role-Checks, Token-Validation |
| 10 | Forms | `pages/Login.tsx:70-94` | Keine Field-Validation, Seed-Calls mit silent `catch { /* ignore */ }` | Zod/Yup Schema-Validation + explizites Error-Handling |

---

## 🟠 WICHTIG

| # | Kategorie | Datei:Zeile | Problem | Fix |
|---|-----------|-------------|---------|-----|
| 11 | PruefScreen | `pages/PruefScreen.tsx:26-35` | 8+ useState Hooks in einer Page | `useReducer` für Prüf-Progress, Custom Hooks |
| 12 | Error-States | `pages/PruefScreen.tsx:134-142` | `!pruefung` unterscheidet nicht zwischen Error und null | Zentrale `<LoadingState/>` + `<ErrorState onRetry={...}/>` Components |
| 13 | Routing | `App.tsx` | `/schnellstart` ungeschützt, sollte nach Login kommen | ProtectedRoute wrapper |
| 14 | Data-Validation | Projektweit | Keine Zod/Yup Schemas | Form-Validation-Schicht |
| 15 | Date-Handling | `pages/Dashboard.tsx` | Handwritten Date-Logik (`getMonate`, `getDaysInMonth`) | date-fns / dayjs |
| 16 | Network | `lib/api.ts` | Kein Retry bei Network-Errors | Axios-Retry-Interceptor mit Exponential Backoff |
| 17 | localStorage | Projektweit | Direct access in Login/Arbeitsmittel/AppLayout | Abstraction in `lib/storage.ts` |
| 18 | A11y | Projektweit | `<button>` statt `<a>` für Navigation, fehlende `aria-label` auf Icon-Buttons | Semantic HTML + ARIA |
| 19 | Context-Duplikation | `OnboardingTour.tsx` + `LeitfadenContext.tsx` | Sync-Probleme bei State-Management | Einheitlicher Context |
| 20 | Env/Config | `lib/api.ts` | API-baseURL hardcoded `/api/v1` | `VITE_API_BASE_URL` env-var |

---

## 🟡 NICE-TO-HAVE

| # | Kategorie | Problem | Fix |
|---|-----------|---------|-----|
| 21 | Code-Duplikation | `StyledSelect` in Arbeitsmittel + `ComboBox` in Unterweisungen | Zentrale `<Select/>` Component |
| 22 | State | useState-Wildwuchs für globale Daten (user, org) | Zustand-Store für Global-State |
| 23 | Images | KameraCapture/SignaturPad senden 2-5MB Base64 | Canvas-Compression vor Upload |
| 24 | Dark Mode | Nicht vorhanden | Tailwind `dark:` Classes |
| 25 | i18n | Alles hardcoded Deutsch | `i18next` vorbereiten |
| 26 | Monitoring | Kein Sentry/Rollbar | Error-Tracking integrieren |
| 27 | Analytics | Kein User-Behavior-Tracking | Plausible/PostHog |
| 28 | Test-Coverage | Keine Frontend-Tests erkennbar | Vitest + Testing Library |
| 29 | Build | Kein Code-Splitting | `React.lazy` + Suspense pro Route |
| 30 | Icons | Lucide importiert viele, nutzt wenige | `lucide-react` individual imports |

---

## Halbfertige Screens
- `QRScanner.tsx` (357 LOC, evtl. nur Skeleton)
- `PublicSigning.tsx` (abweichendes Design, `amber-*` Farben)

## Gesamtbewertung
- TypeScript: 4/10
- State-Management: 3/10
- API-Layer: 4/10
- Routing: 5/10
- Components: 3/10
- Error-States: 3/10
- Forms: 4/10
- A11y: 4/10

**Funktional, aber produktionsunreif. Refactoring nötig vor Skalierung.**
