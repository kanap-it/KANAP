import type { OfferContent } from './types';

const content: OfferContent = {
  meta: {
    title: 'Preise',
    description:
      'Kostenlos und Open Source. Selbsthosting ohne Limits, oder wir betreiben es ab 49 €/Monat. Alle Funktionen in jedem Plan. AGPL v3.',
  },

  header: {
    eyebrow: 'Einfache, transparente Preise',
    title: 'Kostenlos und Open Source.\nSelbst hosten oder von uns betreiben lassen.',
    lead: 'Alle Funktionen in jedem Plan. Keine Feature-Gates, kein Platzaufpreis auf Funktionen, kein Lock-in. Sie zahlen nur für den Betrieb, den Sie nicht selbst führen möchten.',
  },

  selfHosted: {
    eyebrow: 'Selbst gehostet · die bevorzugte Option',
    title: 'Betreiben Sie KANAP selbst.\nFür immer kostenlos.',
    intro:
      'Die komplette Plattform unter AGPL v3. Auf Ihrer Infrastruktur ausrollen, Ihre Daten behalten, im eigenen Takt aktualisieren. Optionaler Premium-Support, wenn Sie prioritäre Hilfe ohne Kontrollverlust möchten.',
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
        featured: true,
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
        ctaVariant: 'ghost',
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
      'Jeder Cloud-Plan enthält die komplette Plattform, Hosting, Updates, Backups, prioritären Support und eine kostenlose 60-minütige Aktivierungssitzung. 14 Tage Test, keine Kreditkarte.',
    plans: [
      {
        name: 'Starter',
        badge: 'Schneller Einstieg',
        target: 'Bis zu 5 Mitwirkende',
        price: '49 €',
        period: '/Mon',
        subPrice: 'oder 490 €/Jahr (2 Monate gratis)',
        features: [
          'Alle Funktionen enthalten',
          'Cloud-Hosting & automatische Updates',
          'Unbegrenzte Nur-Lese-Nutzer',
          '500 Plaid-Nachrichten/Mon',
          'Plaid, eigener Schlüssel',
          'Kostenlose 60-min Aktivierungssitzung',
          'Prioritärer E-Mail-Support',
          '20 % Rabatt auf Beratung',
        ],
        ctaLabel: 'Testversion starten',
        ctaHref: '/trial/start',
        ctaVariant: 'ghost',
      },
      {
        name: 'Standard',
        badge: 'Team-übergreifende Governance',
        target: 'Bis zu 25 Mitwirkende',
        price: '149 €',
        period: '/Mon',
        subPrice: 'oder 1.490 €/Jahr (2 Monate gratis)',
        features: [
          'Alles aus Starter',
          '1.500 Plaid-Nachrichten/Mon',
        ],
        ctaLabel: 'Testversion starten',
        ctaHref: '/trial/start',
        ctaVariant: 'primary',
        featured: true,
      },
      {
        name: 'Max',
        badge: 'Unternehmensweiter Rollout',
        target: 'Unbegrenzte Mitwirkende',
        price: '249 €',
        period: '/Mon',
        subPrice: 'oder 2.490 €/Jahr (2 Monate gratis)',
        features: [
          'Alles aus Standard',
          '2.500 Plaid-Nachrichten/Mon',
        ],
        ctaLabel: 'Testversion starten',
        ctaHref: '/trial/start',
        ctaVariant: 'ghost',
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
        body: 'Sie wollen den schnellsten Weg zum Ergebnis. Wir betreiben die Infrastruktur, Sie konzentrieren sich auf Ihre IT.',
      },
    ],
  },

  services: {
    title: 'Support und Beratung',
    intro: 'Unterschiedliche Bedürfnisse, unterschiedliche Services. Abonnenten erhalten prioritären Support inklusive und 20 % Rabatt auf Beratung.',
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
      body: 'Wir helfen Ihnen, aus KANAP Wert zu ziehen, geplante Calls, tiefergehende Arbeit, Advisory.',
      items: [
        'Einrichtung, Konfiguration, Onboarding, Schulung',
        'Workflow-Design und Best Practices',
        'CIO-Advisory zu Ihrem IT-Governance-Modell',
        'Alles, was einen geplanten Call erfordert',
      ],
    },
  },

  rates: {
    title: 'Beratungstarife',
    intro: 'Transparente Preise. Abonnenten erhalten immer 20 % Rabatt.',
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
      'Kostenlos selbst bereitstellen oder von uns betreiben lassen ab 49 €/Mon, inklusive 60-min Aktivierungssitzung.',
    primary: 'Testversion starten',
    secondary: 'Von GitHub bereitstellen',
  },
};

export default content;
