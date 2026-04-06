import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { LeitfadenProvider } from '@/contexts/LeitfadenContext'
import { Login } from '@/pages/Login'
import { PreisePage } from '@/pages/Preise'
import { OnboardingPage } from '@/pages/Onboarding'
import { Dashboard } from '@/pages/Dashboard'
import { ArbeitsmittelPage } from '@/pages/Arbeitsmittel'
import { PruefungenPage } from '@/pages/Pruefungen'
import { PruefScreen } from '@/pages/PruefScreen'
import { MaengelPage } from '@/pages/Maengel'
import { ChecklistenPage } from '@/pages/Checklisten'
import { UnterweisungenPage } from '@/pages/Unterweisungen'
import { MitarbeiterPage } from '@/pages/Mitarbeiter'
import { GBUPage } from '@/pages/Gefaehrdungsbeurteilungen'
import { GefahrstoffePage } from '@/pages/Gefahrstoffe'
import { FremdfirmenPage } from '@/pages/Fremdfirmen'
import { EinstellungenPage } from '@/pages/Einstellungen'
import { PublicSigningPage } from '@/pages/PublicSigning'
import { SchnellstartPage } from '@/pages/Schnellstart'
import { DatenschutzPage } from '@/pages/Datenschutz'
import { ImpressumPage } from '@/pages/Impressum'
import { HilfePage } from '@/pages/Hilfe'
import { QRScanner } from '@/pages/QRScanner'
import { FeedbackButton } from '@/components/ui/FeedbackButton'

/**
 * Routing-Flow für neue Besucher:
 *   / (Redirect → /preise)
 *   /preise         → Öffentliche Preisseite
 *   /onboarding     → 5-Schritt Fragebogen (Shopify-Style)
 *   /login          → Login & Registrierung
 *   /schnellstart   → Unternehmensdaten (nach Login)
 *   /dashboard      → Hauptseite (nach Setup)
 */
export default function App() {
  return (
    <LeitfadenProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#000',
              color: '#fff',
              fontSize: '14px',
              borderRadius: '8px',
            },
          }}
        />
      <Routes>
        {/* ── Öffentliche Routen (kein Auth nötig) ────── */}
        <Route path="/preise" element={<PreisePage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/unterweisung/:token" element={<PublicSigningPage />} />

        {/* ── Geschützte Routen (Auth erforderlich) ──── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/schnellstart" element={<SchnellstartPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/qr-scanner" element={<QRScanner />} />
            <Route path="/arbeitsmittel" element={<ArbeitsmittelPage />} />
            <Route path="/pruefungen" element={<PruefungenPage />} />
            <Route path="/pruefungen/:pruefungId" element={<PruefScreen />} />
            <Route path="/checklisten" element={<ChecklistenPage />} />
            <Route path="/unterweisungen" element={<UnterweisungenPage />} />
            <Route path="/mitarbeiter" element={<MitarbeiterPage />} />
            <Route path="/gbu" element={<GBUPage />} />
            <Route path="/gefahrstoffe" element={<GefahrstoffePage />} />
            <Route path="/fremdfirmen" element={<FremdfirmenPage />} />
            <Route path="/maengel" element={<MaengelPage />} />
            <Route path="/einstellungen" element={<EinstellungenPage />} />
            <Route path="/datenschutz" element={<DatenschutzPage />} />
            <Route path="/impressum" element={<ImpressumPage />} />
            <Route path="/hilfe" element={<HilfePage />} />
          </Route>
        </Route>

        {/* ── Fallback: Startseite = Preise ──────────── */}
        <Route path="/" element={<Navigate to="/preise" replace />} />
        <Route path="*" element={<Navigate to="/preise" replace />} />
      </Routes>
      <FeedbackButton />
    </BrowserRouter>
    </LeitfadenProvider>
  )
}
