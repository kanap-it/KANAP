import type { ChangelogContent } from './types';

const content: ChangelogContent = {
  meta: {
    title: 'Changelog',
    description:
      'Notable changes to KANAP. New features, improvements, and fixes as they ship. Self-hosted users track the same timeline.',
  },
  header: {
    eyebrow: 'Changelog',
    title: 'What\'s new in KANAP.',
    lead: 'Highlights of what ships between releases. For the full technical log, follow the GitHub repository.',
  },
  subscribe: {
    label: 'Follow along',
    body: 'New releases land regularly. Star the repository or watch releases on GitHub to stay current.',
    githubCta: 'Watch releases on GitHub',
    githubHref: 'https://github.com/kanap-it/kanap/releases',
  },
  entries: [
    {
      date: '2026-04-24',
      title: 'New marketing site.',
      summary:
        'The marketing site has been fully redesigned to match the new KANAP app aesthetic. Open source is now the lead story, with self-hosting as the first-class citizen.',
      sections: [
        {
          label: 'Shipping',
          items: [
            'Full visual refresh, teal + neutral palette, mandatory dark mode, Linear-grade density',
            'Self-host / on-premise page as a dedicated deep dive',
            'New changelog and security pages',
            'Astro 5 static build, clean URLs, proper i18n routing',
            'Multilingual from day one: English, French, German, Spanish',
          ],
        },
      ],
    },
    {
      date: '2026-04-01',
      title: 'App-wide design refresh.',
      summary:
        'The KANAP application has been redesigned around a "refined density" charter: Inter 400/500 only, teal for interactive elements, neutral everything else, mandatory dark mode across every surface.',
      sections: [
        {
          label: 'Changed',
          items: [
            'Unified design tokens under `kanapPalette` with light + dark modes',
            'PropertyRow / PropertyGroup primitives replace all MUI FormControl usage',
            'Workspace pages (tasks, projects, requests) follow a shared detail layout',
            'AG Grid custom overrides protect cell text from teal leaking',
            'Auto-save on all in-place edits; explicit submits reserved for creates and composers',
          ],
        },
      ],
    },
  ],
};

export default content;
