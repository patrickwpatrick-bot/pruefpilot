/**
 * PrüfPilot TypeScript Types
 */

export interface User {
  id: string
  email: string
  vorname: string
  nachname: string
  rolle: 'admin' | 'pruefer' | 'mitarbeiter'
  organisation_id: string
}

export interface Standort {
  id: string
  name: string
  strasse?: string
  hausnummer?: string
  plz?: string
  ort?: string
  gebaeude?: string
  abteilung?: string
  etage?: string
  beschreibung?: string
}

export interface Arbeitsmittel {
  id: string
  name: string
  typ: string
  standort_id?: string
  hersteller?: string
  modell?: string
  seriennummer?: string
  baujahr?: number
  foto_url?: string
  beschreibung?: string
  norm?: string
  pruef_intervall_monate: number
  letzte_pruefung_am?: string
  naechste_pruefung_am?: string
  ampel_status: 'gruen' | 'gelb' | 'rot' | 'unbekannt'
  qr_code_url?: string
  created_at: string
}

export interface PruefPunkt {
  id: string
  checklisten_punkt_id: string
  ergebnis: 'ok' | 'mangel' | 'nicht_anwendbar' | 'offen'
  bemerkung?: string
  geprueft_am?: string
}

export interface Mangel {
  id: string
  beschreibung: string
  schweregrad: 'gruen' | 'orange' | 'rot'
  status: 'offen' | 'in_bearbeitung' | 'erledigt'
  frist?: string
  erledigt_am?: string
  created_at: string
}

export interface Pruefung {
  id: string
  arbeitsmittel_id: string
  checkliste_id: string
  pruefer_id: string
  status: 'entwurf' | 'in_bearbeitung' | 'abgeschlossen'
  ergebnis?: 'bestanden' | 'maengel' | 'gesperrt'
  bemerkung?: string
  ist_abgeschlossen: boolean
  abgeschlossen_am?: string
  gestartet_am: string
  protokoll_pdf_url?: string
  pruef_punkte: PruefPunkt[]
  maengel: Mangel[]
}

export type AmpelFarbe = 'gruen' | 'gelb' | 'rot' | 'unbekannt'
