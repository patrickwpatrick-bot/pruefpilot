/**
 * Arbeitsmittel constants, types, and helpers
 * Extracted from Arbeitsmittel.tsx (2289 LOC → modular split)
 */
import { EQUIPMENT_TYPES } from '@/data/equipment-types'

export const TYPEN = EQUIPMENT_TYPES.map(t => t.value)

/* ─── Wiederholung / Recurrence constants ─── */
export type WiederholungTyp = 'einmalig' | 'taeglich' | 'woechentlich' | 'alle2wochen' | 'monatlich' | 'jaehrlich' | 'benutzerdefiniert'

export const WIEDERHOLUNG_OPTIONS: { value: WiederholungTyp; label: string; separator?: boolean }[] = [
  { value: 'einmalig',        label: 'Nie' },
  { value: 'taeglich',        label: 'Täglich' },
  { value: 'woechentlich',    label: 'Wöchentlich' },
  { value: 'alle2wochen',     label: 'Alle 2 Wochen' },
  { value: 'monatlich',       label: 'Monatlich' },
  { value: 'jaehrlich',       label: 'Jährlich' },
  { value: 'benutzerdefiniert', label: 'Eigene...', separator: true },
]

/** Extended day/weekday types for ordinal picker ("Am…" mode) */
export const AM_TYPEN = [
  { value: 'mo',          label: 'Montag' },
  { value: 'di',          label: 'Dienstag' },
  { value: 'mi',          label: 'Mittwoch' },
  { value: 'do',          label: 'Donnerstag' },
  { value: 'fr',          label: 'Freitag' },
  { value: 'sa',          label: 'Samstag' },
  { value: 'so',          label: 'Sonntag' },
  { value: 'tag',         label: 'Tag' },
  { value: 'wochentag',   label: 'Wochentag' },
  { value: 'wochenendtag',label: 'Wochenendtag' },
]

/** Unit items for the "Alle" two-column drum roll */
export const EINHEIT_ITEMS = [
  { value: 'tag',   label: 'Tage' },
  { value: 'woche', label: 'Wochen' },
  { value: 'monat', label: 'Monate' },
  { value: 'jahr',  label: 'Jahre' },
]

export const CUSTOM_UNITS = [
  { value: 'tag',   label: 'Tag',   labelPlural: 'Tage',   jede: 'Jeden' },
  { value: 'woche', label: 'Woche', labelPlural: 'Wochen', jede: 'Jede'  },
  { value: 'monat', label: 'Monat', labelPlural: 'Monate', jede: 'Jeden' },
  { value: 'jahr',  label: 'Jahr',  labelPlural: 'Jahre',  jede: 'Jedes' },
]

export const WOCHENTAGE_LANG  = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
export const WOCHENTAGE_MIN   = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
export const MONATE_KURZ      = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
export const MONATE_LANG      = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
export const MONATS_ORDINALE  = ['1.', '2.', '3.', '4.', '5.', 'vorletzten', 'letzten']

export interface PruefplanungState {
  startDatum: string
  wiederholung: WiederholungTyp
  customAnzahl: number
  customEinheit: string
  wochentage: number[]
  monatlichModus: 'jeden' | 'am'
  monatlichTage: number[]
  monatlichOrdinal: string
  monatlichWochentagTyp: string
  jaehrlichMonate: number[]
  jaehrlichWochentageAktiv: boolean
  jaehrlichOrdinal: string
  jaehrlichWochentagTyp: string
  endetTyp: 'nie' | 'datum' | 'anzahl'
  endetDatum: string
  endetNach: number
}

/** Convert Prüfplanung state → pruef_intervall_monate */
export function computeIntervallMonate(state: PruefplanungState): number {
  switch (state.wiederholung) {
    case 'einmalig': return 0
    case 'taeglich': return 1 / 30
    case 'woechentlich': return 0.25
    case 'alle2wochen': return 0.5
    case 'monatlich': return 1
    case 'jaehrlich': return 12
    case 'benutzerdefiniert': {
      const n = state.customAnzahl || 1
      switch (state.customEinheit) {
        case 'tag': return n / 30
        case 'woche': return n * 0.25
        case 'monat': return n
        case 'jahr': return n * 12
        default: return n
      }
    }
    default: return 12
  }
}

// Common German equipment norms
export const NORMEN = [
  { value: 'DIN EN 131', label: 'DIN EN 131', desc: 'Leitern — Anforderungen, Prüfung, Kennzeichnung' },
  { value: 'DGUV V3', label: 'DGUV V3', desc: 'Elektrische Anlagen und Betriebsmittel' },
  { value: 'DIN EN 15635', label: 'DIN EN 15635', desc: 'Ortsfeste Regalsysteme — Anwendung und Wartung' },
  { value: 'BetrSichV', label: 'BetrSichV', desc: 'Betriebssicherheitsverordnung' },
  { value: 'DGUV V68', label: 'DGUV V68', desc: 'Flurförderzeuge (Gabelstapler)' },
  { value: 'DIN 4102', label: 'DIN 4102', desc: 'Brandverhalten von Baustoffen und Bauteilen' },
  { value: 'DIN EN 1004', label: 'DIN EN 1004', desc: 'Fahrbare Arbeitsbühnen' },
  { value: 'DGUV R. 112-198', label: 'DGUV R. 112-198', desc: 'Benutzung von PSA gegen Absturz' },
  { value: 'DIN EN 362', label: 'DIN EN 362', desc: 'PSA gegen Absturz — Verbindungselemente' },
  { value: 'TRBS 1201', label: 'TRBS 1201', desc: 'Prüfung und Kontrolle von Arbeitsmitteln' },
  { value: 'DIN EN 13501', label: 'DIN EN 13501', desc: 'Klassifizierung Brandverhalten Bauprodukte' },
  { value: 'DGUV V52', label: 'DGUV V52', desc: 'Krane' },
]

/** Norm suggestion: maps equipment type → recommended norms + interval */
export const NORM_AI_MAP: Record<string, { norms: string[]; intervallMonate: number; intervallLabel: string }> = Object.fromEntries(
  EQUIPMENT_TYPES.map(t => [t.value, { norms: [t.norm], intervallMonate: t.intervallMonate, intervallLabel: t.intervallLabel }])
)

export interface ChecklisteOption {
  id: string
  name: string
  norm: string | null
  kategorie: string
}

export const DEFAULT_PRUEFPLANUNG: PruefplanungState = {
  startDatum: '',
  wiederholung: 'jaehrlich',
  customAnzahl: 1,
  customEinheit: 'monat',
  wochentage: [],
  monatlichModus: 'jeden',
  monatlichTage: [],
  monatlichOrdinal: '1.',
  monatlichWochentagTyp: 'mo',
  jaehrlichMonate: [],
  jaehrlichWochentageAktiv: false,
  jaehrlichOrdinal: '1.',
  jaehrlichWochentagTyp: 'mo',
  endetTyp: 'nie',
  endetDatum: '',
  endetNach: 10,
}
