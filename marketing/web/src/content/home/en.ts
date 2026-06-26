import type { HomeContent } from './types';

const content: HomeContent = {
  meta: {
    title: 'Open-source IT platform with autonomous AI agents',
    description:
      "KANAP holds your IT department's full record, from applications and budgets to projects and documentation. Plaid works it in plain language, and autonomous agents take on the repetitive load. Open source under AGPL v3, self-host free or hosted.",
  },

  hero: {
    eyebrow: 'Open-source · self-hosted · built to extend',
    title: 'Open-source AI agents that take over your repetitive IT work.',
    lead: "KANAP holds your IT department's full picture, from applications and servers to budgets and projects. Plaid lets anyone work with it in plain language, and agents now act on it to take the repetitive load off your team. Open-source and self-hosted.",
    primaryCta: 'Deploy free',
    secondaryCta: 'Try hosted cloud',
    trialNote: 'AGPL v3 · full source on GitHub · Docker install · no feature paywall.',
  },

  pillars: {
    eyebrow: 'Why KANAP',
    title: 'What makes KANAP different.',
    items: [
      {
        title: 'The whole IT department in one system.',
        body: 'Applications, infrastructure, budgets, projects and documentation live in one record instead of ten disconnected tools.',
      },
      {
        title: 'Agents that take work off your team.',
        body: 'Autonomous agents handle the repetitive load and earn more independence as they prove themselves on real tasks.',
      },
      {
        title: 'Open source, self-hosted, yours to extend.',
        body: 'Full source under AGPL v3. Run it on your own servers, and write your own agents and connectors.',
      },
    ],
  },

  layers: {
    eyebrow: 'How it fits together',
    title: 'A complete platform for the IT department.',
    intro:
      'KANAP is built in three layers that work on the same information, so each one makes the others more useful.',
    items: [
      {
        title: 'The record',
        body: 'KANAP holds the full picture of your IT department: applications and infrastructure, budgets, projects and documentation. One place instead of ten tools.',
      },
      {
        title: 'The interaction',
        body: 'Plaid lets anyone on your team work with the record in plain language, asking questions and making changes without learning where everything lives.',
      },
      {
        title: 'The action',
        body: 'Agents act on the same record, picking up repetitive work and carrying it out under the autonomy you grant them.',
      },
    ],
    outro: 'Each part is useful by itself, and they get stronger together.',
  },

  story: [
    {
      title: 'Agents with a real system underneath them.',
      body: `Most agents only see the ticket in front of them. A KANAP agent reads the application a problem affects, who owns it and what it costs, the project it belongs to, and the documentation you wrote about it.
That depth is what makes its answers about your environment instead of guesses, and what makes its work worth trusting.`,
    },
    {
      title: 'Agents that earn their independence.',
      body: `An agent starts supervised. KANAP measures how often it gets things right, and you grant it more autonomy as the track record holds.
Every repetitive task it takes over is one your team stops doing by hand.`,
    },
    {
      title: 'Autonomy you can trust.',
      body: 'An agent acts within limits you set, and you can see and stop what it does at any time. That is what makes it sound to hand an agent real work.',
      bullets: [
        'Every action is recorded in the same audit trail as the rest of KANAP.',
        'Each agent is scoped to the operations you allow, with no raw database or shell access.',
        'Answers cite the records and documents the agent drew from.',
        'You can pause any agent immediately.',
      ],
    },
    {
      title: 'Built to run on your whole stack.',
      body: `One runtime drives the work, kept separate from how it talks to any given tool. A service-desk connector ships first, to prove the model on real tickets.
The same runtime is built to drive monitoring, virtualization, directory services, anything behind a connector. The code is open, so you can write your own.`,
    },
  ],

  modules: {
    eyebrow: 'What it covers',
    title: 'The record your team and your agents work from.',
    intro:
      'KANAP covers what an IT department needs to run, from the first budget line to the last retired application. Your team works across all of it in plain language, and your agents act on the same data.',
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
          'For every role, not just the AI-curious. Ask in plain language, get structured answers across every module. The shortest path between an IT question and the data that answers it.',
        bullets: [
          'Natural-language queries across every module',
          'Document and task actions with preview',
          'MCP server for Claude, Cursor, Windsurf…',
          'Usage included on hosted cloud, or bring your own key',
        ],
        ctaLabel: 'Learn more',
      },
      {
        slug: '/features/agents',
        title: 'Agents',
        blurb:
          'For teams buried in repetitive tickets. An agent reads each task against your IT data and either proposes an action or carries it out, under the autonomy you set. One service-desk connector runs in production today, and the runtime is built to extend.',
        bullets: [
          'Reasons over your real IT record',
          'Starts supervised, earns more autonomy',
          'Every action recorded and reversible',
          'Open runtime, write your own connector',
        ],
        ctaLabel: 'Learn more',
      },
      {
        title: 'Adopt at your pace',
        blurb:
          "Every core module is fully operational on its own. Start where it hurts most, whether that's budget, landscape, portfolio or knowledge, and add the rest when you're ready. The platform pays off more as you adopt more, but you never need the whole thing to get value.",
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
    title: 'One connected system, under your control.',
    intro:
      'The modules work from the same data, which is what gives an IT department real governance. It is also what lets an agent act without putting your environment at risk.',
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
        body: 'Every change tracked. Know who changed what, when, with full before and after history.',
      },
      {
        title: 'Unified task management',
        body: 'Assign tasks across OPEX, CAPEX, contracts, and projects. One backlog across the platform.',
      },
      {
        title: 'Agent activity log',
        body: 'Every agent action recorded in the same audit trail, scoped to what you allowed, and exportable for your SIEM.',
      },
      {
        title: 'SSO via Microsoft Entra ID',
        body: 'Enterprise single sign-on. One login for your entire organisation.',
      },
    ],
  },

  openSource: {
    eyebrow: 'Open source',
    title: 'Open by default.',
    body: `Full source on GitHub under AGPL v3, installed with Docker, with no feature behind a paywall. You can read every line, run it on your own servers, and write your own agents and connectors on top of it.
If KANAP grows, it grows because the people running IT chose to build on it.`,
    bullets: [
      'Full source on GitHub under AGPL v3',
      'Docker install, no feature paywall',
      'Write your own agents and connectors',
      'Bring your own LLM key for Plaid and agents',
    ],
  },

  vision: {
    eyebrow: 'Where this goes',
    title: 'Toward an AI-augmented IT department.',
    body: 'The direction is an IT department where agents quietly carry the repetitive load so your team can spend its time on the work that needs real judgment, all of it running on software you own and can read end to end.',
  },

  cta: {
    title: 'Run your IT department on a system you own.',
    body: 'Deploy KANAP yourself for free, or have us host it. The product and every feature are the same, agents included.',
    primary: 'Deploy free',
    secondary: 'Try hosted cloud',
  },
};

export default content;
