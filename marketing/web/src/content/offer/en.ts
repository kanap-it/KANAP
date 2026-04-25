import type { OfferContent } from './types';

const content: OfferContent = {
  meta: {
    title: 'Pricing',
    description:
      'Free and open source. Self-host without limits, or let us run it from €49/mo. All features on every plan. AGPL v3.',
  },

  header: {
    eyebrow: 'Simple, transparent pricing',
    title: 'Free and open source.\nSelf-host, or let us run it.',
    lead: 'All features on every plan. No feature gates, no per-seat surcharge on features, no lock-in. Pay only for the operations you don\'t want to run yourself.',
  },

  /* -------------------- Self-hosted (primary) -------------------- */
  selfHosted: {
    eyebrow: 'Self-hosted · the first-class citizen',
    title: 'Run KANAP yourself.\nFree, forever.',
    intro:
      'The full platform under AGPL v3. Deploy to your own infrastructure, own your data, update on your cadence. Optional paid support if you want priority help without giving up control.',
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
      'Every cloud plan includes the full platform, hosting, updates, backups, priority support, and a free 60-minute activation session. 14-day trial, no credit card.',
    plans: [
      {
        name: 'Starter',
        badge: 'Get started fast',
        target: 'Up to 5 contributors',
        price: '€49',
        period: '/mo',
        subPrice: 'or €490/yr (2 months free)',
        features: [
          'All features included',
          'Cloud hosting & automatic updates',
          'Unlimited read-only users',
          '500 Plaid messages/mo',
          'Plaid, bring your own key',
          'Free 60-min activation session',
          'Priority email support',
          '20% consulting discount',
        ],
        ctaLabel: 'Start free trial',
        ctaHref: '/trial/start',
        ctaVariant: 'ghost',
      },
      {
        name: 'Standard',
        badge: 'Cross-team governance',
        target: 'Up to 25 contributors',
        price: '€149',
        period: '/mo',
        subPrice: 'or €1,490/yr (2 months free)',
        features: [
          'Everything in Starter',
          '1,500 Plaid messages/mo',
        ],
        ctaLabel: 'Start free trial',
        ctaHref: '/trial/start',
        ctaVariant: 'primary',
        featured: true,
      },
      {
        name: 'Max',
        badge: 'Org-wide rollout',
        target: 'Unlimited contributors',
        price: '€249',
        period: '/mo',
        subPrice: 'or €2,490/yr (2 months free)',
        features: [
          'Everything in Standard',
          '2,500 Plaid messages/mo',
        ],
        ctaLabel: 'Start free trial',
        ctaHref: '/trial/start',
        ctaVariant: 'ghost',
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
        body: 'You want the fastest path to value. We run the infrastructure, you focus on your IT department.',
      },
    ],
  },

  services: {
    title: 'Support and consulting',
    intro: 'Different needs, different services. Subscribers get priority support included and 20% off consulting.',
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
      body: 'Help you get value from KANAP, scheduled calls, deeper work, advisory.',
      items: [
        'Setup, configuration, onboarding, training',
        'Workflow design and best practices',
        'CIO advisory on your IT governance model',
        'Anything that needs a scheduled call',
      ],
    },
  },

  rates: {
    title: 'Consulting rates',
    intro: 'Transparent pricing. Subscribers always get 20% off.',
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
      'Deploy yourself for free, or let us run it from €49/mo with a free 60-minute activation session.',
    primary: 'Start free trial',
    secondary: 'Deploy from GitHub',
  },
};

export default content;
