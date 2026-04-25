import type { SecurityContent } from './types';

const content: SecurityContent = {
  meta: {
    title: 'Security',
    description:
      'How KANAP protects your data: row-level security, encryption, RBAC, audit trail, SSO, and open source transparency. Self-host or cloud.',
  },
  header: {
    eyebrow: 'Security',
    title: 'Security that respects your data.',
    lead: 'Governance-grade controls from day one. The same platform runs on our cloud and on your own servers, with the same isolation, encryption, and auditability.',
  },
  overview: {
    title: 'Principles',
    intro:
      'KANAP is designed for IT departments that handle sensitive data. We treat your data the way we want IT vendors to treat ours, transparent, isolated, and within reach when you need it.',
    pillars: [
      {
        title: 'Transparent by default',
        body: 'The full source is on GitHub under AGPL v3. Your security team reads it, audits it, or forks it. Nothing is hidden behind proprietary binaries.',
      },
      {
        title: 'Isolated by design',
        body: 'Row-level security at the database level enforces tenant isolation on every query. There is no cross-tenant shortcut to bypass, because there is no shortcut at all.',
      },
      {
        title: 'Exportable, always',
        body: 'Your data is yours. CSV export on every grid, document export to PDF, DOCX, ODT, full tenant export on request. No extraction tax.',
      },
    ],
  },
  tenancy: {
    title: 'Tenant isolation',
    body:
      'KANAP is multi-tenant at the database level. Every row in every shared table carries a `tenant_id`, and PostgreSQL Row-Level Security policies enforce the filter on every read and write. The policy is part of the schema, not the application, a rogue query cannot bypass it.',
    bullets: [
      'PostgreSQL RLS policies on every shared table',
      '`tenant_id` filtering enforced at the database level, not just in the app',
      'Per-tenant connection pools with session variables setting the current tenant',
      'Batch operations use `tenant_id = ANY($1)`, never N+1 leakage',
      'Multi-tenant regression tests on every CI run',
    ],
  },
  dataProtection: {
    title: 'Data protection',
    body:
      'Standard practices, applied rigorously. Encryption in transit and at rest, hashed passwords, sensitive data minimisation.',
    bullets: [
      'TLS everywhere, no plaintext between any component',
      'Argon2 password hashing with per-user salts',
      'Secrets stored via environment, not checked into source',
      'Cloud deployments use encrypted persistent volumes',
      'API keys (Plaid BYOK, MCP tokens) encrypted at rest',
      'No plaintext credentials in logs; structured logs with redaction rules',
    ],
  },
  access: {
    title: 'Access control',
    body:
      'Fine-grained permissions per module, per role. Every feature gate and every entity query honours the same RBAC matrix, including Plaid and MCP.',
    bullets: [
      'Reader / manager / admin levels per module',
      'Workspace-level admin role separate from module admins',
      'SSO via Microsoft Entra ID (OIDC) on both cloud and self-hosted',
      'Local password authentication with Argon2 + optional password reset flows',
      'Plaid and MCP enforce the same RBAC as the UI, no privilege escalation',
      'API tokens scoped to individual users, revocable at any time',
    ],
  },
  audit: {
    title: 'Audit trail',
    body:
      'Every meaningful change is recorded. Who changed what, when, with full before/after snapshots. Activity visible in the app and queryable via export.',
    bullets: [
      'Per-entity activity timeline (tasks, projects, documents, etc.)',
      'User actions logged with timestamps and IP metadata',
      'Login and admin actions surfaced in a separate audit feed',
      'Exportable to CSV for SIEM ingestion',
      'Immutable append-only structure, rows are added, never rewritten',
    ],
  },
  deployment: {
    title: 'Deployment & operations',
    body:
      'Cloud deployments run on hardened Linux hosts inside the EU. Self-hosted deployments run wherever you choose. Both ship with the same security model.',
    bullets: [
      'EU-only infrastructure for cloud customers (OVH, France)',
      'Regular dependency and container image updates',
      'Self-host tarballs or container images, deterministic, auditable',
      'Standard logs to stdout for integration with your observability stack',
      'Backups: standard pg_dump, encrypt it with your own pipeline',
    ],
  },
  disclosure: {
    title: 'Responsible disclosure',
    body:
      'If you find a security issue, we want to know. Email us first, give us a reasonable window to fix, and we\'ll credit you in the advisory unless you prefer to stay anonymous.',
    emailLabel: 'security@kanap.net',
    email: 'security@kanap.net',
  },
  cta: {
    title: 'Questions about security?',
    body: 'We\'re happy to share architecture details, walk through a threat model, or connect your security team with ours.',
    primary: 'Talk to us',
    secondary: 'Self-host and audit the code',
  },
};

export default content;
