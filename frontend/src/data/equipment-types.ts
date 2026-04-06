/**
 * PrüfPilot – Arbeitsmittel-Typen
 *
 * Umfassende Datenbank aller Arbeitsmittel-Kategorien mit:
 * - Beschreibung & Beispielen
 * - Keywords für automatische Typ-Erkennung aus dem Namen
 * - Branchenzuordnung
 * - Empfohlene Norm & Prüfintervall
 */

export interface EquipmentType {
  value: string
  label: string
  /** Kurzbeschreibung der Kategorie */
  desc: string
  /** Beispiele, die in dieser Kategorie fallen */
  examples: string[]
  /** Keywords zur automatischen Erkennung aus Gerätename */
  keywords: string[]
  /** Branchen, in denen dieser Typ häufig vorkommt */
  branchen: string[]
  /** Empfohlene Prüfnorm */
  norm: string
  /** Empfohlenes Prüfintervall in Monaten */
  intervallMonate: number
  intervallLabel: string
  /** Kürzel für visuelle Darstellung (2 Buchstaben) */
  kuerzel: string
}

export const EQUIPMENT_TYPES: EquipmentType[] = [
  {
    value: 'Leiter',
    label: 'Leiter & Tritthilfen',
    desc: 'Tragbare Leitern und Steighilfen nach DIN EN 131 – prüfpflichtig nach DGUV Information 208-016',
    examples: [
      'Anlegeleiter', 'Stehleiter', 'Mehrzweckleiter', 'Schiebeleiter',
      'Bockleiter', 'Stufenhocker', 'Schemel', 'Tritthocker',
      'Podestleiter', 'Rollleiter', 'Teleskopleiter', 'Holmleiter',
      'Glaserleiter', 'Dachleiter', 'Klapptritt', 'Stehtritt',
    ],
    keywords: [
      'leiter', 'stehleiter', 'anlegeleiter', 'schiebeleiter', 'mehrzweckleiter',
      'bockleiter', 'stufenhocker', 'schemel', 'tritthocker', 'tritt', 'klapptritt',
      'podestleiter', 'rollleiter', 'teleskopleiter', 'dachleiter', 'glaserleiter',
      'holmleiter', 'sprossenleiter', 'alu leiter', 'aluminium leiter',
    ],
    branchen: ['Bau', 'Handwerk', 'Lager', 'Reinigung', 'Hausmeister', 'Industrie', 'Handel'],
    norm: 'DIN EN 131',
    intervallMonate: 12,
    intervallLabel: 'Jährlich',
    kuerzel: 'LE',
  },

  {
    value: 'Regal',
    label: 'Regal & Lagersystem',
    desc: 'Ortsfeste Regalsysteme zur Lagerung von Waren und Material',
    examples: [
      'Palettenregal', 'Fachbodenregal', 'Kragarmregal', 'Durchlaufregal',
      'Einfahrregal', 'Schieberegal', 'Schwerlastregale', 'Archivregale',
      'Hochregale', 'Weitspannregal', 'Verschieberegal', 'Stahlregal',
      'Holzregal', 'Gitterregal', 'Fahrbares Regal', 'Mezzaninregal',
    ],
    keywords: [
      'regal', 'regalsystem', 'palettenregal', 'fachbodenregal', 'kragarmregal',
      'durchlaufregal', 'einfahrregal', 'schieberegal', 'schwerlast regal',
      'archivregale', 'hochregal', 'weitspann', 'lagerregal', 'stahlregal',
      'gitterregal', 'regale', 'regalanlage', 'lagerregal',
    ],
    branchen: ['Lager', 'Logistik', 'Handel', 'Produktion', 'Archiv', 'Büro', 'Apotheke'],
    norm: 'DIN EN 15635',
    intervallMonate: 12,
    intervallLabel: 'Jährlich',
    kuerzel: 'RG',
  },

  {
    value: 'Elektrogerät',
    label: 'Elektrisches Betriebsmittel',
    desc: 'Alle ortsveränderlichen und ortsfesten elektrischen Geräte und Anlagen',
    examples: [
      // Werkzeuge
      'Bohrmaschine', 'Schlagbohrmaschine', 'Winkelschleifer', 'Kreissäge',
      'Stichsäge', 'Akkuschrauber', 'Flex', 'Schleifmaschine', 'Schweißgerät',
      // Büro/Küche
      'Kaffeemaschine', 'Wasserkocher', 'Mikrowelle', 'Kühlschrank', 'Geschirrspüler',
      'PC', 'Monitor', 'Drucker', 'Kopierer', 'Beamer', 'Laptop',
      // Kabel/Verteiler
      'Verlängerungskabel', 'Mehrfachsteckdose', 'Verteiler', 'Ladegerät',
      // Heizen/Kühlen
      'Heizlüfter', 'Ventilator', 'Klimagerät', 'Infrarotstrahler',
    ],
    keywords: [
      'bohrmaschine', 'bohren', 'schleifer', 'winkelschleifer', 'flex', 'kreissäge',
      'stichsäge', 'akkuschrauber', 'schrauber', 'schweißgerät', 'schweißen',
      'kaffeemaschine', 'kaffee', 'wasserkocher', 'mikrowelle', 'kühlschrank',
      'geschirrspüler', 'computer', 'pc', 'monitor', 'drucker', 'kopierer',
      'beamer', 'laptop', 'verlängerungskabel', 'steckdose', 'kabel', 'ladegerät',
      'elektro', 'elektrisch', 'maschine elektrisch', 'heizlüfter', 'ventilator',
      'klimagerät', 'klimaanlage', 'strahler', 'infrarot',
    ],
    branchen: ['Alle Branchen', 'Büro', 'Produktion', 'Handwerk', 'Gastronomie', 'Reinigung'],
    norm: 'DGUV V3',
    intervallMonate: 24,
    intervallLabel: 'Alle 2 Jahre (ortsveränderlich)',
    kuerzel: 'EL',
  },

  {
    value: 'Maschine',
    label: 'Maschine & Anlage',
    desc: 'Ortsfeste Arbeitsmaschinen, Produktionsanlagen und technische Einrichtungen',
    examples: [
      // Metallbearbeitung
      'CNC-Maschine', 'Drehmaschine', 'Fräsmaschine', 'Bohrwerk', 'Presse',
      'Stanzmaschine', 'Biegemaschine', 'Bandschleifer', 'Schleifmaschine',
      // Holzbearbeitung
      'Tischkreissäge', 'Formatkreissäge', 'Hobelmaschine', 'Bandsäge', 'Abrichter',
      // Druckluft / Fluid
      'Kompressor', 'Druckluftanlage', 'Pumpe', 'Hydraulikpresse', 'Kompressor',
      // Lebensmittel
      'Brotschneidemaschine', 'Fleischwolf', 'Mixer', 'Rührwerk', 'Knetmaschine',
      'Aufschnittmaschine',
      // Sonstiges
      'Verpackungsmaschine', 'Förderband', 'Hebebühne', 'Aufzug',
    ],
    keywords: [
      'cnc', 'drehmaschine', 'fräsmaschine', 'presse', 'stanzmaschine', 'biegemaschine',
      'bandschleifer', 'kreissäge', 'tischkreissäge', 'hobelmaschine', 'bandsäge',
      'abrichter', 'kompressor', 'pumpe', 'hydraulik', 'brotschneidemaschine',
      'aufschnitt', 'fleischwolf', 'mixer', 'rührwerk', 'knetmaschine',
      'verpackungsmaschine', 'förderband', 'hebebühne', 'aufzug', 'anlage',
      'produktionsmaschine', 'bearbeitungsmaschine', 'aggregat',
    ],
    branchen: ['Produktion', 'Metallverarbeitung', 'Holz', 'Lebensmittel', 'Druck', 'Kunststoff'],
    norm: 'BetrSichV',
    intervallMonate: 12,
    intervallLabel: 'Jährlich',
    kuerzel: 'MA',
  },

  {
    value: 'Fahrzeug',
    label: 'Flurförderzeug & Fahrzeug',
    desc: 'Kraftbetriebene Fahrzeuge zur Güterbeförderung und Personenbeförderung',
    examples: [
      // Flurförderzeuge
      'Gabelstapler', 'Schubmaststapler', 'Hochregalstapler', 'Kommissionierer',
      'Sideloader', 'Ameise (Hubwagen)', 'Elektroameise', 'Schleppzug',
      'Elektrohubwagen', 'Gabelhubwagen', 'Deichselstapler', 'Schlepper',
      // Straßenfahrzeuge
      'LKW', 'Kleintransporter', 'PKW', 'Anhänger', 'Sattelzug',
      // Baumaschinen
      'Radlader', 'Bagger', 'Teleskoplader', 'Dumper',
    ],
    keywords: [
      'gabelstapler', 'stapler', 'schubmaststapler', 'hochregalstapler', 'kommissionierer',
      'sideloader', 'ameise', 'hubwagen', 'elektroameise', 'schleppzug',
      'elektrohubwagen', 'gabelhubwagen', 'deichselstapler', 'schlepper',
      'lkw', 'kleintransporter', 'pkw', 'auto', 'fahrzeug', 'transporter', 'anhänger',
      'sattelzug', 'radlader', 'bagger', 'teleskoplader', 'dumper', 'flurförderzeug',
    ],
    branchen: ['Logistik', 'Lager', 'Produktion', 'Bau', 'Landwirtschaft', 'Handel'],
    norm: 'DGUV V68',
    intervallMonate: 12,
    intervallLabel: 'Jährlich',
    kuerzel: 'FZ',
  },

  {
    value: 'Brandschutz',
    label: 'Brandschutz & Feuerlöscheinrichtung',
    desc: 'Alle Einrichtungen zur Branderkennung, -meldung und -bekämpfung',
    examples: [
      'Feuerlöscher', 'CO₂-Löscher', 'Pulverlöscher', 'Schaumlöscher', 'Wasserlöscher',
      'Wandhydrant', 'Sprinkleranlage', 'Gaslöschanlage',
      'Rauchwarnmelder', 'Brandmeldeanlage', 'Handfeuermelder',
      'Brandschutztür', 'Feuerschutztür', 'Brandschutzklappe',
      'Löschdecke', 'Feuerlöschdecke', 'Notbeleuchtung',
    ],
    keywords: [
      'feuerlöscher', 'lösche', 'co2 löscher', 'pulverlöscher', 'schaumlöscher',
      'wasserlöscher', 'wandhydrant', 'hydrant', 'sprinkler', 'gaslösch',
      'rauchmelder', 'rauchwarnmelder', 'brandmelder', 'feuermelder',
      'brandschutztür', 'feuerschutztür', 'brandschutzklappe', 'löschdecke',
      'notbeleuchtung', 'brandschutz', 'feuer', 'lösch',
    ],
    branchen: ['Alle Branchen', 'Büro', 'Lager', 'Produktion', 'Gastronomie', 'Hotel', 'Öffentlich'],
    norm: 'DIN EN 3',
    intervallMonate: 24,
    intervallLabel: 'Alle 2 Jahre',
    kuerzel: 'BS',
  },

  {
    value: 'Druckbehälter',
    label: 'Druckbehälter & Druckanlage',
    desc: 'Behälter und Anlagen unter Überdruck, überwachungsbedürftige Anlagen',
    examples: [
      'Druckluftbehälter', 'Kompressorbehälter', 'Druckkessel',
      'Gasflaschen', 'Acetylenflaschen', 'Sauerstoffflaschen', 'Propanflaschen',
      'Dampfkessel', 'Warmwasserspeicher', 'Druckluftzylinder',
      'Autoklav', 'Reaktorbehälter',
    ],
    keywords: [
      'druckbehälter', 'druckluft', 'druckkessel', 'flasche', 'gasflasche',
      'acetylenflasche', 'sauerstoffflasche', 'propanflasche', 'druckluftbehälter',
      'kompressorbehälter', 'dampfkessel', 'warmwasserspeicher', 'druckluftzylinder',
      'autoklav', 'behälter', 'tank', 'kessel',
    ],
    branchen: ['Produktion', 'Handwerk', 'Labor', 'Gastronomie', 'Chemie', 'Pharma'],
    norm: 'BetrSichV',
    intervallMonate: 24,
    intervallLabel: 'Alle 2 Jahre (je nach Klasse)',
    kuerzel: 'DB',
  },

  {
    value: 'Hubarbeitsbühne',
    label: 'Hub- & Hebebühne',
    desc: 'Fahrbare und stationäre Arbeitsbühnen, Hebebühnen und Krane',
    examples: [
      'Scherenarbeitsbühne', 'Teleskoparbeitsbühne', 'Gelenkarbeitsbühne',
      'Mastarbeitsbühne', 'Fahrzeugkran', 'Turmdrehkran', 'Brückenkran',
      'Laufkran', 'Monorail', 'Jib-Kran', 'Bodenhebegerät',
      'Fahrzeughebebühne', 'Grubenhebebühne', 'Schwerlastheber',
    ],
    keywords: [
      'arbeitsbühne', 'hebebühne', 'scherenarbeitsbühne', 'teleskoparbeitsbühne',
      'gelenkarbeitsbühne', 'mastarbeitsbühne', 'kran', 'fahrzeugkran', 'turmdrehkran',
      'brückenkran', 'laufkran', 'jib', 'heber', 'fahrzeughebebühne', 'grubenhebebühne',
      'hub', 'hebezeug', 'kettenzug', 'seilzug', 'flaschenzug', 'winde',
    ],
    branchen: ['Bau', 'Produktion', 'Logistik', 'Werkstatt', 'Wartung'],
    norm: 'DGUV V52',
    intervallMonate: 12,
    intervallLabel: 'Jährlich',
    kuerzel: 'HB',
  },

  {
    value: 'PSA',
    label: 'PSA – Persönliche Schutzausrüstung',
    desc: 'Ausrüstung zum persönlichen Schutz vor Verletzungen und Gesundheitsgefahren',
    examples: [
      // Kopf
      'Schutzhelm', 'Industriehelm', 'Bauhelm', 'Anstoßkappe',
      // Augen/Gesicht
      'Schutzbrille', 'Vollsichtbrille', 'Gesichtsschutz', 'Schweißerhelm',
      // Gehör
      'Gehörschutz', 'Ohrstöpsel', 'Kapselgehörschutz',
      // Atemschutz
      'Atemschutzmaske', 'Halbmaske', 'Vollmaske', 'FFP2', 'FFP3',
      // Hände
      'Schutzhandschuhe', 'Schnittschutzhandschuhe', 'Schweißerhandschuhe',
      // Füße
      'Sicherheitsschuhe (S1/S2/S3)', 'Gummistiefel',
      // Absturz
      'Sicherheitsgeschirr', 'Auffanggurt', 'Falldämpfer', 'Verbindungsmittel',
      'Höhensicherungsgerät', 'Steigschutz', 'Sicherheitsleine',
      // Sonstiges
      'Warnweste', 'Schutzanzug', 'Knieschoner',
    ],
    keywords: [
      'schutzhelm', 'helm', 'bauhelm', 'schutzbrille', 'brille', 'gesichtsschutz',
      'schweißerhelm', 'gehörschutz', 'ohrstöpsel', 'kapselgehörschutz',
      'atemschutz', 'atemschutzmaske', 'maske', 'ffp', 'halbmaske', 'vollmaske',
      'schutzhandschuh', 'handschuh', 'schnittschutz', 'sicherheitsschuh', 'schuhe',
      'gummistiefel', 'sicherheitsgeschirr', 'geschirr', 'auffanggurt', 'gurt',
      'falldämpfer', 'höhensicherung', 'steigschutz', 'sicherheitsleine',
      'warnweste', 'weste', 'schutzanzug', 'knieschoner', 'psa',
    ],
    branchen: ['Bau', 'Industrie', 'Produktion', 'Chemie', 'Labor', 'Handwerk', 'Reinigung'],
    norm: 'DGUV R. 112-198',
    intervallMonate: 12,
    intervallLabel: 'Jährlich',
    kuerzel: 'PS',
  },

  {
    value: 'Medizin',
    label: 'Medizin & Labor',
    desc: 'Medizinische Geräte, Laborausrüstung und Erste-Hilfe-Einrichtungen',
    examples: [
      'Defibrillator (AED)', 'Erste-Hilfe-Kasten', 'Notfallkoffer',
      'EKG-Gerät', 'Blutdruckmessgerät', 'Pulsoxymer',
      'Infusionspumpe', 'Beatmungsgerät', 'Sauerstoffgerät',
      'Laborwaage', 'Zentrifuge', 'Autoklav', 'Sterilisator',
      'Pipette', 'Mikroskop', 'Sicherheitswerkbank',
    ],
    keywords: [
      'defibrillator', 'aed', 'erste hilfe', 'notfallkoffer', 'ekg',
      'blutdruck', 'pulsoxymeter', 'infusionspumpe', 'beatmung', 'sauerstoff',
      'laborwaage', 'zentrifuge', 'autoklav', 'sterilisator', 'pipette',
      'mikroskop', 'sicherheitswerkbank', 'laminar flow', 'inkubator',
      'medizin', 'labor', 'klinisch', 'diagnostik',
    ],
    branchen: ['Gesundheit', 'Labor', 'Pflege', 'Arztpraxis', 'Krankenhaus', 'Pharma'],
    norm: 'BetrSichV',
    intervallMonate: 12,
    intervallLabel: 'Jährlich (je nach Gerät)',
    kuerzel: 'MD',
  },

  {
    value: 'Gebäudetechnik',
    label: 'Gebäudetechnik & Haustechnik',
    desc: 'Technische Gebäudeausrüstung für Heizung, Lüftung, Wasser und Strom',
    examples: [
      'Heizkessel', 'Gasheizung', 'Ölheizung', 'Wärmepumpe',
      'Lüftungsanlage', 'RLT-Anlage', 'Klimaanlage', 'Kälteanlage',
      'Notstromaggregat', 'USV', 'Trafo', 'Schaltanlage',
      'Aufzug', 'Personenaufzug', 'Lastenaufzug', 'Fahrstuhl',
      'Rolltor', 'Sektionaltor', 'Schnelllauftor',
      'Sprinkleranlage', 'Entrauchung',
    ],
    keywords: [
      'heizkessel', 'heizung', 'gasheizung', 'ölheizung', 'wärmepumpe', 'kessel',
      'lüftung', 'lüftungsanlage', 'rlt', 'klimaanlage', 'kälteanlage', 'klima',
      'notstrom', 'aggregat', 'usv', 'trafo', 'transformator', 'schaltanlage',
      'aufzug', 'fahrstuhl', 'lift', 'lastenaufzug', 'rolltor', 'tor', 'sektionaltor',
      'schnelllauftor', 'sprinkler', 'entrauchung', 'rauchschutz',
    ],
    branchen: ['Immobilien', 'Facility', 'Hotel', 'Büro', 'Industrie', 'Öffentlich'],
    norm: 'BetrSichV',
    intervallMonate: 12,
    intervallLabel: 'Jährlich',
    kuerzel: 'GT',
  },

  {
    value: 'Gastronomie',
    label: 'Gastronomie & Küche',
    desc: 'Geräte und Einrichtungen für Gastronomie, Catering und Großküchen',
    examples: [
      'Fritteuse', 'Kombidämpfer', 'Konvektomat', 'Backofen', 'Pizzaofen',
      'Grillplatte', 'Salamander', 'Kippbratpfanne', 'Kochkessel',
      'Geschirrspülmaschine', 'Bandspülmaschine', 'Gläserspüler',
      'Kühlzelle', 'Tiefkühlzelle', 'Getränkekühler',
      'Aufschnittmaschine', 'Gemüseschneider', 'Hackmaschine',
      'Gastro-Kaffeemaschine', 'Siebträger',
    ],
    keywords: [
      'fritteuse', 'kombidämpfer', 'konvektomat', 'backofen', 'pizzaofen',
      'grill', 'salamander', 'kippbratpfanne', 'kochkessel', 'spülmaschine',
      'geschirrspüler', 'bandspüler', 'gläserspüler', 'kühlzelle', 'tiefkühlzelle',
      'kühlraum', 'tiefkühlraum', 'aufschnitt', 'gemüseschneider', 'hackmaschine',
      'gastro', 'küche', 'catering',
    ],
    branchen: ['Gastronomie', 'Hotel', 'Catering', 'Kantine', 'Bäckerei'],
    norm: 'BetrSichV',
    intervallMonate: 12,
    intervallLabel: 'Jährlich',
    kuerzel: 'GK',
  },

  {
    value: 'Büro',
    label: 'Bürogerät & IT',
    desc: 'IT-Ausstattung, Kommunikation und Bürogeräte',
    examples: [
      'Desktop-PC', 'Laptop', 'Tablet', 'Monitor', 'Drucker', 'Kopierer',
      'Multifunktionsdrucker', 'Scanner', 'Beamer', 'Großformatdrucker',
      'Server', 'Switch', 'Router', 'USV',
      'Telefon', 'Headset', 'Videokamera', 'Webkamera',
      'Aktenvernichter', 'Laminiergerät', 'Bindegerät',
    ],
    keywords: [
      'desktop', 'pc', 'laptop', 'notebook', 'tablet', 'monitor', 'bildschirm',
      'drucker', 'kopierer', 'multifunktion', 'scanner', 'beamer', 'projektor',
      'server', 'switch', 'router', 'netzwerk', 'usv', 'telefon', 'headset',
      'kamera', 'webcam', 'aktenvernichter', 'shredder', 'laminiergerät', 'binding',
      'büro', 'it ausstattung',
    ],
    branchen: ['Büro', 'Verwaltung', 'IT', 'Medien', 'Alle Branchen'],
    norm: 'DGUV V3',
    intervallMonate: 48,
    intervallLabel: 'Alle 4 Jahre (ortsfest)',
    kuerzel: 'BU',
  },

  {
    value: 'Sonstiges',
    label: 'Sonstiges Arbeitsmittel',
    desc: 'Arbeitsmittel, die keiner anderen Kategorie zuzuordnen sind',
    examples: [
      'Schubkarre', 'Sackkarre', 'Transportwagen', 'Rollbehälter',
      'Werkzeugschrank', 'Spind', 'Safe', 'Schließfach',
      'Außenspiegel', 'Verkehrsspiegel', 'Schranke',
      'Warnleuchte', 'Blitzleuchte',
    ],
    keywords: [
      'schubkarre', 'sackkarre', 'transportwagen', 'rollbehälter',
      'werkzeugschrank', 'spind', 'safe', 'schließfach',
      'spiegel', 'schranke', 'warnleuchte',
    ],
    branchen: ['Alle Branchen'],
    norm: 'BetrSichV',
    intervallMonate: 12,
    intervallLabel: 'Jährlich',
    kuerzel: 'SO',
  },
]

/**
 * Findet den passenden Typ anhand eines eingegebenen Gerätenamens.
 * Gibt den Typ zurück, der am besten passt, oder null wenn kein Match.
 */
export function suggestTypFromName(name: string): EquipmentType | null {
  if (!name || name.trim().length < 2) return null
  const lower = name.toLowerCase()

  let bestMatch: EquipmentType | null = null
  let bestScore = 0

  for (const type of EQUIPMENT_TYPES) {
    let score = 0
    for (const kw of type.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        // Longer keyword = more specific = higher score
        score += kw.length
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestMatch = type
    }
  }

  // Only suggest if we have a meaningful match (score > 3 = at least one real keyword)
  return bestScore > 3 ? bestMatch : null
}

/** Kurzform der TYPEN-Liste für Dropdowns (abwärtskompatibel) */
export const TYPEN_VALUES = EQUIPMENT_TYPES.map(t => t.value)
