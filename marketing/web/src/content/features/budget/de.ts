import type { FeatureContent } from '../types';

const content: FeatureContent = {
  meta: {
    title: 'Budget-Management',
    description:
      'Mehrjährige IT-Budgetplanung, sechs Verteilungsmethoden, Mehrwährung mit Weltbank-Kursen, Chargeback für die Geschäftsführung. Open Source. Self-Hosting kostenlos oder Cloud ab 49 €/Mon.',
  },
  header: {
    eyebrow: 'Budget-Management',
    title: 'Beherrschen Sie Ihr IT-Budget mit voller Transparenz.',
    lead: 'Mehrjährige Planung, intelligente Kostenverteilung, Chargeback-Berichte für die Geschäftsführung. OPEX und CAPEX über Gesellschaften und Abteilungen hinweg nachverfolgen.',
  },
  sections: [
    {
      title: 'Mehrjährige Budgetplanung',
      body: 'Planen Sie Ihr IT-Budget über mehrere Jahre mit dynamischen Spalten für Budget, Revision, Follow-up und Landing. OPEX und CAPEX in einer einheitlichen Ansicht.',
      bullets: [
        'OPEX- und CAPEX-Tracking in dedizierten Grids',
        'Dynamische Spalten Budget / Revision / Follow-up / Landing pro Jahr',
        'Jahresvergleiche und Trendanalyse',
        'Massenkopien zwischen Budgetjahren',
        'Freeze/Unfreeze-Workflows für die Governance',
      ],
      shotAlt: 'Mehrjähriges Budget-Grid mit dynamischen Spalten',
    },
    {
      title: 'Intelligente Kostenverteilung',
      body: 'Verteilen Sie IT-Kosten über Gesellschaften und Abteilungen mit sechs Verteilungsmethoden. Das System rechnet Allokationen bei geänderten Kennzahlen neu, mit voller Transparenz und Audit-Trail.',
      bullets: [
        'Verteilung nach Mitarbeiterzahl',
        'Verteilung nach IT-Nutzerzahl',
        'Umsatzgewichtete Verteilung',
        'Manuelle Aufteilung nach Gesellschaft und Abteilung',
        'Proportional zur Mitarbeiterzahl als Default',
      ],
      shotAlt: 'Allokations-Editor mit sechs Methoden',
    },
    {
      title: 'Mehrwährung mit Live-Kursen',
      body: 'Arbeiten Sie in mehreren Währungen und konsolidieren Sie in einer kanonischen Berichtswährung. KANAP ruft Live-Kurse von der World Bank API ab und friert sie beim Sperren einer Budgetversion ein.',
      bullets: [
        'Einheitliche Berichtswährung für alle Aggregate',
        'Automatische FX-Kurse von der World Bank',
        'Eingefrorene Kurs-Snapshots beim Budget-Freeze',
        'Konfigurierbare Liste erlaubter Währungen',
        'Historische Kurse für vergangene Geschäftsjahre',
      ],
      shotAlt: 'Währungseinstellungen mit Weltbank-Kursen',
    },
    {
      title: 'Chargeback-Berichte für die Geschäftsführung',
      body: 'Erstellen Sie vorstandsreife Chargeback-Berichte mit Kostenverteilung nach Gesellschaft und Abteilung. Drill-Down vom Gesamtbetrag einer Gesellschaft bis zum einzelnen Kostenposten, mit voller Transparenz über die verwendeten Allokationsmethoden.',
      bullets: [
        'Globaler Chargeback-Bericht nach Gesellschaft',
        'Berichte je Gesellschaft nach Abteilung',
        'Detaillierter Allokations-Breakdown',
        'KPIs und Anteil am Gesamten',
        'CSV-Export und Diagramm-Downloads',
      ],
      shotAlt: 'Chargeback-Bericht mit Drill-Down',
    },
  ],
  more: {
    title: 'Mehr in Budget',
    items: [
      { title: 'Aufgabenverwaltung', body: 'Follow-up-Aufgaben an OPEX- und CAPEX-Posten hängen. Fälligkeiten und Fortschritt verfolgen.' },
      { title: 'Vertragsverknüpfung', body: 'Ausgabeposten an Verträge koppeln. Verlängerungs- und Kündigungsfristen im Blick.' },
      { title: 'Kontenrahmen', body: 'Kosten auf Ihre Buchhaltungsstruktur mappen. Landesspezifische und globale CoAs.' },
      { title: 'Datenhygiene', body: 'Dashboard-Chips markieren fehlende Owner, zahlende Gesellschaften und CoA-Inkonsistenzen.' },
    ],
  },
  crossLinks: {
    label: 'Andere Module entdecken',
    links: [
      { label: 'IT-Landschaft', href: '/features/it-landscape' },
      { label: 'Portfolio-Management', href: '/features/portfolio' },
      { label: 'Wissen', href: '/features/knowledge' },
    ],
  },
  cta: {
    title: 'Bereit, Ihr IT-Budget in den Griff zu bekommen?',
    body: 'Starten Sie kostenlos mit Self-Hosting oder testen Sie die Cloud ab 49 €/Mon. Alle Funktionen in jedem Plan.',
    primary: 'Testversion starten',
    secondary: 'Sprechen Sie mit uns',
  },
};

export default content;
