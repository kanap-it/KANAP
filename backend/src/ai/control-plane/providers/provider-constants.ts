export const LEGACY_GLPI_TICKETING_PROVIDER_KEY = 'glpi';
export const GLPI_TICKETING_IMPLEMENTATION = 'glpi';

// Canonical normalized open-ticket status vocabulary. Single source of truth
// for the targeting matcher, ingestion fallback, and provider default scopes —
// adapters translate these keys to their native status codes.
export const OPEN_TICKET_STATUS_VALUES = ['new', 'processing_assigned', 'processing_planned', 'pending', 'open'];
