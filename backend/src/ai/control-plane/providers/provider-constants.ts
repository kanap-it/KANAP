export const LEGACY_GLPI_TICKETING_PROVIDER_KEY = 'glpi';
export const GLPI_TICKETING_IMPLEMENTATION = 'glpi';

export const PRTG_MONITORING_PROVIDER_KEY = 'prtg';
export const PRTG_MONITORING_IMPLEMENTATION = 'prtg';

// Canonical normalized open-ticket status vocabulary. Single source of truth
// for the targeting matcher, ingestion fallback, and provider default scopes —
// adapters translate these keys to their native status codes.
export const OPEN_TICKET_STATUS_VALUES = ['new', 'processing_assigned', 'processing_planned', 'pending', 'open'];

// Canonical normalized monitoring vocabularies. Single source of truth for the
// alert targeting matcher, ingestion scopes, and reference enums — adapters
// translate their native status/priority codes to these keys and raw provider
// codes never leave the adapter layer. Declared `as const` so the type unions
// in provider.types.ts derive from these exact values and cannot drift.
export const MONITORING_ALERT_STATUS_VALUES = ['down', 'down_partial', 'warning', 'unusual', 'paused', 'up', 'unknown'] as const;
// Ordered lowest to highest so severity-floor comparisons can use the index.
export const MONITORING_SEVERITY_VALUES = ['very_low', 'low', 'medium', 'high', 'critical'] as const;
export const MONITORING_ACK_STATES = ['unacknowledged', 'acknowledged'] as const;
