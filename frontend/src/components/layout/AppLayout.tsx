/**
 * Main app layout — customizable sidebar with drag-to-reorder and hide/show
 */
import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Wrench, ClipboardCheck, AlertTriangle, Settings, LogOut,
  ListChecks, GraduationCap, ShieldCheck, FlaskConical, Building2,
  GripVertical, ChevronUp, ChevronDown, Users, ScanLine, BookOpen,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '@/hooks/useAuth'
import { OnboardingTour } from '@/components/ui/OnboardingTour'
import { useLeitfaden } from '@/contexts/LeitfadenContext'

// All available nav modules (id must match route path without /)
export interface NavModule {
  id: string
  to: string
  label: string
  icon: any
  section: 'pruefungen' | 'arbeitsschutz'
  fixed?: boolean // cannot be hidden (Dashboard, Einstellungen)
}

export const ALL_MODULES: NavModule[] = [
  { id: 'arbeitsmittel', to: '/arbeitsmittel', label: 'Arbeitsmittel', icon: Wrench, section: 'pruefungen' },
  { id: 'pruefungen', to: '/pruefungen', label: 'Prüfungen', icon: ClipboardCheck, section: 'pruefungen' },
  { id: 'checklisten', to: '/checklisten', label: 'Checklisten', icon: ListChecks, section: 'pruefungen' },
  { id: 'maengel', to: '/maengel', label: 'Mängel', icon: AlertTriangle, section: 'pruefungen' },
  { id: 'mitarbeiter', to: '/mitarbeiter', label: 'Mitarbeiter', icon: Users, section: 'arbeitsschutz' },
  { id: 'unterweisungen', to: '/unterweisungen', label: 'Unterweisungen', icon: GraduationCap, section: 'arbeitsschutz' },
  { id: 'gbu', to: '/gbu', label: 'Gefährdungen', icon: ShieldCheck, section: 'arbeitsschutz' },
  { id: 'gefahrstoffe', to: '/gefahrstoffe', label: 'Gefahrstoffe', icon: FlaskConical, section: 'arbeitsschutz' },
  { id: 'fremdfirmen', to: '/fremdfirmen', label: 'Fremdfirmen', icon: Building2, section: 'arbeitsschutz' },
]

export interface SidebarConfig {
  visibleIds: string[]  // ordered list of visible module IDs
}

const DEFAULT_CONFIG: SidebarConfig = {
  visibleIds: ALL_MODULES.map(m => m.id),
}

export function loadSidebarConfig(): SidebarConfig {
  try {
    const raw = localStorage.getItem('pruefpilot_sidebar')
    if (raw) return JSON.parse(raw)
  } catch {}
  return DEFAULT_CONFIG
}

export function saveSidebarConfig(config: SidebarConfig) {
  localStorage.setItem('pruefpilot_sidebar', JSON.stringify(config))
}

// Mobile nav: first 4 visible + Einstellungen
const mobileFixedItems = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
]

export function AppLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { state: leitfadenState, toggleLeitfaden } = useLeitfaden()
  const [config, setConfig] = useState<SidebarConfig>(loadSidebarConfig)

  // Listen for storage changes from Einstellungen page
  useEffect(() => {
    const handler = () => setConfig(loadSidebarConfig())
    window.addEventListener('sidebar-config-changed', handler)
    return () => window.removeEventListener('sidebar-config-changed', handler)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Build visible nav items in order
  const visibleModules = config.visibleIds
    .map(id => ALL_MODULES.find(m => m.id === id))
    .filter(Boolean) as NavModule[]

  // Group by section
  const pruefSection = visibleModules.filter(m => m.section === 'pruefungen')
  const arbeitSection = visibleModules.filter(m => m.section === 'arbeitsschutz')

  // Mobile: first 3 visible modules + dashboard + settings
  const mobileModules = visibleModules.slice(0, 3)

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-60 flex-col bg-white border-r border-gray-200">
        {/* Logo + Leitfaden Toggle */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-black">PrüfPilot</h1>
            <p className="text-xs text-gray-400 mt-0.5">Arbeitsschutz-Zentrale</p>
          </div>
          {/* Leitfaden Toggle */}
          <button
            onClick={toggleLeitfaden}
            title={leitfadenState.isActive ? 'Leitfaden ausschalten' : 'Leitfaden aktivieren'}
            className={`p-2 rounded-lg transition-colors ${
              leitfadenState.isActive
                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
          >
            <BookOpen size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto">
          {/* Dashboard - always visible */}
          <NavLink
            to="/dashboard"
            data-tour="dashboard"
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-gray-100 text-black font-semibold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-black'
              )
            }
          >
            <LayoutDashboard size={17} />
            Dashboard
          </NavLink>

          {/* Prüfungen section */}
          {pruefSection.length > 0 && (
            <>
              <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider px-3 pt-4 pb-1.5">
                Prüfungen
              </p>
              <div className="space-y-0.5">
                {pruefSection.map(({ id, to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    data-tour={id}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                        isActive
                          ? 'bg-gray-100 text-black font-semibold'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-black'
                      )
                    }
                  >
                    <Icon size={17} />
                    {label}
                  </NavLink>
                ))}
              </div>
            </>
          )}

          {/* Arbeitsschutz section */}
          {arbeitSection.length > 0 && (
            <>
              <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider px-3 pt-4 pb-1.5">
                Arbeitsschutz
              </p>
              <div className="space-y-0.5">
                {arbeitSection.map(({ id, to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    data-tour={id}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                        isActive
                          ? 'bg-gray-100 text-black font-semibold'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-black'
                      )
                    }
                  >
                    <Icon size={17} />
                    {label}
                  </NavLink>
                ))}
              </div>
            </>
          )}

          {/* Einstellungen - always at bottom */}
          <div className="mt-3 pt-3 border-t border-gray-50">
            <NavLink
              to="/einstellungen"
              data-tour="einstellungen"
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-gray-100 text-black font-semibold'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-black'
                )
              }
            >
              <Settings size={17} />
              Einstellungen
            </NavLink>
          </div>
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-black hover:bg-gray-50 transition-colors w-full"
          >
            <LogOut size={17} />
            Abmelden
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0 bg-surface">
        {/* Leitfaden Info-Banner */}
        {leitfadenState.isActive && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex items-center gap-3">
            <BookOpen size={16} className="text-blue-600 flex-shrink-0" />
            <p className="text-sm text-blue-700 font-medium">
              Leitfaden aktiv — Klicke auf die Info-Icons neben den Funktionen für Erklärungen
            </p>
          </div>
        )}
        <Outlet />
      </main>

      {/* Onboarding Tour */}
      <OnboardingTour />

      {/* Bottom Nav - Mobile/Tablet */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50">
        <div className="flex justify-around">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center py-2.5 px-3 text-xs min-w-[56px]',
                isActive ? 'text-black font-semibold' : 'text-gray-400'
              )
            }
          >
            <LayoutDashboard size={20} />
            <span className="mt-1">Home</span>
          </NavLink>
          {mobileModules.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center py-2.5 px-3 text-xs min-w-[56px]',
                  isActive ? 'text-black font-semibold' : 'text-gray-400'
                )
              }
            >
              <Icon size={20} />
              <span className="mt-1">{label.length > 8 ? label.slice(0, 7) + '.' : label}</span>
            </NavLink>
          ))}
          <NavLink
            to="/qr-scanner"
            data-tour="scan-button"
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center py-2.5 px-3 text-xs min-w-[56px]',
                isActive ? 'text-black font-semibold' : 'text-gray-400'
              )
            }
          >
            <ScanLine size={20} />
            <span className="mt-1">Scan</span>
          </NavLink>
          <NavLink
            to="/einstellungen"
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center py-2.5 px-3 text-xs min-w-[56px]',
                isActive ? 'text-black font-semibold' : 'text-gray-400'
              )
            }
          >
            <Settings size={20} />
            <span className="mt-1">Mehr</span>
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
