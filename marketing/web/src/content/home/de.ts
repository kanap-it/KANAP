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
    lead: 'Budget, Architektur, Portfolio und Wissen in einer Plattform, mit Plaid, dem integrierten KI-Assistenten.\nSelbst hosten oder von uns betreiben lassen.',
    primaryCta: 'Testversion starten',
    secondaryCta: 'Funktionen entdecken',
    trialNote: '14-Tage-Test · keine Kreditkarte · kostenlose Aktivierungssitzung.',
  },

  pillars: {
    eyebrow: 'Warum KANAP',
    title: 'Anders gedacht.',
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
        body: 'AGPL v3. Vollständiger Quellcode auf GitHub. Frei zum Selbsthosten, offen für Beiträge. Kein Vendor-Lock-in, kein Bait-and-Switch, kein Freemium-Pricing.',
      },
    ],
  },

  modules: {
    eyebrow: 'Komplettes IT-Toolkit',
    title: 'Für jede IT-Rolle gemacht.\nGanze Plattform, oder Kachel für Kachel.',
    intro:
      'KANAP deckt alles ab, was eine IT-Abteilung im Griff haben muss, von der ersten Budgetzeile bis zur letzten abgeschalteten Anwendung, mit einem KI-Assistenten, der alles quer liest.',
    items: [
      {
        slug: '/features/budget',
        title: 'Budget-Management',
        blurb:
          'Für CIOs und Finanzpartner. Mehrjährige Planung, intelligente Verteilung, Chargeback-Berichte, die der Geschäftsführung passen. Verteidigen Sie das IT-Budget mit Zahlen, denen Ihr CFO vertraut.',
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
          'Für Architekten, Anwendungsverantwortliche und Infrastruktur-Teams. Dokumentieren Sie Apps, Schnittstellen und Server. Sehen Sie das System auf einen Blick, planen Sie Änderungen mit allen Abhängigkeiten vor Augen.',
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
          'Für Projektleiter und IT-Leads. Bewerten Sie die Nachfrage, simulieren Sie kapazitätsbewusste Roadmaps, setzen Sie Termine, ohne die Daumen zu drücken.',
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
          'Für alle, besonders Support und Operations. Markdown-Editor, Bibliotheken, Review-Workflows. Runbooks, Entscheidungen und Architekturnotizen, verknüpft mit den Apps und Projekten, die sie beschreiben.',
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
          'Für jede Rolle, nicht nur für KI-Begeisterte. Fragen Sie in Alltagssprache, bekommen Sie strukturierte Antworten über alle Module hinweg. Der kürzeste Weg zwischen einer IT-Frage und der Antwort, die in den Daten liegt.',
        bullets: [
          'Natürlichsprachliche Abfragen über alle Module',
          'Dokument- und Aufgabenaktionen mit Vorschau',
          'MCP-Server für Claude, Cursor, Windsurf…',
          'Kostenlose Nutzung auf Cloud-Plänen, oder eigener Schlüssel',
        ],
        ctaLabel: 'Mehr erfahren',
      },
      {
        title: 'In Ihrem Tempo einführen',
        blurb:
          'Jedes Kernmodul ist allein voll einsatzfähig. Beginnen Sie dort, wo es heute am meisten weh tut — Budget, Landschaft, Portfolio, Wissen — und ergänzen Sie den Rest, wenn Sie soweit sind. Die Plattform liefert mehr Wert, je mehr Sie einführen, aber Sie brauchen nie alle fünf, um Wert zu schöpfen.',
        bullets: [
          'Jedes Modul vollständig allein nutzbar',
          'Keine erzwungene Reihenfolge, keine Komplettmigration',
          'Modulübergreifender Wert wächst mit der Adoption',
          'Heute ein Tool ersetzen, später konsolidieren',
        ],
      },
    ],
  },

  crossCutting: {
    eyebrow: 'Enterprise-ready',
    title: 'Alles verbunden.\nImmer unter Kontrolle.',
    intro:
      'Fünf Module arbeiten auf derselben Datenbasis und bauen so die Governance-Schicht, die IT-Abteilungen tatsächlich brauchen.',
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
        title: 'Reichhaltige Beziehungen',
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
        title: 'SSO über Microsoft Entra ID',
        body: 'Enterprise Single Sign-On. Ein Login für Ihre gesamte Organisation.',
      },
    ],
  },

  cta: {
    title: 'Bereit, Klarheit in Ihre IT zu bringen?',
    body:
      'Starten Sie kostenlos mit Self-Hosting oder testen Sie die Cloud ab 49 €/Mon.\nAlle Funktionen in jedem Plan, Cloud wie Self-Hosting.',
    primary: 'Testversion starten',
    secondary: 'Von GitHub bereitstellen',
  },
};

export default content;
