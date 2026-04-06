/**
 * Auth Guard — redirects to /preise if no token
 * (Neue Besucher sollen die Preisseite als Einstieg sehen)
 *
 * Protects all routes under ProtectedRoute:
 * - /schnellstart (company setup)
 * - /dashboard
 * - /arbeitsmittel
 * - /pruefungen
 * - etc.
 */
import { Navigate, Outlet } from 'react-router-dom'

export function ProtectedRoute() {
  const token = localStorage.getItem('access_token')

  if (!token) {
    return <Navigate to="/preise" replace />
  }

  return <Outlet />
}
