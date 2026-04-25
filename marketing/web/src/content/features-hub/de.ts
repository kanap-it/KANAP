import type { FeaturesHubContent } from '../features/types';

const content: FeaturesHubContent = {
  meta: {
    title: 'Wie IT-Teams KANAP wirklich nutzen',
    description:
      'Fünf Szenarien aus dem IT-Alltag — CIO, Architekt, PMO, Support, IT-Lead. Sehen Sie, wie die Module sich kombinieren, nicht nur, was jedes für sich tut.',
  },
  header: {
    eyebrow: 'Nach Rolle',
    title: 'Wie IT-Teams KANAP wirklich nutzen.',
    lead: 'Fünf Szenarien von Menschen, die IT täglich am Laufen halten. Echte Probleme, echte Abläufe, echte Ergebnisse. Sehen Sie, wie die Module sich kombinieren, nicht nur, was jedes für sich tut.',
  },
  modulesUsedLabel: 'Module kombiniert',
  personas: [
    {
      role: 'CIO / IT-Leitung',
      headline: 'Verteidigen Sie das IT-Budget im Vorstand.',
      body:
        'Ihr CFO fragt, warum die IT-Kosten um 12 % gestiegen sind. Sie kommen mit den Zahlen: ein Chargeback-Bericht nach Gesellschaft und Abteilung, OPEX und CAPEX nach Anwendung aufgeschlüsselt, der Mehrjahrestrend. Jede Zeile lässt sich auf einen Vertrag oder ein Projekt zurückführen. Keine Excel-Akrobatik, kein „Ich melde mich".',
      outcome: 'Gehen Sie mit Antworten ins Budget-Review, nicht mit Fragen.',
      modules: [
        { slug: 'budget', label: 'Budget' },
        { slug: 'it-landscape', label: 'IT-Landschaft' },
      ],
      shotAlt: 'Chargeback-Bericht nach Gesellschaft und Abteilung, OPEX/CAPEX-Aufschlüsselung',
    },
    {
      role: 'Unternehmensarchitekt',
      headline: 'Planen Sie eine Migration ohne Überraschungen.',
      body:
        'Sie schalten das alte CRM ab. Bevor Sie Termine zusagen, müssen Sie wissen, was davon abhängt: welche Schnittstellen, welche nachgelagerten Apps, welche Projekte es bereits berühren. Die Schnittstellenkarte zeigt den Abhängigkeitsgraph auf einen Blick. Ihr Migrationsplan listet jeden Schnittstellen-Eigentümer, jedes betroffene Projekt. Wissen verknüpft die Entscheidungen mit den Anwendungen, die sie beschreiben. Ihre Nachfolgerin wird wissen, warum.',
      outcome: 'Migrieren Sie mit offenen Augen statt mit gekreuzten Fingern.',
      modules: [
        { slug: 'it-landscape', label: 'IT-Landschaft' },
        { slug: 'knowledge', label: 'Wissen' },
        { slug: 'portfolio', label: 'Portfolio' },
      ],
      shotAlt: 'Schnittstellenkarte mit den Abhängigkeiten des abzuschaltenden CRM',
    },
    {
      role: 'PMO-Leitung / IT-Projektmanager',
      headline: 'Quartalsplanung mit echten Kapazitätszahlen.',
      body:
        'Zwanzig eingehende Anfragen, acht Teams, ein Quartal. Bewerten Sie jede Anfrage anhand gewichteter Kriterien und erstellen Sie eine kapazitätsbewusste Roadmap. Engpässe sind sichtbar, bevor Sie zusagen. Termine sind kein Wunschdenken. Sie sind Mathematik. Im Steering Committee erklären Sie, warum dieses Projekt in Q3 statt Q1 liegt: Kapazität im Plattform-Team.',
      outcome: 'Sagen Sie Termine zu, die Sie wirklich verteidigen können.',
      modules: [
        { slug: 'portfolio', label: 'Portfolio' },
        { slug: 'budget', label: 'Budget' },
      ],
      shotAlt: 'Kapazitätsbewusste Roadmap mit Engpass-Heatmap',
    },
    {
      role: 'IT-Operations / Support',
      headline: 'Die Ursache in Sekunden finden, nicht in Stunden.',
      body:
        'Die Auftragsverwaltung in der Produktion ist langsam. Sie fragen Plaid: „Welche Apps nutzen die order-management-API?" Fünf Sekunden später, eine Liste. „Welche davon wurden diese Woche aktualisiert?" Eine. „Wer ist verantwortlich?" E-Mail und Teams. Vom Symptom zur Verantwortlichkeit, ohne fünf Tools zu öffnen.',
      outcome: 'Behandeln Sie Vorfälle aus einem Ort. Schlafen Sie besser.',
      modules: [
        { slug: 'it-landscape', label: 'IT-Landschaft' },
        { slug: 'knowledge', label: 'Wissen' },
        { slug: 'ai', label: 'Plaid' },
      ],
      shotAlt: 'Plaid beantwortet eine Ursachenforschung mit strukturierten Ergebnissen',
    },
    {
      role: 'IT-Lead / Infrastruktur-Leitung',
      headline: 'Was abschalten, was verlängern, was zusammenführen.',
      body:
        'Wie viele SaaS-Anwendungen bezahlen wir? Welche überlappen? Wer ist Eigentümer, wenn es um Verhandlungen geht? Jede Anwendung trägt ihre OPEX-Zeile, ihren Vertrag, ihr Verlängerungsdatum, ihre Datenklassifizierung. Sortieren nach Kosten, Überlappung, Nutzung. Führen Sie das Gespräch mit der Finanzabteilung mit Fakten vor sich.',
      outcome: 'Verlängern Sie nicht mehr, was niemand nutzt.',
      modules: [
        { slug: 'it-landscape', label: 'IT-Landschaft' },
        { slug: 'budget', label: 'Budget' },
        { slug: 'knowledge', label: 'Wissen' },
      ],
      shotAlt: 'Anwendungsportfolio nach OPEX sortiert mit Verlängerungsdaten',
    },
  ],
  cta: {
    title: 'Bereit, Ihre Rolle auf der Plattform zu sehen?',
    body:
      'Starten Sie kostenlos mit Self-Hosting oder testen Sie die Cloud ab 49 €/Mon.\nAlle Funktionen in jedem Plan, Cloud wie Self-Hosting.',
    primary: 'Testversion starten',
    secondary: 'Von GitHub bereitstellen',
  },
};

export default content;
