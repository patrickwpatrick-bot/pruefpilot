/**
 * Datenschutz — DSGVO-konforme Datenschutzerklärung
 */
export function DatenschutzPage() {
  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-black mb-6">Datenschutzerklärung</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-6 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-black mb-3">1. Verantwortlicher</h2>
          <p>
            <strong>PrüfPilot</strong><br />
            [Ihr Name / Firma]<br />
            [Straße, PLZ Ort]<br />
            Deutschland<br />
            <br />
            <strong>E-Mail:</strong> datenschutz@pruefpilot.de<br />
            <strong>Telefon:</strong> [Ihre Telefonnummer]
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-black mb-3">2. Rechtsgrundlagen der Verarbeitung</h2>
          <p>
            Die Verarbeitung Ihrer personenbezogenen Daten bei PrüfPilot erfolgt auf folgenden Rechtsgrundlagen:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li><strong>Art. 6 Abs. 1 lit. b DSGVO</strong> – Erfüllung eines Vertrags: Verarbeitung ist notwendig zur Bereitstellung unseres Dienstes und Erfüllung unserer Vertragsverpflichtungen gegenüber Ihnen</li>
            <li><strong>Art. 6 Abs. 1 lit. f DSGVO</strong> – Berechtigtes Interesse: Verarbeitung zur Sicherheit unserer IT-Systeme, Fraud-Prävention und Verbesserung unseres Dienstes</li>
            <li><strong>Art. 6 Abs. 1 lit. a DSGVO</strong> – Einwilligung: Für Verarbeitungen, bei denen Sie explizit zugestimmt haben (z. B. Marketing-E-Mails)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-black mb-3">3. Daten bei Registrierung und Nutzung</h2>
          <p className="mb-3">
            Bei der Registrierung und während der Nutzung von PrüfPilot erheben und verarbeiten wir folgende Daten:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Registrierungsdaten: E-Mail-Adresse, Vorname, Nachname, Firmenname, Branche</li>
            <li>Kontaktdaten: Telefonnummer, Adresse (optional)</li>
            <li>Nutzungsdaten: Prüfungen, Arbeitsmittel, Checklisten, hochgeladene Fotos und Dokumente</li>
            <li>Technische Daten: IP-Adresse, Browser-Typ, Betriebssystem, Zugriffszeitstempel</li>
            <li>Zahlungsdaten: Rechnungsadresse, Zahlungsmethode (verarbeitet durch Stripe Payment Services)</li>
          </ul>
          <p className="mt-3">
            Diese Daten sind notwendig, um den PrüfPilot-Dienst bereitzustellen. Ohne diese Angaben ist eine Registrierung und Nutzung nicht möglich.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-black mb-3">4. Cookies und Tracking</h2>
          <p className="mb-3">
            PrüfPilot verwendet Cookies nur zur Verwaltung von Authentifizierung und Session-Verwaltung:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li><strong>Session-Cookies:</strong> Notwendig für die Anmeldung und Navigation (Art. 6 Abs. 1 lit. b DSGVO)</li>
            <li><strong>Authentifizierungs-Token:</strong> Speichert Ihre Login-Sitzung sicher verschlüsselt</li>
          </ul>
          <p className="mt-3">
            Wir verwenden kein Tracking, keine Analytics-Cookies und keine Werbungs-Cookies. Ihre Privatsphäre ist uns wichtig.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-black mb-3">5. Drittanbieter und Datenverarbeitung</h2>
          <p className="mb-3">
            PrüfPilot arbeitet mit folgenden vertrauenswürdigen Datenverarbeitern zusammen:
          </p>
          <div className="space-y-4 ml-2">
            <div>
              <strong>Hetzner Cloud (Hosting)</strong><br />
              <span className="text-gray-600">Standort: Falkenstein, Deutschland. Alle Daten werden auf Servern in der EU gespeichert und verarbeitet. Hetzner ist Auftragsverarbeiter nach Art. 28 DSGVO.</span>
            </div>
            <div>
              <strong>Postmark (E-Mail-Versand)</strong><br />
              <span className="text-gray-600">Wir versenden Registrierungs-, Benachrichtigungs- und PDF-Prüfprotokolle über Postmark. Postmark ist zertifiziert und einhält DSGVO-Standards.</span>
            </div>
            <div>
              <strong>Stripe (Zahlungsverarbeitung)</strong><br />
              <span className="text-gray-600">Zahlungen werden durch Stripe Payment Services verarbeitet. Stripe erhält Ihre Zahlungsdaten, nicht PrüfPilot. Stripe einhält PCI-DSS und DSGVO-Standards.</span>
            </div>
            <div>
              <strong>Sentry (Error Monitoring)</strong><br />
              <span className="text-gray-600">Wir nutzen Sentry zur Überwachung von Systemfehlern und zur Verbesserung der Zuverlässigkeit. Sentry kann technische Fehlerinformationen empfangen (ohne personenbezogene Daten).</span>
            </div>
          </div>
          <p className="mt-3">
            Alle Datenverarbeiter haben mit uns Auftragsverarbeitungsverträge (AV-Verträge) gemäß Art. 28 DSGVO abgeschlossen und gewährleisten angemessene Sicherheitsmaßnahmen.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-black mb-3">6. Speicherdauer und Löschung</h2>
          <p className="mb-3">
            Wir speichern Ihre Daten nur so lange wie notwendig:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li><strong>Aktive Nutzer:</strong> Während der Vertragsbeziehung und darüber hinaus für Compliance-Anforderungen (z. B. 10 Jahre für Prüfprotokolle nach Arbeitsschutzgesetzen)</li>
            <li><strong>Inaktive oder gelöschte Konten:</strong> Personaldaten werden innerhalb von 90 Tagen gelöscht. Prüfprotokolle können auf Anfrage länger aufbewahrt werden</li>
            <li><strong>Zahlungsdaten:</strong> Werden nach 12 Monaten gemäß deutschem Steuerrecht gelöscht</li>
            <li><strong>Backups:</strong> Können länger aufbewahrt werden für Notfall-Recovery</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-black mb-3">7. Ihre Rechte nach DSGVO</h2>
          <p className="mb-3">
            Sie haben folgende Rechte bezüglich Ihrer personenbezogenen Daten:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li><strong>Art. 15 DSGVO – Auskunftspflicht:</strong> Sie können jederzeit Auskunft über die Verarbeitung Ihrer Daten verlangen</li>
            <li><strong>Art. 16 DSGVO – Berichtigung:</strong> Sie können unvollständige oder fehlerhafte Daten berichtigen lassen</li>
            <li><strong>Art. 17 DSGVO – Löschung:</strong> Sie können die Löschung Ihrer Daten verlangen (Recht auf Vergessenwerden), soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen</li>
            <li><strong>Art. 18 DSGVO – Einschränkung:</strong> Sie können die Einschränkung der Verarbeitung verlangen</li>
            <li><strong>Art. 20 DSGVO – Datenportabilität:</strong> Sie können Ihre Daten in strukturierter Form erhalten und zu einem anderen Anbieter übertragen</li>
            <li><strong>Art. 21 DSGVO – Widerspruchsrecht:</strong> Sie können der Verarbeitung widersprechen (z. B. Marketing-E-Mails)</li>
            <li><strong>Art. 22 DSGVO – Automatisierte Entscheidungen:</strong> Sie haben Recht, nicht automatisiert ausschließlich aufgrund technischer Verarbeitung entschieden zu werden</li>
          </ul>
          <p className="mt-3">
            Um Ihre Rechte wahrzunehmen, wenden Sie sich an: <strong>datenschutz@pruefpilot.de</strong>
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-black mb-3">8. Sicherheit und Datenschutz</h2>
          <p>
            PrüfPilot implementiert angemessene technische und organisatorische Maßnahmen zum Schutz Ihrer Daten:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Verschlüsselte Datenübertragung (HTTPS/TLS 1.2+)</li>
            <li>Sichere Passwortspeicherung (bcrypt Hashing)</li>
            <li>Regelmäßige Sicherheitsupdates und Patches</li>
            <li>Zugriffskontrolle und Authentifizierung</li>
            <li>Regelmäßige Backups in sicherer Umgebung</li>
            <li>Datenschutz durch Design (Privacy by Design)</li>
          </ul>
          <p className="mt-3">
            Trotz aller Sicherheitsmaßnahmen kann keine absolut sichere Datenübertragung garantiert werden. Sie nutzen den Dienst auf Ihr eigenes Risiko.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-black mb-3">9. Datenschutzverletzung — Meldepflicht</h2>
          <p>
            Im Falle einer Datenschutzverletzung werden Sie unverzüglich (in der Regel innerhalb von 72 Stunden) benachrichtigt, soweit dies gesetzlich erforderlich ist. Wir unterrichten auch die zuständige Datenschutzbehörde.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-black mb-3">10. Beschwerde bei der Datenschutzbehörde</h2>
          <p>
            Sie haben das Recht, sich bei der zuständigen Datenschutzbehörde zu beschweren, wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer Daten gegen die DSGVO verstößt:
          </p>
          <p className="mt-3">
            <strong>Aufsichtsbehörde:</strong> Je nachdem in welchem Bundesland Sie ansässig sind. Beispiel: Landesdatenschutzbeauftragte Baden-Württemberg
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-black mb-3">11. Links zu externen Websites</h2>
          <p>
            Diese Datenschutzerklärung gilt nur für PrüfPilot. Wenn Sie auf externe Links klicken, beachten Sie bitte deren Datenschutzrichtlinien. PrüfPilot übernimmt keine Verantwortung für externe Websites.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-black mb-3">12. Kontakt und Datenschutzanfragen</h2>
          <p>
            Für Fragen zum Datenschutz, zur Ausübung Ihrer Rechte oder zum Datenschutz in PrüfPilot:
          </p>
          <p className="mt-3">
            <strong>E-Mail:</strong> datenschutz@pruefpilot.de<br />
            <strong>Postanschrift:</strong> [Ihr Name / Firma], [Straße, PLZ Ort]
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-black mb-3">13. Änderungen dieser Datenschutzerklärung</h2>
          <p>
            Wir behalten uns vor, diese Datenschutzerklärung anzupassen, falls sich unsere Dienste ändern oder rechtliche Anforderungen dies erfordern. Die aktuelle Version finden Sie immer auf dieser Seite. Wesentliche Änderungen werden Ihnen per E-Mail mitgeteilt.
          </p>
        </section>

        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Zuletzt aktualisiert: April 2026<br />
            <strong>Hinweis:</strong> Bitte lassen Sie diese Datenschutzerklärung von einem Rechtsanwalt prüfen und an Ihre spezifische Situation anpassen.
          </p>
        </div>
      </div>
    </div>
  )
}
