import type { HomeContent } from './types';

const content: HomeContent = {
  meta: {
    title: 'The open source IT governance platform',
    description:
      'Budget, enterprise architecture, portfolio and knowledge in one AI-powered platform. Built by a CIO. Open source under AGPL v3. Self-host free or choose hosted KANAP.',
  },

  hero: {
    eyebrow: 'Bring clarity to your IT department',
    title: 'The open source IT governance platform.',
    lead: 'Budget, architecture, portfolio and knowledge in one platform, with Plaid, the built-in AI assistant.\nSelf-host it for free, or let us run it for you.',
    primaryCta: 'Deploy free',
    secondaryCta: 'Try hosted cloud',
    trialNote: 'AGPL v3 · full source on GitHub · Docker install · no feature paywall.',
  },

  pillars: {
    eyebrow: 'Why KANAP',
    title: 'Built different.',
    items: [
      {
        title: 'Practitioner-built',
        body: 'Designed by a seasoned IT veteran with real experience across industries. It solves actual IT department problems, not generic collaboration problems.',
      },
      {
        title: 'Simple & powerful',
        body: 'Zero complexity theatre. Powerful enough to solve hard problems. Simple enough for your team to adopt today.',
      },
      {
        title: 'Truly open source',
        body: 'AGPL v3. Full source on GitHub. Free to self-host, open to contributions. No vendor lock-in, no feature paywall, no freemium trap.',
      },
    ],
  },

  modules: {
    eyebrow: 'Complete IT toolbox',
    title: 'Built for every IT role.\nUse the whole platform, or one tile at a time.',
    intro:
      'KANAP covers the core territory every IT department needs to run, from the first budget line to the last retired application, with an AI assistant that reads across all of it.',
    items: [
      {
        slug: '/features/budget',
        title: 'Budget management',
        blurb:
          'For CIOs and finance partners. Multi-year planning, intelligent allocations, executive-ready chargeback. Defend the IT budget with the numbers your CFO will trust.',
        bullets: [
          'Multi-year budget planning',
          'Six allocation methods',
          'Multi-currency with World Bank FX',
          'Executive chargeback reports',
        ],
        ctaLabel: 'Learn more',
      },
      {
        slug: '/features/it-landscape',
        title: 'IT landscape',
        blurb:
          'For architects, application owners and infrastructure teams. Document apps, interfaces and servers. See the system at a glance, plan changes with the dependencies in front of you.',
        bullets: [
          'Application portfolio with per-environment instances',
          'Interface documentation with 3-leg middleware',
          'Server and infrastructure registry',
          'Interactive interface and connection maps',
        ],
        ctaLabel: 'Learn more',
      },
      {
        slug: '/features/portfolio',
        title: 'Portfolio management',
        blurb:
          'For project managers and IT leads. Score the demand, simulate capacity-aware roadmaps, commit dates without crossing your fingers.',
        bullets: [
          'Request scoring with weighted criteria',
          'Automatic roadmap scheduling',
          'Bottleneck and occupation analysis',
          'Project lifecycle tracking',
        ],
        ctaLabel: 'Learn more',
      },
      {
        slug: '/features/knowledge',
        title: 'Knowledge',
        blurb:
          'For everyone, especially support and operations. Markdown editor, libraries, review workflows. Runbooks, decisions and architecture notes connected to the apps and projects they describe.',
        bullets: [
          'Markdown editor with review workflows',
          'Libraries, folders, document types',
          'Version history and export to PDF, DOCX, ODT',
          'Deep links to apps, projects, assets, tasks',
        ],
        ctaLabel: 'Learn more',
      },
      {
        slug: '/features/ai',
        title: 'Plaid, AI assistant',
        blurb:
          'For every role, not just the AI-curious. Ask in plain language; get structured answers across every module. The shortest path between an IT question and the data that answers it.',
        bullets: [
          'Natural-language queries across every module',
          'Document and task actions with preview',
          'MCP server for Claude, Cursor, Windsurf…',
          'Usage included on hosted cloud, or bring your own key',
        ],
        ctaLabel: 'Learn more',
      },
      {
        title: 'Adopt at your pace',
        blurb:
          'Every core module is fully operational on its own. Start where it hurts most — budget, landscape, portfolio, knowledge — and add the rest when you\'re ready. The platform pays off more as you adopt more, but you never need all five to get value.',
        bullets: [
          'Each module fully usable standalone',
          'No forced sequence or full-platform migration',
          'Cross-module value compounds as you adopt',
          'Replace one tool today, consolidate when ready',
        ],
      },
    ],
  },

  crossCutting: {
    eyebrow: 'Enterprise ready',
    title: 'Everything connected.\nAlways under control.',
    intro:
      'Five modules working from the same data, creating the governance layer IT departments actually need.',
    items: [
      {
        title: 'Reporting & dashboards',
        body: 'Executive-ready dashboards, trend analysis, exports to CSV and PNG.',
      },
      {
        title: 'Role-based access',
        body: 'Fine-grained permissions per module. Reader, manager, admin levels.',
      },
      {
        title: 'Rich relations',
        body: 'Link costs to apps, apps to projects, projects to budgets, knowledge to everything.',
      },
      {
        title: 'Complete audit trail',
        body: 'Every change tracked. Know who changed what, when, with full before/after history.',
      },
      {
        title: 'Unified task management',
        body: 'Assign tasks across OPEX, CAPEX, contracts, and projects. One backlog across the platform.',
      },
      {
        title: 'SSO via Microsoft Entra ID',
        body: 'Enterprise single sign-on. One login for your entire organisation.',
      },
    ],
  },

  cta: {
    title: 'Ready to run IT from one open source system?',
    body:
      'Deploy KANAP yourself for free, or try the hosted version if you want us to operate it.\nSame product. Same features. Your choice.',
    primary: 'Deploy free',
    secondary: 'Try hosted cloud',
  },
};

export default content;
