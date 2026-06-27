import type { HomeContent } from './types';

const content: HomeContent = {
  meta: {
    title: 'Die Open-Source-Plattform für IT-Governance',
    description:
      'Budget, Unternehmensarchitektur, Portfolio und Wissen in einer Plattform. Plaid bearbeitet alles in Alltagssprache, und KI-Agenten übernehmen die wiederkehrende Last. Open Source unter AGPL v3. Kostenlos selbst hosten oder Hosted KANAP wählen.',
  },

  hero: {
    eyebrow: 'Bringen Sie Klarheit in Ihre IT-Abteilung',
    title: 'Die Open-Source-Plattform für IT-Governance.',
    lead: 'Budget, Architektur, Portfolio und Wissen in einer Plattform. Plaid lässt Ihr Team alles in Alltagssprache bearbeiten, und KI-Agenten übernehmen die wiederkehrende Arbeit.\nKostenlos selbst hosten oder von uns betreiben lassen.',
    primaryCta: 'Kostenlos bereitstellen',
    secondaryCta: 'Hosted Cloud testen',
    trialNote: 'AGPL v3 · kompletter Quellcode auf GitHub · Docker-Installation · keine Feature-Paywall.',
  },

  pillars: {
    eyebrow: 'Warum KANAP',
    title: 'Was KANAP unterscheidet.',
    items: [
      {
        title: 'Von Praktikern entwickelt',
        body: 'Konzipiert von einem erfahrenen IT-Veteranen mit echter branchenübergreifender Erfahrung. Es löst reale Probleme der IT-Abteilung, nicht generische Kollaborationsprobleme.',
      },
      {
        title: 'Einfach und stark',
        body: 'Kein Komplexitätstheater. Stark genug für schwierige Probleme. Einfach genug, dass Ihr Team es heute einführt.',
      },
      {
        title: 'Wirklich Open Source',
        body: 'AGPL v3. Vollständiger Quellcode auf GitHub. Frei zum Selbsthosten, offen für Beiträge. Kein Vendor-Lock-in, keine Feature-Paywall, keine Freemium-Falle.',
      },
      {
        title: 'Die ganze IT-Abteilung in einem System.',
        body: 'Anwendungen, Infrastruktur, Budgets, Projekte und Dokumentation liegen in einem zentralen Datenbestand statt in zehn unverbundenen Tools.',
      },
      {
        title: 'Agenten, die Ihr Team entlasten.',
        body: 'Autonome Agenten übernehmen die wiederkehrende Last und gewinnen mehr Eigenständigkeit, je mehr sie sich an realen Aufgaben beweisen.',
      },
      {
        title: 'In Ihrem Tempo einführen',
        body: 'Jedes Modul ist allein voll nutzbar. Beginnen Sie dort, wo es am meisten weh tut, und ergänzen Sie den Rest, wenn Sie soweit sind, ohne Komplettmigration.',
      },
    ],
  },

  layers: {
    eyebrow: 'Wie alles zusammenpasst',
    title: 'Eine komplette Plattform für die IT-Abteilung.',
    intro:
      'KANAP ist in drei Schichten aufgebaut, die auf denselben Informationen arbeiten, sodass jede die anderen nützlicher macht.',
    items: [
      {
        title: 'Der zentrale Datenbestand',
        body: 'KANAP hält das vollständige Bild Ihrer IT-Abteilung: Anwendungen und Infrastruktur, Budgets, Projekte und Dokumentation. Ein Ort statt zehn Tools.',
      },
      {
        title: 'Die Interaktion',
        body: 'Plaid lässt jeden in Ihrem Team in Alltagssprache mit dem zentralen Datenbestand arbeiten, Fragen stellen und Änderungen vornehmen, ohne erst zu lernen, wo alles liegt.',
      },
      {
        title: 'Die Aktion',
        body: 'Agenten handeln auf demselben Datenbestand, übernehmen wiederkehrende Arbeit und führen sie unter der Autonomie aus, die Sie ihnen gewähren.',
      },
    ],
    outro: 'Jeder Teil ist für sich nützlich, und zusammen werden sie stärker.',
  },

  modules: {
    eyebrow: 'Komplettes IT-Toolkit',
    title: 'Für jede IT-Rolle gemacht.',
    intro:
      'KANAP deckt das Kernterrain ab, das jede IT-Abteilung im Griff haben muss, von der ersten Budgetzeile bis zur letzten abgeschalteten Anwendung, mit Plaid, um alles in Alltagssprache zu bearbeiten, und Agenten, die die wiederkehrende Last übernehmen.',
    items: [
      {
        slug: '/features/budget',
        title: 'Budget-Management',
        blurb:
          'Für CIOs und Finanzpartner. Mehrjährige Planung, intelligente Verteilung, Chargeback für die Geschäftsführung. Verteidigen Sie das IT-Budget mit Zahlen, denen Ihr CFO vertraut.',
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
          'Für Projektleiter und IT-Leads. Bewerten Sie die Nachfrage, simulieren Sie kapazitätsbewusste Roadmaps, sagen Sie Termine zu, ohne die Daumen zu drücken.',
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
          'Für jede Rolle, nicht nur für KI-Begeisterte. Fragen Sie in Alltagssprache, bekommen Sie strukturierte Antworten über alle Module hinweg. Der kürzeste Weg zwischen einer IT-Frage und den Daten, die sie beantworten.',
        bullets: [
          'Natürlichsprachliche Abfragen über alle Module',
          'Dokument- und Aufgabenaktionen mit Vorschau',
          'MCP-Server für Claude, Cursor, Windsurf…',
          'Nutzung in Hosted Cloud enthalten, oder eigener Schlüssel',
        ],
        ctaLabel: 'Mehr erfahren',
      },
      {
        slug: '/features/agents',
        title: 'Agenten',
        blurb:
          'Für Teams, die in wiederkehrenden Tickets versinken. Ein Agent liest jede Aufgabe gegen Ihre IT-Daten und schlägt entweder eine Aktion vor oder führt sie aus, unter der Autonomie, die Sie festlegen. Ein Service-Desk-Konnektor läuft heute in Produktion, und die Runtime ist auf Erweiterung ausgelegt.',
        bullets: [
          'Schließt anhand Ihres realen IT-Datenbestands',
          'Startet beaufsichtigt, gewinnt mehr Autonomie',
          'Jede Aktion protokolliert und umkehrbar',
          'Offene Runtime, schreiben Sie Ihren eigenen Konnektor',
        ],
        ctaLabel: 'Mehr erfahren',
      },
    ],
  },

  crossCutting: {
    eyebrow: 'Enterprise-ready',
    title: 'Ein verbundenes System unter Ihrer Kontrolle.',
    intro:
      'Die Module arbeiten auf denselben Daten, und genau das gibt einer IT-Abteilung echte Governance. Genau das lässt auch einen Agenten handeln, ohne Ihre Umgebung zu gefährden.',
    items: [
      {
        title: 'Reporting & Dashboards',
        body: 'Dashboards für die Geschäftsführung, Trendanalysen, Exporte nach CSV und PNG.',
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
        body: 'Jede Änderung protokolliert, auch die Aktionen der Agenten. Wer hat wann was geändert, mit vollständiger Vorher-Nachher-Historie.',
      },
      {
        title: 'Einheitliches Aufgabenmanagement',
        body: 'Aufgaben über OPEX, CAPEX, Verträge und Projekte hinweg zuweisen. Ein Backlog über die ganze Plattform.',
      },
      {
        title: 'SSO über Microsoft Entra ID',
        body: 'Enterprise Single Sign-On. Ein Login für Ihre gesamte Organisation.',
      },
    ],
  },

  vision: {
    eyebrow: 'Wohin das führt',
    title: 'Hin zu einer KI-gestützten IT-Abteilung.',
    body: 'Die Richtung ist eine IT-Abteilung, in der Agenten die wiederkehrende Last unauffällig tragen, damit Ihr Team seine Zeit für die Arbeit nutzt, die echtes Urteilsvermögen erfordert, und all das läuft auf Software, die Ihnen gehört und die Sie von Anfang bis Ende lesen können.',
  },

  cta: {
    title: 'Steuern Sie Ihre IT-Abteilung mit einem System, das Ihnen gehört.',
    body: 'Stellen Sie KANAP kostenlos selbst bereit oder lassen Sie es von uns hosten. Das Produkt und jede Funktion sind identisch, Agenten inklusive.',
    primary: 'Kostenlos bereitstellen',
    secondary: 'Hosted Cloud testen',
  },
};

export default content;
