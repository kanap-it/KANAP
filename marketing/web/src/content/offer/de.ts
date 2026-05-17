import type { OfferContent } from './types';

const content: OfferContent = {
  meta: {
    title: 'Preise',
    description:
      'Kostenlos und Open Source. Selbsthosting ohne Limits, Support bei Bedarf oder Hosted KANAP. Alle Funktionen in jedem Plan. AGPL v3.',
  },

  header: {
    eyebrow: 'Einfache, transparente Preise',
    title: 'Kostenlos und Open Source.\nSelbst hosten oder von uns betreiben lassen.',
    lead: 'Alle Funktionen in jedem Plan. Keine Feature-Gates, keine Sitzplatzsteuer, kein Lock-in. Sie zahlen nur für Betrieb und Support, die Sie nicht selbst übernehmen möchten.',
  },

  selfHosted: {
    eyebrow: 'Wählen Sie Ihren Weg',
    title: 'Dasselbe Produkt.\nDrei Betriebsarten.',
    intro:
      'Starten Sie mit der vollständigen Open-Source-Plattform. Ergänzen Sie Produktionssupport, wenn Souveränität zählt, oder wählen Sie Hosted KANAP, wenn wir den Betrieb übernehmen sollen.',
    plans: [
      {
        name: 'Self-Hosting',
        badge: 'Open Source · für immer kostenlos',
        target: 'Unbegrenzte Nutzer · unbegrenzte Workspaces',
        price: '0 €',
        period: '',
        features: [
          'Voller Funktionsumfang, keine Limits',
          'Plaid enthalten, mit Ihrem eigenen LLM-Schlüssel',
          'Ihre Daten bleiben auf Ihrer Infrastruktur',
          'Docker-Compose-Deployment in Minuten',
          'Open Source unter AGPL v3',
          'Community-Support über GitHub Issues',
        ],
        ctaLabel: 'Von GitHub bereitstellen',
        ctaHref: 'https://github.com/kanap-it/kanap',
        ctaVariant: 'primary',
      },
      {
        name: 'Self-Hosted Support',
        badge: 'On-Prem mit Produktionssupport',
        target: 'Unbegrenzte Nutzer · unbegrenzte Workspaces',
        price: '2.490 €',
        period: '/Jahr',
        subPrice: 'Jährliche Abrechnung',
        features: [
          'Alles aus Self-Hosting',
          'Ihre Daten bleiben auf Ihrer Infrastruktur',
          'Prioritärer E-Mail-Support',
          'Unterstützung bei Installation und Upgrades',
          'Direkte Linie zum Team für Produktionsprobleme',
          '60-min Kickoff-Call mit einem KANAP-Experten',
          '20 % Rabatt auf Beratung',
        ],
        ctaLabel: 'Abonnieren',
        ctaHref: '#support-invoice',
        ctaVariant: 'primary',
      },
    ],
  },

  openSourceBanner: {
    title: 'Wirklich Open Source, AGPL v3',
    body:
      'Der komplette Quellcode von KANAP liegt auf GitHub. Lesen, prüfen, erweitern, beitragen. Die AGPL v3 sorgt dafür, dass der Code offen bleibt, für alle. Keine proprietären Forks, kein Lock-in.',
    linkLabel: 'Lizenz lesen',
    linkHref: 'https://www.gnu.org/licenses/agpl-3.0.html',
  },

  cloud: {
    eyebrow: 'Cloud · wenn wir es für Sie betreiben sollen',
    title: 'Dieselbe Plattform, von uns betrieben.',
    intro:
      'Hosted KANAP ist dieselbe Open-Source-Plattform, von uns betrieben: Hosting, Updates, Backups, prioritärer Support und ein 60-minütiger Kickoff-Call. 14 Tage Test, keine Kreditkarte.',
    plans: [
      {
        name: 'Hosted KANAP',
        badge: 'Fully managed',
        target: 'Unbegrenzte Nutzer · unbegrenzte Workspaces',
        price: '249 €',
        period: '/Mon',
        subPrice: 'oder 2.490 €/Jahr (2 Monate gratis)',
        features: [
          'Alles aus Self-Hosting',
          'Wir hosten, aktualisieren und sichern KANAP für Sie',
          'EU-Hosting für europäische Teams',
          '2.500 Plaid-Nachrichten/Mon enthalten oder eigener Schlüssel ohne Limit',
          '60-min Kickoff-Call mit einem KANAP-Experten',
          'Prioritärer E-Mail-Support',
          '20 % Rabatt auf Beratung',
        ],
        ctaLabel: 'Testversion starten',
        ctaHref: '/trial/start',
        ctaVariant: 'primary',
      },
    ],
  },

  howToChoose: {
    title: 'Wie Sie wählen',
    intro: 'Wählen Sie danach, wer den Betrieb führt. Jeder Plan enthält alle Produktfunktionen.',
    items: [
      {
        title: 'Self-Hosting · kostenlos',
        body: 'Sie haben IT-Kapazität und wollen volle Kontrolle. Bestes Preis-Leistungs-Verhältnis ohne Haken. Community-Support.',
      },
      {
        title: 'Self-Hosting · mit Support',
        body: 'Sie brauchen das Selbsthosting-Modell wegen Souveränität, Compliance oder Datenschutz, möchten aber Produktionssupport und eine direkte Linie bei Problemen.',
      },
      {
        title: 'Cloud-Hosting',
        body: 'Sie wollen den schnellsten Weg zum Ergebnis, ohne Infrastruktur zu betreiben. Dasselbe Produkt, von KANAP betrieben.',
      },
    ],
  },

  services: {
    title: 'Expertenhilfe, wenn Sie sie wollen',
    intro: 'KANAP ist für selbstständige Einführung gebaut. Wenn Sie schneller vorankommen möchten, enthalten bezahlte Angebote prioritären Support und 20 % Rabatt auf Beratung.',
    support: {
      title: 'Prioritärer Support',
      subtitle: 'In jedem kostenpflichtigen Plan enthalten',
      body: 'Wir halten alles am Laufen. Echte Menschen, faire Reaktionszeiten, kein SLA-Theater.',
      items: [
        'Bugs, Fehler, Ausfälle, Zugriffsprobleme',
        'Hilfe bei On-Premise-Installation',
        'Fragen zu erwartetem Verhalten',
        'Schnelle Klarstellungen',
      ],
    },
    consulting: {
      title: 'Beratung',
      subtitle: 'Kostenpflichtig · 20 % Rabatt für Abonnenten',
      body: 'Optionale Hilfe, um mehr Wert aus KANAP zu ziehen: geplante Calls, tiefergehende Arbeit, Advisory.',
      items: [
        'Einrichtung, Konfiguration, Onboarding, Schulung',
        'Workflow-Design und Best Practices',
        'CIO-Advisory zu Ihrem IT-Governance-Modell',
        'Alles, was einen geplanten Call erfordert',
      ],
    },
  },

  rates: {
    title: 'Optionale Beratungstarife',
    intro: 'Transparente Preise für Teams, die Expertenhilfe möchten. Abonnenten erhalten immer 20 % Rabatt.',
    headings: {
      duration: 'Dauer',
      useCases: 'Anwendungsfälle',
      rate: 'Tarif',
      subscriber: 'Abonnent',
    },
    rows: [
      {
        duration: '1 Stunde',
        useCases: 'Troubleshooting, spezifische Fragen, schneller Rat',
        rate: '190 €',
        subscriber: '150 €',
      },
      {
        duration: 'Halber Tag (4h)',
        useCases: 'Onboarding, Schulung, Konfigurationsworkshop',
        rate: '690 €',
        subscriber: '550 €',
      },
      {
        duration: 'Ganzer Tag (8h)',
        useCases: 'Großteam-Schulung, ausführliche Beratung, CIO-Advisory',
        rate: '1.250 €',
        subscriber: '1.000 €',
      },
    ],
    note: 'Tarife pro Session, zzgl. MwSt. Reisekosten werden separat berechnet, falls vor Ort nötig.',
  },

  supportInvoice: {
    title: 'Rechnung anfordern',
    eyebrow: 'Self-Hosted Support',
    body:
      'Wir erstellen Ihre jährliche Self-Hosted-Support-Rechnung und senden sie an Ihre Rechnungs-E-Mail. Nach Zahlung erhalten Sie Zugriff auf professionelle Supportleistungen.',
    companyLabel: 'Firmenname',
    contactLabel: 'Kontaktperson',
    billingEmailLabel: 'Rechnungs-E-Mail',
    countryLabel: 'Land',
    optionalSummary: 'Optionale Rechnungsdaten',
    vatLabel: 'USt-IdNr.',
    address1Label: 'Adresszeile 1',
    address2Label: 'Adresszeile 2',
    cityLabel: 'Stadt',
    postalCodeLabel: 'Postleitzahl',
    captchaLabel: 'Sicherheitsprüfung',
    submitLabel: 'Rechnung anfordern',
    submittingLabel: 'Rechnungsanfrage wird vorbereitet...',
    successWithLink: 'Rechnungsanfrage gesendet. Wir haben sie an Ihre Rechnungs-E-Mail gesendet.',
    successLinkLabel: 'Rechnung öffnen',
    successNoLink: 'Rechnungsanfrage gesendet. Bitte prüfen Sie Ihre Rechnungs-E-Mail.',
    errorGeneric: 'Die Rechnungsanfrage konnte nicht gesendet werden. Bitte erneut versuchen oder support@kanap.net kontaktieren.',
    errorRequired: 'Bitte füllen Sie alle Pflichtfelder aus.',
    closeLabel: 'Formular schließen',
  },

  faqTeaser: {
    title: 'Häufige Fragen',
    body: 'Lizenz, Self-Hosting, Cloud, Plaid, Support und Abrechnung. Hier sind alle Antworten.',
    ctaLabel: 'FAQ lesen',
  },

  cta: {
    title: 'Bereit loszulegen?',
    body:
      'Stellen Sie KANAP kostenlos selbst bereit oder testen Sie die gehostete Version, wenn wir den Betrieb übernehmen sollen.',
    primary: 'Kostenlos bereitstellen',
    secondary: 'Hosted Cloud testen',
  },
};

export default content;
