import type { FeatureContent } from '../types';

const content: FeatureContent = {
  meta: {
    title: 'Plaid, KI-Assistent für IT-Governance',
    description:
      'Fragen Sie Plaid zu Ihren IT-Daten. Dokumente erstellen, Aufgaben aktualisieren, beliebiges KI-Tool per MCP anbinden. Kostenlose Nutzung in Cloud-Plänen enthalten. Open Source.',
  },
  header: {
    eyebrow: 'Plaid · KI-Assistent',
    title: 'Kein Chatbot. Ein echter Assistent für die IT.',
    lead: 'Fragen Sie alles zu Ihrem Budget, Ihren Anwendungen, Projekten oder Ihrer Dokumentation. Plaid versteht Ihre Daten, handelt, und lässt sich via MCP an jedes Enterprise-KI-Tool anschließen.',
  },
  sections: [
    {
      title: 'Alles suchen & abfragen',
      body: 'Fragen Sie Plaid zu Ihren Anwendungen, Servern, Verträgen, Budgetposten, Projekten, Aufgaben oder Dokumenten. Sofortige Antworten mit strukturierten Daten, statt vager Zusammenfassungen.',
      bullets: [
        'Modulübergreifende Suche über alle Bereiche',
        'Strukturierte Abfragen mit Filtern und Sortierung',
        'Aggregationen und Statistiken',
        'Volltextsuche in der Wissensdatenbank',
      ],
      shotAlt: 'Plaid beantwortet eine modulübergreifende Abfrage',
    },
    {
      title: 'Aktionen mit Vorschau',
      body: 'Plaid liest nicht nur, er schreibt. Dokumentation erstellen, Projekt-Briefings verfassen, Aufgaben verwalten. Jede Schreiboperation wird vorab angezeigt, bevor sie angewendet wird.',
      bullets: [
        'Dokumente mit Markdown erstellen und bearbeiten',
        'Projekt-Briefings und Zusammenfassungen verfassen',
        'Aufgaben aktualisieren: Status, Zuweisungen, Kommentare',
        'Änderungen vor der Anwendung in der Vorschau sehen',
      ],
      shotAlt: 'Plaid zeigt eine Vorschau von Aufgabenänderungen',
    },
    {
      title: 'MCP, KANAP aus jedem KI-Tool nutzen',
      body: 'KANAP stellt einen vollwertigen MCP-Server (Model Context Protocol) bereit. Binden Sie Claude Desktop, Cursor, Windsurf oder ein beliebiges MCP-kompatibles Tool an, und fragen Sie Ihre IT-Governance-Daten ab, ohne Ihren Workflow zu verlassen.',
      bullets: [
        'Standard-MCP-Protokoll, funktioniert mit jedem kompatiblen Client',
        'Sichere API-Key-Authentifizierung mit feingranularem Scoping',
        'Dieselben Abfragen und Aktionen wie im eingebauten Chat',
        'Bestehende KI-Workflows beibehalten und KANAP-Kontext ergänzen',
      ],
      shotAlt: 'MCP-Konfiguration mit API-Key-Scoping',
    },
    {
      title: 'Volle Kontrolle & Compliance',
      body: 'Plaid respektiert die Regeln Ihrer Organisation. Jede Aktion unterliegt den Berechtigungen des Nutzers. Administratoren haben vollständige Kontrolle darüber, was Plaid darf und was nicht.',
      bullets: [
        'Vollständige Einhaltung der Nutzerrechte bei jeder Abfrage',
        'Sichere API-Keys mit granularem MCP-Scoping',
        'Websuche kann unabhängig aktiviert oder deaktiviert werden',
        'Vorschau und Bestätigung für alle Schreiboperationen',
        'Read-only-Modus für vorsichtige Rollouts',
      ],
      shotAlt: 'Plaid-Admin-Steuerung mit Berechtigungsmatrix',
    },
  ],
  more: {
    title: 'Was Sie Plaid fragen können',
    items: [
      { title: '„Wie steht es um Projekt Atlas?"', body: 'Plaid zieht das Projekt, seine Aufgaben, den Zeitplan, das Team und liefert ein prägnantes Status-Briefing mit Blockern und bevorstehenden Meilensteinen.' },
      { title: '„Liste Anwendungen auf AWS ohne Owner"', body: 'Strukturierte Abfrage über Ihre IT-Landschaft. Gefilterte, sortierte Ergebnisse aus Live-Daten.' },
      { title: '„Entwirf eine Security-Policy für Fernzugriff"', body: 'Plaid erstellt ein neues Dokument in Ihrer Wissensdatenbank, mit korrekten Metadaten und Markdown-Inhalt.' },
      { title: '„Welche Verträge laufen in 90 Tagen aus?"', body: 'Sofortige Antwort mit Lieferantennamen, Beträgen und Verlängerungsdaten. Kein Navigieren durch Dashboards nötig.' },
    ],
  },
  crossLinks: {
    label: 'Andere Module entdecken',
    links: [
      { label: 'Budget-Management', href: '/features/budget' },
      { label: 'IT-Landschaft', href: '/features/it-landscape' },
      { label: 'Portfolio-Management', href: '/features/portfolio' },
      { label: 'Wissen', href: '/features/knowledge' },
    ],
  },
  cta: {
    title: 'KI-gestützte IT-Governance beginnt hier.',
    body: 'Plaid ist in jedem KANAP-Workspace enthalten, mit großzügiger kostenloser Nutzung in Cloud-Plänen. Self-Hosting kostenlos, oder Cloud ab 49 €/Mon.',
    primary: 'Testversion starten',
    secondary: 'Sprechen Sie mit uns',
  },
};

export default content;
