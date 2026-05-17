import type { FaqContent } from './types';

const content: FaqContent = {
  meta: {
    title: 'FAQ',
    description: 'Common questions about KANAP pricing, licensing, self-hosting, hosted cloud, Plaid, support and billing.',
  },
  header: {
    eyebrow: 'FAQ',
    title: 'Common questions.',
    lead: 'Everything you need to know about KANAP, licensing, pricing, hosting, and Plaid. If you don\'t find your answer, write to us.',
  },
  groups: [
    {
      label: 'Licensing & open source',
      items: [
        {
          q: 'What license is KANAP under?',
          a: 'KANAP is licensed under <a href="https://www.gnu.org/licenses/agpl-3.0.html" rel="noopener" target="_blank">AGPL v3</a>, a widely recognised open source license approved by the OSI. You can freely use, modify and distribute the software. The AGPL copyleft clause ensures that anyone running a modified version as a service must share their changes. This protects the community and keeps KANAP genuinely open.',
        },
        {
          q: 'Can I use KANAP commercially?',
          a: 'Yes. Internal use, commercial use, external SaaS, all allowed. The copyleft provision only requires you to share modifications if you run a modified version as a network service. Pure internal use does not trigger any obligation.',
        },
        {
          q: 'Can I contribute to KANAP?',
          a: 'Yes, please. The full source is on <a href="https://github.com/kanap-it/kanap" rel="noopener" target="_blank">GitHub</a>. Issues, pull requests and discussions are all welcome. See CONTRIBUTING.md for the guidelines.',
        },
      ],
    },
    {
      label: 'Cloud & trial',
      items: [
        {
          q: 'How does the free trial work?',
          a: 'Hosted KANAP starts with a 14-day free trial. No credit card required. Full access to all features, plus one free 60-minute activation session per company if booked during the trial.',
        },
        {
          q: 'What happens after my trial?',
          a: 'After your 14-day trial you must choose a paid plan to continue. Your tenant remains available for 30 more days with limited access. After this 30-day period your tenant is deleted.',
        },
        {
          q: 'What is the free activation session?',
          a: 'Each trial includes one free 60-minute activation session per company. After subscription we email you to book the call. The session is a video call focused on first-value milestones based on your main objectives.',
        },
        {
          q: 'What is the difference between cloud and self-hosted?',
          a: 'Cloud hosting means we run everything for you: hosting, updates, backups, infrastructure and priority support. Self-hosted means you run KANAP on your own servers. The full product is free to self-host; you can purchase Self-Hosted Support if you want priority help while keeping control of your infrastructure.',
        },
      ],
    },
    {
      label: 'Self-hosting & support',
      items: [
        {
          q: 'What is Self-Hosted Support?',
          a: 'Self-Hosted Support is a professional support add-on for self-hosted installations. It includes priority email support, install and upgrade troubleshooting, and a 20% discount on consulting services. Priced at €2,490/yr.',
        },
        {
          q: 'How does priority support work?',
          a: 'For paying subscribers, email us about operational issues. We aim to respond within 24h and fix your problem. It\'s best-effort, no SLA, but we\'re real humans who read and respond to every message.',
        },
      ],
    },
    {
      label: 'Billing',
      items: [
        {
          q: 'Can I pay by invoice?',
          a: 'Invoice payment (bank transfer) is available for annual subscriptions above €1,000 for EUR customers. Today that means Self-Hosted Support and Hosted KANAP annual subscriptions. Invoices are NET30.',
        },
        {
          q: 'Can I switch between self-hosted and hosted?',
          a: 'Yes. KANAP is the same product in both modes. Contact us if you want to move from self-hosted to hosted, or if you need an export to operate the platform yourself.',
        },
        {
          q: 'Can I cancel my subscription?',
          a: 'Of course. Cancel from your Billing Center at any time, your subscription stays active until the end of the current billing period, no questions asked.',
        },
      ],
    },
    {
      label: 'Plaid (AI assistant)',
      items: [
        {
          q: 'What\'s the difference between included Plaid messages and Bring Your Own Key?',
          a: 'Hosted KANAP includes a generous number of Plaid messages, powered by a mid-range model we\'ve carefully selected and tested with KANAP. For even more capable responses, the Bring Your Own Key option lets you connect state-of-the-art models from OpenAI, Anthropic, or any compatible provider. BYOK also gives you full control over how your data is processed, and removes any message limit.',
        },
        {
          q: 'How can I control Plaid?',
          a: 'At platform level, Plaid can be fully disabled, enabled in read-only mode, or enabled in read-write mode (with preview and confirmation for all changes). Web search and MCP can be enabled or disabled separately. At user level, you control who has access to which Plaid feature through role-based permissions. RBAC is always enforced, Plaid never sees more than the user is allowed to.',
        },
      ],
    },
  ],
  cta: {
    title: 'Still have questions?',
    body: 'Write to us, we read every message.',
    primary: 'Contact us',
    secondary: 'Start free trial',
  },
};

export default content;
