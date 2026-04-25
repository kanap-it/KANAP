import type { FeaturesHubContent } from '../features/types';

const content: FeaturesHubContent = {
  meta: {
    title: 'Funktionen',
    description:
      'Fünf integrierte Module: Budget, IT-Landschaft, Portfolio, Wissen, KI-Assistent. Enterprise-ready mit RBAC, Audit, SSO, Multi-Tenant. Open Source unter AGPL v3.',
  },
  header: {
    eyebrow: 'Das komplette IT-Toolkit',
    title: 'Fünf integrierte Module.\nEine Quelle der Wahrheit.',
    lead: 'KANAP deckt das Kernterrain jeder IT-Abteilung ab, von der ersten Budgetzeile bis zur letzten abgeschalteten Anwendung, mit einem KI-Assistenten, der alles quer liest.',
  },
  modules: [
    {
      slug: '/features/budget',
      eyebrow: 'Modul 1',
      title: 'Budget-Management',
      body: 'Beherrschen Sie Ihr IT-Budget mit mehrjähriger Planung, intelligenter Kostenverteilung und Chargeback-Berichten für die Geschäftsführung. OPEX und CAPEX mit voller Transparenz über Gesellschaften und Abteilungen hinweg.',
      bullets: [
        'Mehrjährige Budgetplanung mit dynamischen Spalten',
        'Sechs Verteilungsmethoden, u. a. Mitarbeiterzahl und Umsatz',
        'Mehrwährung mit automatischen FX-Kursen',
        'Chargeback-Berichte nach Gesellschaft und Abteilung',
        'Freeze/Unfreeze-Workflows für die Governance',
      ],
      ctaLabel: 'Budget-Management entdecken',
      shotAlt: 'Budget-Grid mit OPEX und CAPEX',
    },
    {
      slug: '/features/it-landscape',
      eyebrow: 'Modul 2',
      title: 'IT-Landschaft',
      body: 'Dokumentieren Sie Ihr gesamtes Informationssystem: Anwendungen, Schnittstellen und Infrastruktur. Visualisieren Sie Ihre Architektur mit interaktiven Karten und verfolgen Sie den Lebenszyklus vom Vorschlag bis zur Abschaltung.',
      bullets: [
        'Anwendungsportfolio mit Instanzen pro Umgebung',
        'Schnittstellendokumentation mit 3-Leg-Middleware-Unterstützung',
        'Server- und Infrastrukturregister',
        'Interaktive Schnittstellen- und Verbindungskarten',
        'Versions-Lineage-Tracking für die Entwicklung',
      ],
      ctaLabel: 'IT-Landschaft entdecken',
      shotAlt: 'Schnittstellenkarte mit Anwendungsknoten',
    },
    {
      slug: '/features/portfolio',
      eyebrow: 'Modul 3',
      title: 'Portfolio-Management',
      body: 'Von der Anfrage bis zur Lieferung: Nachfrage priorisieren, realistische Lieferpläne simulieren und Roadmap-Termine mit Vertrauen übernehmen. Datenbasierte Entscheidungen, was wann gebaut wird.',
      bullets: [
        'Konfigurierbares Anfrage-Scoring mit gewichteten Kriterien',
        'Workflow zur Umwandlung Anfrage-zu-Projekt',
        'Automatische Roadmap-Erstellung aus Aufwand, Abhängigkeiten und Kapazität',
        'Engpass- und Auslastungsanalyse',
        'Selektive, transaktionale Übernahme generierter Termine',
        'Baseline-Erfassung für die Abweichungsanalyse',
      ],
      ctaLabel: 'Portfolio-Management entdecken',
      shotAlt: 'Roadmap mit Kapazitäts-Heatmap',
    },
    {
      slug: '/features/knowledge',
      eyebrow: 'Modul 4',
      title: 'Wissen',
      body: 'Steuern Sie Ihre IT-Dokumentation mit einem Markdown-Editor, strukturierten Bibliotheken und Review-Workflows. Verknüpfen Sie Dokumente mit Anwendungen, Assets, Projekten, Anfragen und Aufgaben, für volle Nachvollziehbarkeit.',
      bullets: [
        'Markdown-Editor mit Edit Locks und Autosave',
        'Bibliotheken, Ordner und Dokumenttypen',
        'Review- und Freigabe-Workflows',
        'Versionshistorie mit Rollback',
        'Export nach PDF, DOCX, ODT',
        'Tiefe Integration mit Apps, Assets, Projekten, Aufgaben',
      ],
      ctaLabel: 'Wissen entdecken',
      shotAlt: 'Bibliotheksbaum mit Dokumenttypen',
    },
    {
      slug: '/features/ai',
      eyebrow: 'KI-Assistent',
      title: 'Plaid kennenlernen',
      body: 'Fragen Sie alles zu Ihren IT-Daten in natürlicher Sprache. Plaid sucht über alle Module hinweg, erstellt Dokumente und verwaltet Aufgaben, immer unter Beachtung Ihrer Berechtigungen.',
      bullets: [
        'Abfragen in natürlicher Sprache über alle Module',
        'Dokument- und Aufgabenaktionen direkt aus dem Chat',
        'MCP-Server für jedes KI-Tool',
        'Eigener API-Key, OpenAI, Anthropic, Ollama, individuell',
        'Volle Tenant-Isolation und RBAC-Durchsetzung',
      ],
      ctaLabel: 'Plaid entdecken',
      shotAlt: 'Plaid-Chat mit modulübergreifender Abfrage',
    },
  ],
  crossCutting: {
    eyebrow: 'Enterprise-ready',
    title: 'Alles verbunden. Immer unter Kontrolle.',
    intro: 'Fünf Module arbeiten auf derselben Datenbasis, mit der Governance-Schicht, die IT-Abteilungen tatsächlich brauchen.',
    items: [
      { title: 'Reporting & Dashboards', body: 'Berichte für die Geschäftsführung, Trendanalysen und KPI-Dashboards.' },
      { title: 'Rollenbasierte Zugriffskontrolle', body: 'Feinkörnige Berechtigungen pro Modul. Leser-, Manager- und Admin-Ebenen.' },
      { title: 'Umfassende Verknüpfungen', body: 'Kosten an Apps, Apps an Projekte, Projekte an Budgets, Wissen an alles.' },
      { title: 'Vollständiger Audit-Trail', body: 'Jede Änderung protokolliert mit kompletter Vorher-Nachher-Historie.' },
      { title: 'Einheitliches Aufgabenmanagement', body: 'Aufgaben über OPEX, CAPEX und Verträge hinweg. Fälligkeiten und Fortschritt im Blick.' },
      { title: 'Multi-Tenant-Architektur', body: 'Sichere Tenant-Isolation mit Row-Level Security.' },
      { title: 'SSO über Microsoft Entra ID', body: 'Enterprise Single Sign-On Integration.' },
      { title: 'Open Source unter AGPL v3', body: 'Echtes Open Source. Einsehen, selbst hosten, mitgestalten.' },
    ],
  },
  cta: {
    title: 'Bereit, Klarheit in Ihre IT-Abteilung zu bringen?',
    body: 'Starten Sie kostenlos mit Self-Hosting oder testen Sie die Cloud ab 49 €/Mon. Alle Funktionen in jedem Plan.',
    primary: 'Testversion starten',
    secondary: 'Sprechen Sie mit uns',
  },
};

export default content;
