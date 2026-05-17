import type { OfferContent } from './types';

const content: OfferContent = {
  meta: {
    title: 'Pricing',
    description:
      'Free and open source. Self-host without limits, add support when you need it, or choose hosted KANAP. All features on every plan. AGPL v3.',
  },

  header: {
    eyebrow: 'Simple, transparent pricing',
    title: 'Free and open source.\nSelf-host, or let us run it.',
    lead: 'All features on every plan. No feature gates, no seat tax, no lock-in. Pay only for the operations and support you don\'t want to run yourself.',
  },

  /* -------------------- Self-hosted (primary) -------------------- */
  selfHosted: {
    eyebrow: 'Choose your path',
    title: 'Same product.\nThree ways to run it.',
    intro:
      'Start with the full open source platform, add priority support if you want help, or choose hosted KANAP if you want us to operate it.',
    plans: [
      {
        name: 'Self-host',
        badge: 'Free forever',
        target: 'Unlimited users · unlimited workspaces',
        price: '€0',
        period: '',
        features: [
          'All features included',
          'Unlimited contributors',
          'Community support via GitHub issues',
          'Licensed under AGPL v3: read, modify, contribute',
          'Deploy with Docker Compose in minutes',
          'Your data stays on your infrastructure',
        ],
        ctaLabel: 'Deploy from GitHub',
        ctaHref: 'https://github.com/kanap-it/kanap',
        ctaVariant: 'primary',
        featured: true,
      },
      {
        name: 'Self-hosted support',
        badge: 'For compliance & control',
        target: 'Unlimited users · unlimited workspaces',
        price: '€2,490',
        period: '/yr',
        features: [
          'Everything in self-host',
          'Priority email support',
          '20% consulting discount',
          'Plaid, bring your own key',
          'Install troubleshooting',
          'Annual billing only',
        ],
        ctaLabel: 'Subscribe',
        ctaHref: '/contact',
        ctaVariant: 'ghost',
      },
    ],
  },

  openSourceBanner: {
    title: 'Truly open source, AGPL v3',
    body:
      'KANAP\'s full source code is on GitHub. Read it, audit it, extend it, contribute back. AGPL v3 ensures the code stays open, for everyone. No proprietary forks, no lock-in.',
    linkLabel: 'Read the license',
    linkHref: 'https://www.gnu.org/licenses/agpl-3.0.html',
  },

  /* -------------------- Cloud hosted (secondary) -------------------- */
  cloud: {
    eyebrow: 'Cloud hosted · if you\'d rather we run it',
    title: 'Same platform, operated by us.',
    intro:
      'Hosted KANAP is the same open source platform, operated by us: hosting, updates, backups, priority support, and a free 60-minute activation session. 14-day trial, no credit card.',
    plans: [
      {
        name: 'Hosted KANAP',
        badge: 'Managed by us',
        target: 'Unlimited users · unlimited workspaces',
        price: '€249',
        period: '/mo',
        subPrice: 'or €2,490/yr (2 months free)',
        features: [
          'All features included',
          'Unlimited contributors and read-only users',
          'Cloud hosting and automatic updates',
          'Managed backups',
          '2,500 Plaid messages/mo included',
          'Plaid, bring your own key',
          'Free 60-min activation session',
          'Priority email support',
          '20% consulting discount',
        ],
        ctaLabel: 'Start free trial',
        ctaHref: '/trial/start',
        ctaVariant: 'primary',
        featured: true,
      },
    ],
  },

  howToChoose: {
    title: 'How to choose',
    intro: 'Choose based on who runs the operations. All plans include every product feature.',
    items: [
      {
        title: 'Self-host · free',
        body: 'You have IT capacity and want full control. The best value, no strings attached. Community support.',
      },
      {
        title: 'Self-host · with support',
        body: 'You need the self-hosted deployment model for compliance or privacy but want priority support and consulting discounts.',
      },
      {
        title: 'Cloud hosted',
        body: 'You want the fastest path to value without running infrastructure. Same product, operated by KANAP.',
      },
    ],
  },

  services: {
    title: 'Expert help, when you want it',
    intro: 'KANAP is built for self-service adoption. If you want to go faster, paid plans include priority support and 20% off consulting.',
    support: {
      title: 'Priority support',
      subtitle: 'Included with any paid plan',
      body: 'Keep it running smoothly. Real humans, reasonable response times, no SLA theatre.',
      items: [
        'Bugs, errors, outages, access issues',
        'On-prem installation troubleshooting',
        '"Is this expected behaviour?" questions',
        'Quick clarifications',
      ],
    },
    consulting: {
      title: 'Consulting',
      subtitle: 'Paid · subscribers get 20% off',
      body: 'Optional help to get more value from KANAP: scheduled calls, deeper work, advisory.',
      items: [
        'Setup, configuration, onboarding, training',
        'Workflow design and best practices',
        'CIO advisory on your IT governance model',
        'Anything that needs a scheduled call',
      ],
    },
  },

  rates: {
    title: 'Optional consulting rates',
    intro: 'Transparent pricing for teams that want expert help. Subscribers always get 20% off.',
    headings: {
      duration: 'Duration',
      useCases: 'Use cases',
      rate: 'Rate',
      subscriber: 'Subscriber',
    },
    rows: [
      {
        duration: '1 hour',
        useCases: 'Troubleshooting, specific questions, quick advice',
        rate: '€190',
        subscriber: '€150',
      },
      {
        duration: 'Half day (4h)',
        useCases: 'Onboarding, training, configuration workshop',
        rate: '€690',
        subscriber: '€550',
      },
      {
        duration: 'Full day (8h)',
        useCases: 'Large team training, in-depth consulting, CIO advisory',
        rate: '€1,250',
        subscriber: '€1,000',
      },
    ],
    note: 'Rates are per session and exclusive of VAT. Travel costs billed separately if on-site is required.',
  },

  faqTeaser: {
    title: 'Common questions',
    body: 'Licensing, self-hosting, cloud, Plaid, support and billing. All answered.',
    ctaLabel: 'Read the FAQ',
  },

  cta: {
    title: 'Ready to get started?',
    body:
      'Deploy KANAP yourself for free, or try the hosted version if you want us to operate it.',
    primary: 'Deploy free',
    secondary: 'Try hosted cloud',
  },
};

export default content;
