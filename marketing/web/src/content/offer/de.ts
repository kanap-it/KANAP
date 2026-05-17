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
      'Starten Sie mit der vollständigen Open-Source-Plattform, ergänzen Sie prioritären Support, wenn Sie Hilfe möchten, oder wählen Sie Hosted KANAP, wenn wir den Betrieb übernehmen sollen.',
    plans: [
      {
        name: 'Self-Hosting',
        badge: 'Für immer kostenlos',
        target: 'Unbegrenzte Nutzer · unbegrenzte Workspaces',
        price: '0 €',
        period: '',
        features: [
          'Alle Funktionen enthalten',
          'Unbegrenzte Mitwirkende',
          'Community-Support über GitHub Issues',
          'Unter AGPL v3 lizenziert: lesen, ändern, beitragen',
          'Docker-Compose-Deployment in Minuten',
          'Ihre Daten bleiben auf Ihrer Infrastruktur',
        ],
        ctaLabel: 'Von GitHub bereitstellen',
        ctaHref: 'https://github.com/kanap-it/kanap',
        ctaVariant: 'primary',
      },
      {
        name: 'Self-Hosted Support',
        badge: 'Für Compliance & Kontrolle',
        target: 'Unbegrenzte Nutzer · unbegrenzte Workspaces',
        price: '2.490 €',
        period: '/Jahr',
        features: [
          'Alles aus Self-Hosting',
          'Prioritärer E-Mail-Support',
          '20 % Rabatt auf Beratung',
          'Plaid, eigener Schlüssel',
          'Installationshilfe',
          'Nur jährliche Abrechnung',
        ],
        ctaLabel: 'Abonnieren',
        ctaHref: '/contact',
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
      'Hosted KANAP ist dieselbe Open-Source-Plattform, von uns betrieben: Hosting, Updates, Backups, prioritärer Support und eine kostenlose 60-minütige Aktivierungssitzung. 14 Tage Test, keine Kreditkarte.',
    plans: [
      {
        name: 'Hosted KANAP',
        badge: 'Von uns betrieben',
        target: 'Unbegrenzte Nutzer · unbegrenzte Workspaces',
        price: '249 €',
        period: '/Mon',
        subPrice: 'oder 2.490 €/Jahr (2 Monate gratis)',
        features: [
          'Alle Funktionen enthalten',
          'Unbegrenzte Mitwirkende und Nur-Lese-Nutzer',
          'Cloud-Hosting und automatische Updates',
          'Verwaltete Backups',
          '2.500 Plaid-Nachrichten/Mon enthalten',
          'Plaid, eigener Schlüssel',
          'Kostenlose 60-min Aktivierungssitzung',
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
        body: 'Sie brauchen das Selbsthosting-Modell wegen Compliance oder Datenschutz, möchten aber prioritären Support und Beratungsrabatte.',
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
