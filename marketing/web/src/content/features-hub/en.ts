import type { FeaturesHubContent } from '../features/types';

const content: FeaturesHubContent = {
  meta: {
    title: 'Features',
    description:
      'Five integrated modules: budget, IT landscape, portfolio, knowledge, AI assistant. Enterprise-ready with RBAC, audit, SSO, multi-tenant. Open source under AGPL v3.',
  },
  header: {
    eyebrow: 'The complete IT toolbox',
    title: 'Five integrated modules.\nOne source of truth.',
    lead: 'KANAP covers the core territory every IT department needs, from the first budget line to the last retired application, with an AI assistant that reads across all of it.',
  },
  modules: [
    {
      slug: '/features/budget',
      eyebrow: 'Module 1',
      title: 'Budget management',
      body: 'Master your IT budget with multi-year planning, intelligent allocation and executive chargeback reports. Track OPEX and CAPEX with complete visibility across companies and departments.',
      bullets: [
        'Multi-year budget planning with dynamic columns',
        'Six allocation methods including headcount and turnover',
        'Multi-currency support with automatic FX rates',
        'Executive chargeback reports by company and department',
        'Freeze / unfreeze workflows for governance',
      ],
      ctaLabel: 'Explore budget management',
      shotAlt: 'Budget grid with OPEX and CAPEX',
    },
    {
      slug: '/features/it-landscape',
      eyebrow: 'Module 2',
      title: 'IT landscape',
      body: 'Document your entire information system: applications, interfaces and infrastructure. Visualise your architecture with interactive maps and track application lifecycles from proposal to retirement.',
      bullets: [
        'Application portfolio with per-environment instances',
        'Interface documentation with 3-leg middleware support',
        'Server and infrastructure registry',
        'Interactive Interface Map and Connection Map',
        'Version lineage tracking for evolution',
      ],
      ctaLabel: 'Explore IT landscape',
      shotAlt: 'Interface map with application nodes',
    },
    {
      slug: '/features/portfolio',
      eyebrow: 'Module 3',
      title: 'Portfolio management',
      body: 'From request to delivery: prioritise demand, simulate feasible delivery plans and apply roadmap dates with confidence. Make data-driven decisions about what to build and when.',
      bullets: [
        'Configurable request scoring with weighted criteria',
        'Request-to-project conversion workflow',
        'Automatic roadmap generation from effort, dependencies, capacity',
        'Bottleneck and occupation analysis',
        'Selective transactional apply of generated dates',
        'Baseline capture for variance analysis',
      ],
      ctaLabel: 'Explore portfolio management',
      shotAlt: 'Roadmap with capacity heatmap',
    },
    {
      slug: '/features/knowledge',
      eyebrow: 'Module 4',
      title: 'Knowledge',
      body: 'Govern your IT documentation with a markdown editor, structured libraries and review workflows. Link documents to applications, assets, projects, requests and tasks for full traceability.',
      bullets: [
        'Markdown editor with edit locks and autosave',
        'Libraries, folders and document types',
        'Review and approval workflows',
        'Version history with revert',
        'Export to PDF, DOCX, ODT',
        'Deep integration with apps, assets, projects, tasks',
      ],
      ctaLabel: 'Explore knowledge',
      shotAlt: 'Library tree with document types',
    },
    {
      slug: '/features/ai',
      eyebrow: 'AI assistant',
      title: 'Meet Plaid',
      body: 'Ask anything about your IT data in plain language. Plaid searches across all modules, creates documents, manages tasks, all while respecting your permissions.',
      bullets: [
        'Natural language queries across all modules',
        'Document creation and task updates from chat',
        'MCP server for any AI tool',
        'Bring your own API key, OpenAI, Anthropic, Ollama, custom',
        'Full tenant isolation and RBAC enforcement',
      ],
      ctaLabel: 'Explore Plaid',
      shotAlt: 'Plaid chat with cross-module query',
    },
  ],
  crossCutting: {
    eyebrow: 'Enterprise ready',
    title: 'Everything connected. Always under control.',
    intro: 'Five modules working from the same data, with the governance layer IT departments actually need.',
    items: [
      { title: 'Reporting & dashboards', body: 'Executive-ready reports, trend analysis and KPI dashboards.' },
      { title: 'Role-based access', body: 'Fine-grained permissions per module. Reader, manager, admin levels.' },
      { title: 'Rich interconnections', body: 'Link costs to apps, apps to projects, projects to budgets, knowledge to everything.' },
      { title: 'Complete audit trail', body: 'Every change tracked with full before / after history.' },
      { title: 'Unified task management', body: 'Assign tasks across OPEX, CAPEX, contracts. Track due dates and progress.' },
      { title: 'Multi-tenant architecture', body: 'Secure tenant isolation with row-level security.' },
      { title: 'SSO via Microsoft Entra ID', body: 'Enterprise single sign-on integration.' },
      { title: 'Open source under AGPL v3', body: 'True open source. Inspect it, self-host it, contribute to it.' },
    ],
  },
  cta: {
    title: 'Ready to bring clarity to your IT department?',
    body: 'Start free with self-hosting, or try the cloud from €49/mo. All features on every plan.',
    primary: 'Start free trial',
    secondary: 'Talk to us',
  },
};

export default content;
