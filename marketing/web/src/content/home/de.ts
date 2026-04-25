import type { HomeContent } from './types';

const content: HomeContent = {
  meta: {
    title: 'Die Open-Source-Plattform für IT-Governance',
    description:
      'Budget, Unternehmensarchitektur, Portfolio und Wissen in einer KI-gestützten Plattform. Entwickelt von einem CIO. Open Source unter AGPL v3. Selbst hosten oder Cloud ab 49 €/Mon.',
  },

  hero: {
    eyebrow: 'Bringen Sie Klarheit in Ihre IT',
    title: 'Die Open-Source-Plattform für IT-Governance.',
    lead: 'Budget, Architektur, Portfolio und Wissen in einer Plattform, mit Plaid, dem integrierten KI-Assistenten. Selbst hosten oder von uns betreiben lassen.',
    primaryCta: 'Testversion starten',
    secondaryCta: 'Funktionen entdecken',
    trialNote: '14-Tage-Test · keine Kreditkarte · kostenlose Aktivierungssitzung.',
  },

  pillars: {
    eyebrow: 'Warum KANAP',
    title: 'Anders gedacht.\nFair bepreist.',
    items: [
      {
        title: 'Von Praktikern entwickelt',
        body: 'Konzipiert von einem erfahrenen IT-Veteranen mit echter branchenübergreifender Erfahrung. Löst reale Probleme der IT. Passt in jede Branche.',
      },
      {
        title: 'Einfach & leistungsstark',
        body: 'Null Komplexitätstheater. Stark genug für schwierige Probleme. Einfach genug, dass Ihr Team sie heute einführen kann.',
      },
      {
        title: 'Wirklich Open Source',
        body: 'AGPL v3. Vollständiger Quellcode auf GitHub. Frei zum Selbsthosten, offen für Beiträge. Kein Vendor-Lock-in, kein Bait-and-Switch. Wenn wir morgen verschwinden, bleibt Ihre Plattform Ihnen.',
      },
    ],
  },

  modules: {
    eyebrow: 'Komplettes IT-Toolkit',
    title: 'Fünf integrierte Module.\nEine Quelle der Wahrheit.',
    intro:
      'KANAP deckt alles ab, was eine IT-Abteilung im Griff haben muss, von der ersten Budgetzeile bis zur letzten abgeschalteten Anwendung, mit einem KI-Assistenten, der alles quer liest.',
    items: [
      {
        slug: '/features/budget',
        title: 'Budget-Management',
        blurb:
          'Beherrschen Sie Ihr IT-Budget mit mehrjähriger Planung, intelligenter Kostenverteilung und Chargeback-Berichten für die Geschäftsführung. OPEX und CAPEX transparent.',
        bullets: [
          'Mehrjährige Budgetplanung',
          'Sechs Verteilungsmethoden',
          'Mehrwährung mit Weltbank-FX',
          'Chargeback-Berichte für die Geschäftsführung',
        ],
        ctaLabel: 'Mehr erfahren',
      },
      {
        slug: '/features/it-landscape',
        title: 'IT-Landschaft',
        blurb:
          'Dokumentieren Sie Ihr Informationssystem: Anwendungen, Schnittstellen, Infrastruktur. Visualisieren Sie Ihre Architektur mit interaktiven Karten.',
        bullets: [
          'Anwendungsportfolio mit Instanzen pro Umgebung',
          'Schnittstellendokumentation mit 3-Leg-Middleware',
          'Server- und Infrastrukturregister',
          'Interaktive Schnittstellen- und Verbindungskarten',
        ],
        ctaLabel: 'Mehr erfahren',
      },
      {
        slug: '/features/portfolio',
        title: 'Portfolio-Management',
        blurb:
          'Von der Anfrage zur Lieferung: Bewerten Sie die Nachfrage, erstellen Sie kapazitätsbewusste Roadmaps, setzen Sie Projekttermine mit Vertrauen.',
        bullets: [
          'Anfrage-Scoring mit gewichteten Kriterien',
          'Automatische Roadmap-Planung',
          'Engpass- und Auslastungsanalyse',
          'Projekt-Lifecycle-Tracking',
        ],
        ctaLabel: 'Mehr erfahren',
      },
      {
        slug: '/features/knowledge',
        title: 'Wissen',
        blurb:
          'Steuern Sie Ihre IT-Dokumentation mit einem Markdown-Editor, strukturierten Bibliotheken und Review-Workflows. Verknüpfen Sie Dokumente mit allem.',
        bullets: [
          'Markdown-Editor mit Review-Workflows',
          'Bibliotheken, Ordner, Dokumenttypen',
          'Versionshistorie und Export nach PDF, DOCX, ODT',
          'Tiefe Verknüpfungen zu Apps, Projekten, Assets, Aufgaben',
        ],
        ctaLabel: 'Mehr erfahren',
      },
      {
        slug: '/features/ai',
        title: 'Plaid, KI-Assistent',
        blurb:
          'Fragen Sie Plaid alles zu Ihren Daten. Dokumente erstellen, Aufgaben aktualisieren, Ihre KI-Tools per MCP anbinden.',
        bullets: [
          'Natürlichsprachliche Abfragen über alle Module',
          'Dokument- und Aufgabenaktionen mit Vorschau',
          'MCP-Server für Claude, Cursor, Windsurf…',
          'Kostenlose Nutzung auf Cloud-Plänen, oder eigener Schlüssel',
        ],
        ctaLabel: 'Mehr erfahren',
      },
    ],
  },

  crossCutting: {
    eyebrow: 'Enterprise-ready',
    title: 'Alles verbunden.\nImmer unter Kontrolle.',
    intro:
      'Fünf Module arbeiten auf derselben Datenbasis, mit der Governance-Schicht, die IT-Abteilungen tatsächlich brauchen.',
    items: [
      {
        title: 'Reporting & Dashboards',
        body: 'Dashboards für die Geschäftsführung, Trendanalysen, CSV- und PNG-Exporte.',
      },
      {
        title: 'Rollenbasierte Zugriffskontrolle',
        body: 'Feinkörnige Berechtigungen pro Modul. Leser-, Manager- und Administratorebenen.',
      },
      {
        title: 'Vollständige Beziehungen',
        body: 'Verknüpfen Sie Kosten mit Apps, Apps mit Projekten, Projekte mit Budgets, Wissen mit allem.',
      },
      {
        title: 'Vollständiger Audit-Trail',
        body: 'Jede Änderung protokolliert. Wer hat wann was geändert, mit vollständiger Vorher-Nachher-Historie.',
      },
      {
        title: 'Einheitliches Aufgabenmanagement',
        body: 'Aufgaben auf OPEX, CAPEX, Verträgen und Projekten. Ein Backlog über die ganze Plattform.',
      },
      {
        title: 'Multi-Tenant mit RLS',
        body: 'Row-Level Security isoliert jeden Tenant. Ihre Daten bleiben Ihre.',
      },
      {
        title: 'SSO über Microsoft Entra ID',
        body: 'Enterprise Single Sign-On. Ein Login für Ihre gesamte Organisation.',
      },
      {
        title: 'Offen by Design',
        body: 'MCP-Server, öffentliche API, CSV-Import/Export. Keine geschlossene Plattform.',
      },
    ],
  },

  cta: {
    title: 'Bereit, Klarheit in Ihre IT zu bringen?',
    body:
      'Starten Sie kostenlos mit Self-Hosting oder testen Sie die Cloud ab 49 €/Mon. Alle Funktionen in jedem Plan. Kein Lock-in.',
    primary: 'Testversion starten',
    secondary: 'Sprechen Sie mit uns',
  },
};

export default content;
