/**
 * Frontend mirror of backend ENTITY_URL_BUILDERS (ai-chat-orchestrator.service.ts).
 * Shared knowledge of which entity types are clickable to a workspace page.
 *
 * Keep in sync with both:
 * - backend/src/ai/ai-chat-orchestrator.service.ts (linkifyPreviewSummary)
 * - frontend/src/App.tsx route declarations
 *
 * Sub-entities of master-data without a workspace page (accounts, chart_of_accounts,
 * analytics_categories, spend_items) are intentionally absent — better return null
 * than render a dead link in the @-mention picker.
 */
const ENTITY_URL_BUILDERS: Record<string, (id: string) => string> = {
  documents: (id) => `/knowledge/${id}`,
  tasks: (id) => `/portfolio/tasks/${id}`,
  projects: (id) => `/portfolio/projects/${id}`,
  requests: (id) => `/portfolio/requests/${id}`,
  applications: (id) => `/it/applications/${id}`,
  assets: (id) => `/it/assets/${id}`,
  connections: (id) => `/it/connections/${id}`,
  interfaces: (id) => `/it/interfaces/${id}`,
  locations: (id) => `/it/locations/${id}`,
  contracts: (id) => `/ops/contracts/${id}`,
  capex_items: (id) => `/ops/capex/${id}`,
  companies: (id) => `/master-data/companies/${id}`,
  contacts: (id) => `/master-data/contacts/${id}`,
  departments: (id) => `/master-data/departments/${id}`,
  suppliers: (id) => `/master-data/suppliers/${id}`,
  business_processes: (id) => `/master-data/business-processes/${id}`,
};

export function buildEntityUrl(entityType: string, id: string): string | null {
  const builder = ENTITY_URL_BUILDERS[entityType];
  return builder ? builder(id) : null;
}

export function isLinkableEntityType(entityType: string): boolean {
  return entityType in ENTITY_URL_BUILDERS;
}
