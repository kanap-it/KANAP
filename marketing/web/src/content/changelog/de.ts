import type { ChangelogContent } from './types';

const content: ChangelogContent = {
  meta: {
    title: 'Changelog',
    description:
      'Wichtige Änderungen an KANAP. Neue Funktionen, Verbesserungen und Fixes, sobald sie ausgeliefert werden. Self-Hosting-Nutzer folgen derselben Timeline.',
  },
  header: {
    eyebrow: 'Changelog',
    title: 'Was ist neu in KANAP.',
    lead:
      'Highlights aus den Releases. Für das vollständige technische Log folgen Sie dem GitHub-Repository.',
  },
  subscribe: {
    label: 'Am Ball bleiben',
    body: 'Neue Releases erscheinen regelmäßig. Starren Sie das Repository oder beobachten Sie die Releases auf GitHub, um auf dem Laufenden zu bleiben.',
    githubCta: 'Releases auf GitHub beobachten',
    githubHref: 'https://github.com/kanap-it/kanap/releases',
  },
  entries: [
    {
      date: '2026-04-24',
      title: 'Neue Marketing-Site.',
      summary:
        'Die Marketing-Site wurde komplett überarbeitet und an die neue Optik der KANAP-App angepasst. Open Source ist jetzt die Leitlinie, Self-Hosting ein First-Class-Bürger.',
      sections: [
        {
          label: 'Ausgeliefert',
          items: [
            'Vollständige visuelle Auffrischung, Teal + neutrale Palette, Dark Mode verpflichtend, Linear-artige Dichte',
            'Eigene Deep-Dive-Seite für Self-Hosting / On-Premise',
            'Neue Changelog- und Security-Seiten',
            'Astro-5 Static Build, saubere URLs, saubere i18n-Routen',
            'Mehrsprachig von Tag eins: Englisch, Französisch, Deutsch, Spanisch',
          ],
        },
      ],
    },
    {
      date: '2026-04-01',
      title: 'App-weite Design-Auffrischung.',
      summary:
        'Die KANAP-App wurde entlang einer „refined density"-Charta neu gestaltet: nur Inter 400/500, Teal für interaktive Elemente, Neutral für alles andere, Dark Mode verpflichtend auf jeder Oberfläche.',
      sections: [
        {
          label: 'Geändert',
          items: [
            'Einheitliche Design-Tokens unter `kanapPalette` mit Light- und Dark-Modus',
            'PropertyRow-/PropertyGroup-Primitives ersetzen jede MUI-FormControl-Nutzung',
            'Workspace-Seiten (Aufgaben, Projekte, Anfragen) folgen einem gemeinsamen Detail-Layout',
            'Eigene AG-Grid-Overrides schützen Zelltext vor auslaufendem Teal',
            'Auto-Save für alle Inline-Edits; explizite Submits nur noch für Anlagen und Composer',
          ],
        },
      ],
    },
  ],
};

export default content;
