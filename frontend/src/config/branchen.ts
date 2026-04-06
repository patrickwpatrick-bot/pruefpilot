/**
 * PrüfPilot — Branchenspezifische Konfiguration
 * Alle branchenabhängigen Vorschläge für Dropdowns werden hier definiert.
 */

export interface BranchenConfig {
  label: string
  berufe: string[]
  unterweisungsKategorien: string[]
  dokumentTypen: { value: string; label: string }[]
  arbeitsmittelTypen: string[]
  checklistenKategorien: string[]
  gefahrstoffe: string[]  // Typische Gefahrstoffe der Branche
}

// All available industries
export const BRANCHEN: Record<string, BranchenConfig> = {
  maschinenbau: {
    label: 'Maschinenbau',
    berufe: [
      'Maschinenbauingenieur', 'CNC-Fräser', 'CNC-Dreher', 'Schlosser', 'Schweißer',
      'Industriemechaniker', 'Werkzeugmechaniker', 'Zerspanungsmechaniker',
      'Konstrukteur', 'Technischer Zeichner', 'Qualitätsprüfer', 'Meister',
      'Produktionshelfer', 'Lagerist', 'Elektriker', 'Instandhalter',
      'Arbeitsvorbereiter', 'Fertigungsplaner', 'Betriebsleiter',
    ],
    unterweisungsKategorien: [
      'Allgemein', 'PSA', 'Brandschutz', 'Maschinen', 'Erste Hilfe',
      'Gefahrstoffe', 'Ergonomie', 'Kran & Hebezeuge', 'Gabelstapler',
      'Schweißen & Schneiden', 'Druckluft', 'Lärm', 'Elektrosicherheit',
    ],
    dokumentTypen: [
      { value: 'staplerschein', label: 'Staplerschein' },
      { value: 'kranschein', label: 'Kranschein' },
      { value: 'schweisserschein', label: 'Schweißerschein' },
      { value: 'ersthelfer', label: 'Ersthelfer' },
      { value: 'elektrofachkraft', label: 'Elektrofachkraft' },
      { value: 'sicherheitsbeauftragter', label: 'Sicherheitsbeauftragter' },
      { value: 'arbeitsmedizin', label: 'Arbeitsmed. Vorsorge' },
      { value: 'sonstiges', label: 'Sonstiges' },
    ],
    arbeitsmittelTypen: [
      'CNC-Maschine', 'Drehmaschine', 'Fräsmaschine', 'Bohrmaschine', 'Säge',
      'Schleifmaschine', 'Presse', 'Schweißgerät', 'Kran', 'Gabelstapler',
      'Hubwagen', 'Kompressor', 'Bandschleifer', 'Leiter', 'Regal',
    ],
    checklistenKategorien: ['maschinen', 'elektro', 'leiter', 'regal', 'brandschutz', 'allgemein', 'kran', 'stapler'],
    gefahrstoffe: ['Kühlschmierstoff', 'Schneidöl', 'Entfetter', 'Schweißrauch', 'Lacke', 'Lösemittel'],
  },

  baugewerbe: {
    label: 'Baugewerbe / Baustelle',
    berufe: [
      'Bauleiter', 'Polier', 'Maurer', 'Betonbauer', 'Zimmerer', 'Dachdecker',
      'Straßenbauer', 'Tiefbauer', 'Fliesenleger', 'Maler & Lackierer',
      'Trockenbauer', 'Gerüstbauer', 'Bauhelfer', 'Baggerführer',
      'Kranführer', 'Vermesser', 'Sicherheitskoordinator',
    ],
    unterweisungsKategorien: [
      'Allgemein', 'PSA', 'Brandschutz', 'Absturzsicherung', 'Erste Hilfe',
      'Gefahrstoffe', 'Baustellensicherheit', 'Erdarbeiten', 'Gerüstbau',
      'Kran & Hebezeuge', 'Asbest', 'Lärm', 'Elektrosicherheit', 'Verkehrssicherung',
    ],
    dokumentTypen: [
      { value: 'staplerschein', label: 'Staplerschein' },
      { value: 'kranschein', label: 'Kranschein' },
      { value: 'baggerschein', label: 'Baggerschein' },
      { value: 'geruestbau', label: 'Gerüstbau-Befähigung' },
      { value: 'ersthelfer', label: 'Ersthelfer' },
      { value: 'asbestschein', label: 'Asbestschein (TRGS 519)' },
      { value: 'sig_koordinator', label: 'SiGe-Koordinator' },
      { value: 'absturzsicherung', label: 'PSAgA-Schulung' },
      { value: 'sonstiges', label: 'Sonstiges' },
    ],
    arbeitsmittelTypen: [
      'Bagger', 'Radlader', 'Kran', 'Gerüst', 'Leiter', 'Betonmischer',
      'Rüttelplatte', 'Flex/Winkelschleifer', 'Bohrhammer', 'Kettensäge',
      'Hubarbeitsbühne', 'Bauaufzug', 'Kompressor',
    ],
    checklistenKategorien: ['baustelle', 'gerüst', 'kran', 'erdarbeiten', 'brandschutz', 'allgemein', 'leiter'],
    gefahrstoffe: ['Zement', 'Betontrennmittel', 'Schalöl', 'Asbest', 'Lacke', 'Grundierung', 'Epoxidharz'],
  },

  logistik: {
    label: 'Logistik / Lager / Spedition',
    berufe: [
      'Lagerleiter', 'Lagerist', 'Kommissionierer', 'Staplerfahrer',
      'LKW-Fahrer', 'Disponent', 'Versandmitarbeiter', 'Verpackungsmitarbeiter',
      'Qualitätskontrolleur', 'Teamleiter', 'Produktionshelfer',
      'Schichtleiter', 'Logistikplaner',
    ],
    unterweisungsKategorien: [
      'Allgemein', 'PSA', 'Brandschutz', 'Gabelstapler', 'Erste Hilfe',
      'Ladungssicherung', 'Ergonomie', 'Gefahrgut', 'Regalprüfung',
      'Hubwagen', 'Verpackung', 'Verkehrswege',
    ],
    dokumentTypen: [
      { value: 'staplerschein', label: 'Staplerschein' },
      { value: 'adr_schein', label: 'ADR-Schein (Gefahrgut)' },
      { value: 'fuehrerschein', label: 'Führerschein Klasse C/CE' },
      { value: 'ersthelfer', label: 'Ersthelfer' },
      { value: 'ladungssicherung', label: 'Ladungssicherung' },
      { value: 'berufskraftfahrer', label: 'BKrFQG-Modul' },
      { value: 'sonstiges', label: 'Sonstiges' },
    ],
    arbeitsmittelTypen: [
      'Gabelstapler', 'Hubwagen', 'Ameise', 'Hochregal', 'Fachbodenregal',
      'Palettenwickler', 'Leiter', 'Rolltor', 'Ladebrücke', 'Verpackungsmaschine',
    ],
    checklistenKategorien: ['stapler', 'regal', 'leiter', 'brandschutz', 'allgemein', 'lkw', 'ladebrücke'],
    gefahrstoffe: ['Reinigungsmittel', 'Batteriesäure (Stapler)', 'Hydrauliköl'],
  },

  gastronomie: {
    label: 'Gastronomie / Hotellerie',
    berufe: [
      'Küchenchef', 'Koch', 'Sous-Chef', 'Servicekraft', 'Barkeeper',
      'Hotelfachmann/-frau', 'Restaurantfachmann/-frau', 'Spüler',
      'Housekeeping', 'Rezeptionist', 'Eventmanager', 'Betriebsleiter',
    ],
    unterweisungsKategorien: [
      'Allgemein', 'Brandschutz', 'Erste Hilfe', 'Lebensmittelhygiene (HACCP)',
      'Infektionsschutz (§ 43 IfSG)', 'PSA', 'Ergonomie', 'Gefahrstoffe',
      'Schneidwerkzeuge', 'Elektrische Geräte', 'Allergenmanagement',
    ],
    dokumentTypen: [
      { value: 'gesundheitszeugnis', label: 'Gesundheitszeugnis (§ 43 IfSG)' },
      { value: 'ersthelfer', label: 'Ersthelfer' },
      { value: 'hygieneschulung', label: 'HACCP-Schulung' },
      { value: 'brandschutzhelfer', label: 'Brandschutzhelfer' },
      { value: 'sonstiges', label: 'Sonstiges' },
    ],
    arbeitsmittelTypen: [
      'Herd/Ofen', 'Fritteuse', 'Aufschnittmaschine', 'Spülmaschine',
      'Kühlhaus', 'Tiefkühltruhe', 'Mikrowelle', 'Leiter', 'Feuerlöscher',
    ],
    checklistenKategorien: ['küche', 'hygiene', 'brandschutz', 'allgemein', 'elektro', 'leiter'],
    gefahrstoffe: ['Reinigungsmittel', 'Entfetter', 'Ofenreiniger', 'Desinfektionsmittel', 'Spülmittel'],
  },

  gesundheitswesen: {
    label: 'Gesundheitswesen / Pflege',
    berufe: [
      'Arzt/Ärztin', 'Krankenpfleger/in', 'Altenpfleger/in', 'Pflegehelfer/in',
      'Medizinische Fachangestellte', 'Physiotherapeut/in', 'Ergotherapeut/in',
      'Labormitarbeiter/in', 'Verwaltungsmitarbeiter/in', 'Hauswirtschaft',
      'Pflegedienstleitung', 'Hygienefachkraft',
    ],
    unterweisungsKategorien: [
      'Allgemein', 'Brandschutz', 'Erste Hilfe', 'Hygiene & Infektionsschutz',
      'PSA', 'Gefahrstoffe', 'Ergonomie', 'Biologische Arbeitsstoffe',
      'Nadelstichverletzungen', 'Strahlenschutz', 'Patientensicherheit',
      'Rückengerechtes Arbeiten', 'Gewaltprävention',
    ],
    dokumentTypen: [
      { value: 'ersthelfer', label: 'Ersthelfer' },
      { value: 'hygieneschulung', label: 'Hygieneschulung' },
      { value: 'strahlenschutz', label: 'Strahlenschutz-Fachkunde' },
      { value: 'brandschutzhelfer', label: 'Brandschutzhelfer' },
      { value: 'impfnachweis', label: 'Impfnachweis (z.B. Hepatitis B)' },
      { value: 'sonstiges', label: 'Sonstiges' },
    ],
    arbeitsmittelTypen: [
      'Patientenlift', 'Rollstuhl', 'Pflegebett', 'Defibrillator (AED)',
      'Leiter', 'Feuerlöscher', 'Autoklav', 'Kühlschrank (Medikamente)',
    ],
    checklistenKategorien: ['hygiene', 'brandschutz', 'allgemein', 'medizingeräte', 'leiter'],
    gefahrstoffe: ['Desinfektionsmittel', 'Formaldehyd', 'Zytostatika', 'Anästhesiegase', 'Reinigungs-Konzentrate'],
  },

  buero: {
    label: 'Büro / Verwaltung / IT',
    berufe: [
      'Geschäftsführer/in', 'Bürokaufmann/-frau', 'Buchhalter/in',
      'Personalreferent/in', 'IT-Administrator', 'Softwareentwickler/in',
      'Projektmanager/in', 'Marketing-Manager/in', 'Empfangsmitarbeiter/in',
      'Sekretariat', 'Sachbearbeiter/in', 'Teamleiter/in',
    ],
    unterweisungsKategorien: [
      'Allgemein', 'Brandschutz', 'Erste Hilfe', 'Ergonomie',
      'Bildschirmarbeit', 'PSA', 'Elektrische Geräte', 'Datenschutz',
      'Psychische Belastung', 'Homeoffice-Sicherheit',
    ],
    dokumentTypen: [
      { value: 'ersthelfer', label: 'Ersthelfer' },
      { value: 'brandschutzhelfer', label: 'Brandschutzhelfer' },
      { value: 'datenschutz', label: 'Datenschutz-Schulung' },
      { value: 'arbeitsmedizin', label: 'Arbeitsmed. Vorsorge (G37)' },
      { value: 'sonstiges', label: 'Sonstiges' },
    ],
    arbeitsmittelTypen: [
      'Monitor', 'Drucker', 'Schredder', 'Leiter', 'Feuerlöscher',
      'Serverraum-Klimaanlage', 'USV-Anlage',
    ],
    checklistenKategorien: ['bildschirm', 'brandschutz', 'allgemein', 'elektro', 'leiter'],
    gefahrstoffe: ['Toner', 'Reinigungsmittel'],
  },

  handwerk_elektro: {
    label: 'Elektrohandwerk',
    berufe: [
      'Elektromeister', 'Elektroniker', 'Elektroinstallateur',
      'Elektrofachkraft', 'Elektrohelfer', 'Lehrling', 'Bauleiter',
      'Servicetechniker', 'Planer', 'Projektleiter',
    ],
    unterweisungsKategorien: [
      'Allgemein', 'PSA', 'Brandschutz', 'Erste Hilfe', 'Elektrosicherheit',
      'Arbeiten unter Spannung', 'Schaltberechtigung', 'Absturzsicherung',
      'Gefahrstoffe', 'Leiternsicherheit',
    ],
    dokumentTypen: [
      { value: 'elektrofachkraft', label: 'Elektrofachkraft-Nachweis' },
      { value: 'schaltberechtigung', label: 'Schaltberechtigung' },
      { value: 'ersthelfer', label: 'Ersthelfer' },
      { value: 'absturzsicherung', label: 'PSAgA-Schulung' },
      { value: 'staplerschein', label: 'Staplerschein' },
      { value: 'sonstiges', label: 'Sonstiges' },
    ],
    arbeitsmittelTypen: [
      'Messgerät', 'Lötstation', 'Kabelverlegemaschine', 'Leiter',
      'Hubarbeitsbühne', 'Bohrmaschine', 'Flex/Winkelschleifer', 'Feuerlöscher',
    ],
    checklistenKategorien: ['elektro', 'leiter', 'brandschutz', 'allgemein', 'hubarbeitsbühne'],
    gefahrstoffe: ['Lötzinn', 'Flussmittel', 'Isolierlack', 'Reiniger'],
  },

  handwerk_sanitaer: {
    label: 'Sanitär / Heizung / Klima (SHK)',
    berufe: [
      'SHK-Meister', 'Anlagenmechaniker SHK', 'Klempner', 'Heizungsbauer',
      'Kältetechniker', 'Lüftungstechniker', 'Monteur', 'Lehrling',
      'Servicetechniker', 'Bauleiter',
    ],
    unterweisungsKategorien: [
      'Allgemein', 'PSA', 'Brandschutz', 'Erste Hilfe', 'Gefahrstoffe',
      'Schweißen & Löten', 'Asbest', 'Absturzsicherung', 'Ergonomie',
      'Trinkwasserhygiene', 'Kältemittel', 'Gasinstallation',
    ],
    dokumentTypen: [
      { value: 'schweisserschein', label: 'Schweißerschein' },
      { value: 'asbestschein', label: 'Asbestschein (TRGS 519)' },
      { value: 'ersthelfer', label: 'Ersthelfer' },
      { value: 'absturzsicherung', label: 'PSAgA-Schulung' },
      { value: 'kaeltemittel', label: 'Kältemittel-Sachkunde' },
      { value: 'sonstiges', label: 'Sonstiges' },
    ],
    arbeitsmittelTypen: [
      'Lötbrenner', 'Schweißgerät', 'Rohrschneider', 'Pressmaschine',
      'Leiter', 'Bohrmaschine', 'Flex/Winkelschleifer', 'Feuerlöscher',
    ],
    checklistenKategorien: ['allgemein', 'leiter', 'brandschutz', 'schweißen', 'elektro'],
    gefahrstoffe: ['Lötwasser', 'Kältemittel', 'Dichtungsmittel', 'Reiniger', 'Asbest'],
  },

  einzelhandel: {
    label: 'Einzelhandel',
    berufe: [
      'Filialleiter/in', 'Verkäufer/in', 'Kassierer/in', 'Lagerist/in',
      'Visual Merchandiser', 'Auszubildende/r', 'Teamleiter/in',
      'Inventur-Mitarbeiter/in',
    ],
    unterweisungsKategorien: [
      'Allgemein', 'Brandschutz', 'Erste Hilfe', 'PSA', 'Ergonomie',
      'Elektrische Geräte', 'Leitern & Tritte', 'Verkehrswege',
      'Kassenarbeitsplatz', 'Ladendiebstahl / Überfall',
    ],
    dokumentTypen: [
      { value: 'ersthelfer', label: 'Ersthelfer' },
      { value: 'brandschutzhelfer', label: 'Brandschutzhelfer' },
      { value: 'staplerschein', label: 'Staplerschein (Lager)' },
      { value: 'sonstiges', label: 'Sonstiges' },
    ],
    arbeitsmittelTypen: [
      'Leiter', 'Rollleiter', 'Hubwagen', 'Kasse', 'Preisauszeichner',
      'Regalsystem', 'Feuerlöscher',
    ],
    checklistenKategorien: ['allgemein', 'leiter', 'brandschutz', 'regal', 'elektro'],
    gefahrstoffe: ['Reinigungsmittel', 'Glasreiniger'],
  },

  chemie: {
    label: 'Chemie / Pharma',
    berufe: [
      'Chemiker/in', 'Chemikant/in', 'Laborant/in', 'Pharmakant/in',
      'Produktionsleiter/in', 'Qualitätsmanager/in', 'Instandhalter',
      'Verfahrenstechniker/in', 'Betriebsmeister', 'Lagerist (Gefahrgut)',
    ],
    unterweisungsKategorien: [
      'Allgemein', 'PSA', 'Brandschutz', 'Erste Hilfe', 'Gefahrstoffe',
      'Explosionsschutz (ATEX)', 'Biologische Arbeitsstoffe', 'Ergonomie',
      'GMP/GDP', 'Reinraum', 'Notfallmaßnahmen', 'Strahlenschutz',
    ],
    dokumentTypen: [
      { value: 'ersthelfer', label: 'Ersthelfer' },
      { value: 'gefahrgut', label: 'Gefahrgut-Beauftragter' },
      { value: 'strahlenschutz', label: 'Strahlenschutz-Fachkunde' },
      { value: 'gmp_schulung', label: 'GMP-Schulung' },
      { value: 'brandschutzhelfer', label: 'Brandschutzhelfer' },
      { value: 'sonstiges', label: 'Sonstiges' },
    ],
    arbeitsmittelTypen: [
      'Reaktor', 'Destillationsanlage', 'Abzug', 'Waage', 'pH-Meter',
      'Autoklav', 'Zentrifuge', 'Leiter', 'Feuerlöscher',
    ],
    checklistenKategorien: ['labor', 'allgemein', 'brandschutz', 'leiter', 'elektro', 'gefahrstoff'],
    gefahrstoffe: ['Säuren', 'Laugen', 'Lösemittel', 'Gase', 'CMR-Stoffe', 'Stäube'],
  },

  metallverarbeitung: {
    label: 'Metallverarbeitung / Stahl',
    berufe: [
      'Metallbauer', 'Schweißer', 'Schlosser', 'Dreher', 'Fräser',
      'Konstruktionsschlosser', 'Industriemechaniker', 'Lackierer',
      'Werkstattleiter', 'Meister', 'Produktionshelfer', 'Lagerist',
    ],
    unterweisungsKategorien: [
      'Allgemein', 'PSA', 'Brandschutz', 'Maschinen', 'Erste Hilfe',
      'Gefahrstoffe', 'Schweißen & Schneiden', 'Kran & Hebezeuge',
      'Gabelstapler', 'Lärm', 'Ergonomie', 'Elektrosicherheit',
    ],
    dokumentTypen: [
      { value: 'schweisserschein', label: 'Schweißerschein' },
      { value: 'staplerschein', label: 'Staplerschein' },
      { value: 'kranschein', label: 'Kranschein' },
      { value: 'ersthelfer', label: 'Ersthelfer' },
      { value: 'sonstiges', label: 'Sonstiges' },
    ],
    arbeitsmittelTypen: [
      'Schweißgerät', 'Plasmaschneider', 'Drehmaschine', 'Fräsmaschine',
      'Bandsäge', 'Schleifmaschine', 'Presse', 'Abkantpresse', 'Kran',
      'Gabelstapler', 'Leiter', 'Regal',
    ],
    checklistenKategorien: ['maschinen', 'kran', 'stapler', 'schweißen', 'brandschutz', 'allgemein', 'regal'],
    gefahrstoffe: ['Schweißrauch', 'Kühlschmierstoff', 'Lacke', 'Verdünner', 'Entfetter'],
  },

  holzverarbeitung: {
    label: 'Holzverarbeitung / Tischlerei',
    berufe: [
      'Tischlermeister', 'Tischler/Schreiner', 'Holzmechaniker',
      'Zimmerer', 'Maschinenführer', 'Lehrling', 'Lagerist',
      'Monteur', 'Oberflächenbehandler',
    ],
    unterweisungsKategorien: [
      'Allgemein', 'PSA', 'Brandschutz', 'Maschinen', 'Erste Hilfe',
      'Gefahrstoffe', 'Holzstaub', 'Ergonomie', 'Absaugung',
      'Lärm', 'Elektrosicherheit',
    ],
    dokumentTypen: [
      { value: 'ersthelfer', label: 'Ersthelfer' },
      { value: 'staplerschein', label: 'Staplerschein' },
      { value: 'brandschutzhelfer', label: 'Brandschutzhelfer' },
      { value: 'sonstiges', label: 'Sonstiges' },
    ],
    arbeitsmittelTypen: [
      'Kreissäge', 'Bandsäge', 'Hobelmaschine', 'Fräsmaschine',
      'Schleifmaschine', 'CNC-Bearbeitungszentrum', 'Absauganlage',
      'Furnierpresse', 'Leiter', 'Gabelstapler',
    ],
    checklistenKategorien: ['maschinen', 'brandschutz', 'allgemein', 'absaugung', 'leiter'],
    gefahrstoffe: ['Holzstaub', 'Lacke', 'Beizen', 'Klebstoffe', 'Lösemittel', 'Holzschutzmittel'],
  },

  lebensmittel: {
    label: 'Lebensmittelindustrie',
    berufe: [
      'Betriebsleiter/in', 'Lebensmitteltechniker/in', 'Fachkraft für Lebensmitteltechnik',
      'Metzger/Fleischer', 'Bäcker', 'Konditor', 'Maschinenführer',
      'Qualitätsprüfer/in', 'Lagerist', 'Reinigungskraft',
    ],
    unterweisungsKategorien: [
      'Allgemein', 'PSA', 'Brandschutz', 'Erste Hilfe', 'Lebensmittelhygiene (HACCP)',
      'Infektionsschutz (§ 43 IfSG)', 'Gefahrstoffe', 'Maschinen',
      'Ergonomie', 'Kälte/Tiefkühlung', 'Allergene',
    ],
    dokumentTypen: [
      { value: 'gesundheitszeugnis', label: 'Gesundheitszeugnis (§ 43 IfSG)' },
      { value: 'hygieneschulung', label: 'HACCP-Schulung' },
      { value: 'ersthelfer', label: 'Ersthelfer' },
      { value: 'staplerschein', label: 'Staplerschein' },
      { value: 'sonstiges', label: 'Sonstiges' },
    ],
    arbeitsmittelTypen: [
      'Fleischwolf', 'Aufschnittmaschine', 'Knetmaschine', 'Ofen',
      'Kühlhaus', 'Förderbänder', 'Verpackungsmaschine', 'Gabelstapler',
      'Reinigungsgerät', 'Leiter',
    ],
    checklistenKategorien: ['hygiene', 'maschinen', 'brandschutz', 'allgemein', 'kühlung'],
    gefahrstoffe: ['Reinigungsmittel', 'Desinfektionsmittel', 'Kältemittel', 'Schmierfette (Food-Grade)'],
  },

  landwirtschaft: {
    label: 'Landwirtschaft',
    berufe: [
      'Betriebsleiter/in', 'Landwirt/in', 'Tierpfleger/in',
      'Maschinenführer', 'Erntehelfer/in', 'Agraringenieur/in',
      'Lagerist', 'Gärtner/in',
    ],
    unterweisungsKategorien: [
      'Allgemein', 'PSA', 'Brandschutz', 'Erste Hilfe', 'Maschinen',
      'Gefahrstoffe (Pflanzenschutz)', 'Ergonomie', 'Tierhaltung',
      'Absturzsicherung', 'Siloeinsteig',
    ],
    dokumentTypen: [
      { value: 'fuehrerschein', label: 'Führerschein Klasse T/L' },
      { value: 'pflanzenschutz', label: 'Pflanzenschutz-Sachkunde' },
      { value: 'ersthelfer', label: 'Ersthelfer' },
      { value: 'staplerschein', label: 'Staplerschein' },
      { value: 'sonstiges', label: 'Sonstiges' },
    ],
    arbeitsmittelTypen: [
      'Traktor', 'Mähdrescher', 'Pflug', 'Sämaschine', 'Feldspritze',
      'Futterverteilwagen', 'Melkanlage', 'Gabelstapler', 'Leiter',
    ],
    checklistenKategorien: ['maschinen', 'brandschutz', 'allgemein', 'leiter', 'pflanzenschutz'],
    gefahrstoffe: ['Pflanzenschutzmittel', 'Dünger', 'Diesel', 'Hydrauliköl', 'Silogase'],
  },

  reinigung: {
    label: 'Reinigung / Gebäudeservice',
    berufe: [
      'Objektleiter/in', 'Reinigungskraft', 'Glasreiniger/in',
      'Gebäudereiniger/in', 'Vorarbeiter/in', 'Hausmeister/in',
      'Schädlingsbekämpfer/in',
    ],
    unterweisungsKategorien: [
      'Allgemein', 'PSA', 'Brandschutz', 'Erste Hilfe', 'Gefahrstoffe',
      'Ergonomie', 'Absturzsicherung', 'Leitern & Tritte',
      'Infektionsschutz', 'Elektrische Geräte',
    ],
    dokumentTypen: [
      { value: 'ersthelfer', label: 'Ersthelfer' },
      { value: 'absturzsicherung', label: 'PSAgA-Schulung' },
      { value: 'brandschutzhelfer', label: 'Brandschutzhelfer' },
      { value: 'sonstiges', label: 'Sonstiges' },
    ],
    arbeitsmittelTypen: [
      'Scheuersaugmaschine', 'Hochdruckreiniger', 'Leiter',
      'Hubarbeitsbühne', 'Staubsauger (Industrie)', 'Feuerlöscher',
    ],
    checklistenKategorien: ['allgemein', 'leiter', 'brandschutz', 'elektro'],
    gefahrstoffe: ['Reinigungsmittel', 'Desinfektionsmittel', 'Glasreiniger', 'Sanitärreiniger', 'Entkalker'],
  },

  transport: {
    label: 'Transport / Spedition / Personenbeförderung',
    berufe: [
      'Disponent/in', 'LKW-Fahrer/in', 'Busfahrer/in', 'Kurierfahrer/in',
      'Lagerist/in', 'Fuhrparkleiter/in', 'Werkstattmeister/in',
      'Kraftfahrzeugmechaniker/in',
    ],
    unterweisungsKategorien: [
      'Allgemein', 'PSA', 'Brandschutz', 'Erste Hilfe', 'Ladungssicherung',
      'Gefahrgut (ADR)', 'Fahrsicherheit', 'Ergonomie',
      'Arbeitszeit (Lenk- und Ruhezeiten)', 'Verkehrssicherheit',
    ],
    dokumentTypen: [
      { value: 'fuehrerschein', label: 'Führerschein Klasse C/CE/D' },
      { value: 'adr_schein', label: 'ADR-Schein (Gefahrgut)' },
      { value: 'berufskraftfahrer', label: 'BKrFQG-Modul' },
      { value: 'ersthelfer', label: 'Ersthelfer' },
      { value: 'ladungssicherung', label: 'Ladungssicherung' },
      { value: 'staplerschein', label: 'Staplerschein' },
      { value: 'sonstiges', label: 'Sonstiges' },
    ],
    arbeitsmittelTypen: [
      'LKW', 'Transporter', 'Anhänger', 'Gabelstapler', 'Hubwagen',
      'Leiter', 'Laderampe', 'Feuerlöscher',
    ],
    checklistenKategorien: ['lkw', 'stapler', 'allgemein', 'brandschutz', 'leiter', 'ladebrücke'],
    gefahrstoffe: ['Diesel', 'AdBlue', 'Bremsflüssigkeit', 'Batteriesäure'],
  },
}

// Common categories available for ALL industries (always shown)
export const COMMON_KATEGORIEN = ['Allgemein', 'PSA', 'Brandschutz', 'Erste Hilfe', 'Ergonomie', 'Gefahrstoffe']

// All possible interval options
export const INTERVALL_OPTIONS = [
  { value: 0, label: 'Täglich' },
  { value: 0.25, label: 'Wöchentlich' },  // stored as ~0, handled specially
  { value: 1, label: 'Monatlich' },
  { value: 3, label: 'Vierteljährlich' },
  { value: 6, label: 'Halbjährlich' },
  { value: 12, label: 'Jährlich' },
  { value: 24, label: 'Alle 2 Jahre' },
  { value: 36, label: 'Alle 3 Jahre' },
  { value: 60, label: 'Alle 5 Jahre' },
]

// Helper: get config for a branche, with fallback to all combined
export function getBranchenConfig(branche: string | null | undefined): BranchenConfig {
  if (branche && BRANCHEN[branche]) {
    return BRANCHEN[branche]
  }
  // Fallback: merge all (used if no branche selected)
  return {
    label: 'Alle Branchen',
    berufe: [...new Set(Object.values(BRANCHEN).flatMap(b => b.berufe))].sort(),
    unterweisungsKategorien: [...new Set(Object.values(BRANCHEN).flatMap(b => b.unterweisungsKategorien))].sort(),
    dokumentTypen: Object.values(BRANCHEN)
      .flatMap(b => b.dokumentTypen)
      .filter((v, i, a) => a.findIndex(t => t.value === v.value) === i),
    arbeitsmittelTypen: [...new Set(Object.values(BRANCHEN).flatMap(b => b.arbeitsmittelTypen))].sort(),
    checklistenKategorien: [...new Set(Object.values(BRANCHEN).flatMap(b => b.checklistenKategorien))].sort(),
    gefahrstoffe: [...new Set(Object.values(BRANCHEN).flatMap(b => b.gefahrstoffe))].sort(),
  }
}

// Get the list of Branchen for a dropdown
export function getBranchenList(): { value: string; label: string }[] {
  return Object.entries(BRANCHEN).map(([key, config]) => ({
    value: key,
    label: config.label,
  })).sort((a, b) => a.label.localeCompare(b.label))
}

// ─── Synonym / Tag Database for smart autocomplete ──────────────────────────
// Maps keywords (lowercase) → array of branche IDs they relate to.
// When a user types "CNC", we find all matching keywords and return matching branchen.
export const BRANCHEN_SYNONYME: Record<string, string[]> = {
  // Maschinenbau
  'maschinenbau': ['maschinenbau'],
  'maschinen': ['maschinenbau', 'metallverarbeitung'],
  'cnc': ['maschinenbau', 'metallverarbeitung', 'holzverarbeitung'],
  'cnc-fertigung': ['maschinenbau', 'metallverarbeitung'],
  'cnc-fräsen': ['maschinenbau', 'metallverarbeitung'],
  'cnc-drehen': ['maschinenbau', 'metallverarbeitung'],
  'zerspanung': ['maschinenbau', 'metallverarbeitung'],
  'zerspanungstechnik': ['maschinenbau', 'metallverarbeitung'],
  'fräsen': ['maschinenbau', 'metallverarbeitung', 'holzverarbeitung'],
  'drehen': ['maschinenbau', 'metallverarbeitung'],
  'industriemechanik': ['maschinenbau'],
  'werkzeugbau': ['maschinenbau', 'metallverarbeitung'],
  'anlagenbau': ['maschinenbau'],
  'automatisierung': ['maschinenbau'],
  'sondermaschinenbau': ['maschinenbau'],
  'fertigung': ['maschinenbau', 'metallverarbeitung'],
  'produktion': ['maschinenbau', 'metallverarbeitung', 'lebensmittel', 'chemie'],
  'automotive': ['maschinenbau', 'metallverarbeitung'],
  'fahrzeugbau': ['maschinenbau', 'metallverarbeitung'],
  'zulieferer': ['maschinenbau', 'metallverarbeitung'],

  // Metallverarbeitung
  'metallverarbeitung': ['metallverarbeitung'],
  'metall': ['metallverarbeitung', 'maschinenbau'],
  'stahl': ['metallverarbeitung'],
  'stahlbau': ['metallverarbeitung', 'baugewerbe'],
  'schweißen': ['metallverarbeitung', 'maschinenbau', 'handwerk_sanitaer'],
  'schweißtechnik': ['metallverarbeitung'],
  'schlosserei': ['metallverarbeitung'],
  'blechverarbeitung': ['metallverarbeitung'],
  'oberflächentechnik': ['metallverarbeitung'],
  'galvanik': ['metallverarbeitung'],
  'härtetechnik': ['metallverarbeitung'],
  'gießerei': ['metallverarbeitung'],
  'schmiedetechnik': ['metallverarbeitung'],
  'stanzen': ['metallverarbeitung'],
  'laserschneiden': ['metallverarbeitung'],

  // Baugewerbe
  'baugewerbe': ['baugewerbe'],
  'bau': ['baugewerbe'],
  'baustelle': ['baugewerbe'],
  'hochbau': ['baugewerbe'],
  'tiefbau': ['baugewerbe'],
  'straßenbau': ['baugewerbe'],
  'betonbau': ['baugewerbe'],
  'rohbau': ['baugewerbe'],
  'ausbau': ['baugewerbe'],
  'trockenbau': ['baugewerbe'],
  'gerüstbau': ['baugewerbe'],
  'dachdecker': ['baugewerbe'],
  'zimmerer': ['baugewerbe', 'holzverarbeitung'],
  'maurer': ['baugewerbe'],
  'bauunternehmen': ['baugewerbe'],
  'abbruch': ['baugewerbe'],
  'erdbau': ['baugewerbe'],

  // Logistik
  'logistik': ['logistik'],
  'lager': ['logistik'],
  'spedition': ['logistik', 'transport'],
  'versand': ['logistik'],
  'kommissionierung': ['logistik'],
  'warehousing': ['logistik'],
  'fulfillment': ['logistik'],
  'distribution': ['logistik'],
  'paketdienst': ['logistik', 'transport'],

  // Transport
  'transport': ['transport'],
  'personenbeförderung': ['transport'],
  'lkw': ['transport'],
  'busunternehmen': ['transport'],
  'kurier': ['transport', 'logistik'],
  'fuhrpark': ['transport'],
  'gefahrgut': ['transport', 'chemie'],
  'taxi': ['transport'],
  'lieferdienst': ['transport', 'logistik'],

  // Gastronomie
  'gastronomie': ['gastronomie'],
  'restaurant': ['gastronomie'],
  'küche': ['gastronomie', 'lebensmittel'],
  'hotel': ['gastronomie'],
  'hotellerie': ['gastronomie'],
  'catering': ['gastronomie', 'lebensmittel'],
  'bäckerei': ['gastronomie', 'lebensmittel'],
  'metzgerei': ['lebensmittel'],
  'konditorei': ['gastronomie', 'lebensmittel'],
  'kantine': ['gastronomie'],
  'imbiss': ['gastronomie'],
  'bar': ['gastronomie'],
  'café': ['gastronomie'],
  'gemeinschaftsverpflegung': ['gastronomie', 'lebensmittel'],

  // Gesundheitswesen
  'gesundheitswesen': ['gesundheitswesen'],
  'pflege': ['gesundheitswesen'],
  'krankenhaus': ['gesundheitswesen'],
  'klinik': ['gesundheitswesen'],
  'arztpraxis': ['gesundheitswesen'],
  'zahnarzt': ['gesundheitswesen'],
  'altenpflege': ['gesundheitswesen'],
  'ambulant': ['gesundheitswesen'],
  'physiotherapie': ['gesundheitswesen'],
  'labor': ['gesundheitswesen', 'chemie'],
  'apotheke': ['gesundheitswesen', 'chemie'],
  'rehabilitation': ['gesundheitswesen'],
  'pflegeheim': ['gesundheitswesen'],
  'rettungsdienst': ['gesundheitswesen'],
  'medizintechnik': ['gesundheitswesen'],

  // Büro / IT
  'büro': ['buero'],
  'verwaltung': ['buero'],
  'it': ['buero'],
  'software': ['buero'],
  'beratung': ['buero'],
  'agentur': ['buero'],
  'consulting': ['buero'],
  'marketing': ['buero'],
  'finanzdienstleistung': ['buero'],
  'versicherung': ['buero'],
  'steuerberatung': ['buero'],
  'rechtsanwalt': ['buero'],
  'immobilien': ['buero'],
  'callcenter': ['buero'],
  'coworking': ['buero'],

  // Elektrohandwerk
  'elektrohandwerk': ['handwerk_elektro'],
  'elektriker': ['handwerk_elektro'],
  'elektroinstallation': ['handwerk_elektro'],
  'elektrotechnik': ['handwerk_elektro'],
  'elektro': ['handwerk_elektro'],
  'photovoltaik': ['handwerk_elektro'],
  'solar': ['handwerk_elektro'],
  'blitzschutz': ['handwerk_elektro'],
  'smart home': ['handwerk_elektro'],
  'schaltanlagenbau': ['handwerk_elektro'],

  // SHK
  'sanitär': ['handwerk_sanitaer'],
  'heizung': ['handwerk_sanitaer'],
  'klima': ['handwerk_sanitaer'],
  'shk': ['handwerk_sanitaer'],
  'haustechnik': ['handwerk_sanitaer'],
  'lüftung': ['handwerk_sanitaer'],
  'kältetechnik': ['handwerk_sanitaer'],
  'rohrleitungsbau': ['handwerk_sanitaer'],
  'wärmepumpe': ['handwerk_sanitaer'],
  'gasinstallation': ['handwerk_sanitaer'],
  'trinkwasser': ['handwerk_sanitaer'],

  // Einzelhandel
  'einzelhandel': ['einzelhandel'],
  'handel': ['einzelhandel'],
  'supermarkt': ['einzelhandel'],
  'drogerie': ['einzelhandel'],
  'baumarkt': ['einzelhandel'],
  'textilhandel': ['einzelhandel'],
  'möbelhaus': ['einzelhandel'],
  'fachhandel': ['einzelhandel'],
  'filiale': ['einzelhandel'],
  'discounter': ['einzelhandel'],

  // Chemie / Pharma
  'chemie': ['chemie'],
  'pharma': ['chemie'],
  'pharmaindustrie': ['chemie'],
  'chemische industrie': ['chemie'],
  'kunststoff': ['chemie'],
  'lack': ['chemie'],
  'farbe': ['chemie'],
  'klebstoff': ['chemie'],
  'biotechnologie': ['chemie'],
  'kosmetik': ['chemie'],
  'waschmittel': ['chemie'],

  // Holzverarbeitung
  'holzverarbeitung': ['holzverarbeitung'],
  'tischlerei': ['holzverarbeitung'],
  'schreinerei': ['holzverarbeitung'],
  'holz': ['holzverarbeitung'],
  'möbelbau': ['holzverarbeitung'],
  'sägewerk': ['holzverarbeitung'],
  'parkettleger': ['holzverarbeitung'],
  'holzbau': ['holzverarbeitung', 'baugewerbe'],
  'möbelproduktion': ['holzverarbeitung'],
  'innenausbau': ['holzverarbeitung', 'baugewerbe'],

  // Lebensmittelindustrie
  'lebensmittel': ['lebensmittel'],
  'lebensmittelindustrie': ['lebensmittel'],
  'lebensmittelproduktion': ['lebensmittel'],
  'fleischverarbeitung': ['lebensmittel'],
  'molkerei': ['lebensmittel'],
  'brauerei': ['lebensmittel'],
  'getränke': ['lebensmittel'],
  'tiefkühl': ['lebensmittel'],
  'konserven': ['lebensmittel'],
  'haccp': ['lebensmittel', 'gastronomie'],

  // Landwirtschaft
  'landwirtschaft': ['landwirtschaft'],
  'agrar': ['landwirtschaft'],
  'gartenbau': ['landwirtschaft'],
  'gärtnerei': ['landwirtschaft'],
  'forstwirtschaft': ['landwirtschaft'],
  'tierhaltung': ['landwirtschaft'],
  'weinbau': ['landwirtschaft'],
  'obstbau': ['landwirtschaft'],
  'lohnunternehmer': ['landwirtschaft'],
  'biogasanlage': ['landwirtschaft'],

  // Reinigung
  'reinigung': ['reinigung'],
  'gebäudereinigung': ['reinigung'],
  'glasreinigung': ['reinigung'],
  'industriereinigung': ['reinigung'],
  'facilitymanagement': ['reinigung'],
  'facility management': ['reinigung'],
  'hausmeisterservice': ['reinigung'],
  'winterdienst': ['reinigung'],
  'gebäudeservice': ['reinigung'],
  'schädlingsbekämpfung': ['reinigung'],
}

// Search branchen by keyword — returns matching {value, label, matchedKeyword} sorted by relevance
export interface BranchenSearchResult {
  value: string       // branche key (e.g. 'maschinenbau')
  label: string       // display label (e.g. 'Maschinenbau')
  matchedKeyword: string  // what the user typed that matched
  score: number       // lower = better match
}

export function searchBranchen(query: string): BranchenSearchResult[] {
  const q = query.toLowerCase().trim()
  if (!q) return []

  const resultMap = new Map<string, BranchenSearchResult>()

  // 1. Search in Branche labels (direct match)
  for (const [key, config] of Object.entries(BRANCHEN)) {
    const label = config.label.toLowerCase()
    if (label.includes(q)) {
      const score = label.startsWith(q) ? 0 : label.indexOf(q)
      if (!resultMap.has(key) || resultMap.get(key)!.score > score) {
        resultMap.set(key, { value: key, label: config.label, matchedKeyword: config.label, score })
      }
    }
  }

  // 2. Search in synonyms
  for (const [keyword, brancheIds] of Object.entries(BRANCHEN_SYNONYME)) {
    if (keyword.includes(q)) {
      const score = keyword.startsWith(q) ? 1 : keyword.indexOf(q) + 2
      for (const id of brancheIds) {
        const config = BRANCHEN[id]
        if (!config) continue
        if (!resultMap.has(id) || resultMap.get(id)!.score > score) {
          const matchLabel = keyword.charAt(0).toUpperCase() + keyword.slice(1)
          resultMap.set(id, { value: id, label: config.label, matchedKeyword: matchLabel, score })
        }
      }
    }
  }

  return Array.from(resultMap.values()).sort((a, b) => a.score - b.score)
}
