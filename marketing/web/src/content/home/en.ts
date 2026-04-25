import type { HomeContent } from './types';

const content: HomeContent = {
  meta: {
    title: 'The open source IT governance platform',
    description:
      'Budget, enterprise architecture, portfolio and knowledge in one AI-powered platform. Built by a CIO. Open source under AGPL v3. Self-host free or cloud from €49/mo.',
  },

  hero: {
    eyebrow: 'Bring clarity to your IT department',
    title: 'The open source IT governance platform.',
    lead: 'Budget, architecture, portfolio and knowledge in one platform, with Plaid, the built-in AI assistant. Self-host it, or let us run it.',
    primaryCta: 'Start free trial',
    secondaryCta: 'Explore features',
    trialNote: '14-day trial · no credit card · free activation session.',
  },

  pillars: {
    eyebrow: 'Why KANAP',
    title: 'Built different.\nPriced fairly.',
    items: [
      {
        title: 'Practitioner-built',
        body: 'Designed by a seasoned IT veteran with real experience across industries. It solves actual IT department problems. Fits any sector.',
      },
      {
        title: 'Simple & powerful',
        body: 'Zero complexity theatre. Powerful enough to solve hard problems. Simple enough for your team to adopt today.',
      },
      {
        title: 'Truly open source',
        body: 'AGPL v3. Full source on GitHub. Free to self-host, open to contributions. No vendor lock-in, no bait-and-switch. If we vanish tomorrow, your platform stays yours.',
      },
    ],
  },

  modules: {
    eyebrow: 'Complete IT toolbox',
    title: 'Five integrated modules.\nOne source of truth.',
    intro:
      'KANAP covers the core territory every IT department needs to run, from the first budget line to the last retired application, with an AI assistant that reads across all of it.',
    items: [
      {
        slug: '/features/budget',
        title: 'Budget management',
        blurb:
          'Master IT budget with multi-year planning, intelligent allocations, and executive chargeback reports. Track OPEX and CAPEX with full visibility.',
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
          'Document your information system: applications, interfaces, infrastructure. Visualise your architecture with interactive maps.',
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
          'From request to delivery: score demand, generate capacity-aware roadmaps, apply project dates with confidence.',
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
          'Govern IT documentation with a markdown editor, structured libraries, and review workflows. Link documents to everything.',
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
          'Ask Plaid anything about your data. Create documents, update tasks, connect your existing AI tools via MCP.',
        bullets: [
          'Natural-language queries across every module',
          'Document and task actions with preview',
          'MCP server for Claude, Cursor, Windsurf…',
          'Free usage included on cloud plans, or bring your own key',
        ],
        ctaLabel: 'Learn more',
      },
    ],
  },

  crossCutting: {
    eyebrow: 'Enterprise ready',
    title: 'Everything connected.\nAlways under control.',
    intro:
      'Five modules working from the same data, with the governance layer IT departments actually need.',
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
        title: 'Full relations',
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
        title: 'Multi-tenant with RLS',
        body: 'Row-level security isolates every tenant. Your data stays yours.',
      },
      {
        title: 'SSO via Microsoft Entra ID',
        body: 'Enterprise single sign-on. One login for your entire organisation.',
      },
      {
        title: 'Open by design',
        body: 'MCP server, public API, CSV import/export. No walled garden.',
      },
    ],
  },

  cta: {
    title: 'Ready to bring clarity to your IT department?',
    body:
      'Start free with self-hosting, or try the cloud from €49/mo. All features on every plan. No lock-in.',
    primary: 'Start free trial',
    secondary: 'Talk to us',
  },
};

export default content;
